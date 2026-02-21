/**
 * Visit Sweden API client — geo-filtered recommendations
 * Docs: https://docs.visitsweden.com/en/api/
 * Base: https://data.visitsweden.com/store/
 *
 * The API doesn't support geo-queries, so we fetch broadly
 * and filter client-side by walking distance (~1.2km = 15 min).
 */

const BASE = "https://data.visitsweden.com/store";

const TYPES = {
  place: "http://schema.org/Place",
  food: "http://schema.org/FoodEstablishment",
  lodging: "http://schema.org/LodgingBusiness",
  event: "http://schema.org/Event",
  store: "http://schema.org/Store",
};

const CATEGORY_MAP = {
  Restaurant: { type: "food", icon: "\u{1F37D}\uFE0F", label: "Restaurant" },
  CafeOrCoffeeShop: { type: "food", icon: "\u2615", label: "Cafe" },
  BarOrPub: { type: "food", icon: "\u{1F37A}", label: "Bar" },
  FastFoodRestaurant: { type: "food", icon: "\u{1F354}", label: "Fast Food" },
  FoodEstablishment: { type: "food", icon: "\u{1F37D}\uFE0F", label: "Dining" },
  Museum: { type: "culture", icon: "\u{1F3DB}\uFE0F", label: "Museum" },
  Park: { type: "nature", icon: "\u{1F33F}", label: "Park" },
  NaturalFeature: { type: "nature", icon: "\u{1F3D4}\uFE0F", label: "Nature" },
  TouristAttraction: { type: "activity", icon: "\u{1F4F8}", label: "Attraction" },
  LandmarksOrHistoricalBuildings: { type: "culture", icon: "\u{1F3F0}", label: "Landmark" },
  CivicStructure: { type: "culture", icon: "\u{1F3DB}\uFE0F", label: "Civic" },
  ExerciseAction: { type: "activity", icon: "\u{1F3C3}", label: "Activity" },
  SportsActivityLocation: { type: "activity", icon: "\u26BD", label: "Sports" },
  Store: { type: "shopping", icon: "\u{1F6CD}\uFE0F", label: "Shopping" },
  LodgingBusiness: { type: "lodging", icon: "\u{1F3E8}", label: "Accommodation" },
  Campground: { type: "nature", icon: "\u26FA", label: "Camping" },
};

function escapeUri(uri) {
  return uri.replace(/:/g, "\\:");
}

/** Haversine distance in meters */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Estimate walking time in minutes (avg 80m/min ~ 5km/h) */
function walkingMinutes(meters) {
  return Math.round(meters / 80);
}

function extractFromGraph(graph) {
  const main =
    graph.find(
      (n) =>
        n["@type"] &&
        (n["@type"].includes("schema:") ||
          String(n["@type"]).startsWith("schema:"))
    ) || graph[0];

  const geo = graph.find((n) => n["@type"] === "schema:GeoCoordinates");

  const name = main["schema:name"];
  const nameStr =
    typeof name === "string"
      ? name
      : Array.isArray(name)
        ? (name.find((n) => n["@language"] === "en") || name[0])?.["@value"] || ""
        : name?.["@value"] || "";

  const desc = main["schema:description"];
  let descStr = "";
  if (typeof desc === "string") {
    descStr = desc;
  } else if (Array.isArray(desc)) {
    const en = desc.find((d) => d["@language"] === "en");
    descStr = en?.["@value"] || desc[0]?.["@value"] || "";
  } else if (desc) {
    descStr = desc["@value"] || "";
  }

  const image = main["schema:image"];
  const imageUrl = image?.["@id"] || (typeof image === "string" ? image : null);

  const lat = parseFloat(geo?.["schema:latitude"] || main["schema:latitude"] || 0);
  const lon = parseFloat(geo?.["schema:longitude"] || main["schema:longitude"] || 0);

  const additionalType = main["schema:additionalType"];
  const categoryRaw = additionalType?.["@id"] || (typeof additionalType === "string" ? additionalType : "");
  const categoryKey = categoryRaw.replace("schema:", "").replace("http://schema.org/", "");

  const typeRaw = Array.isArray(main["@type"]) ? main["@type"][0] : main["@type"] || "";
  const typeKey = typeRaw.replace("schema:", "").replace("http://schema.org/", "");

  const matched = CATEGORY_MAP[categoryKey] || CATEGORY_MAP[typeKey] || {
    type: "activity",
    icon: "\u{1F4CD}",
    label: categoryKey || typeKey || "Place",
  };

  const url = main["schema:url"]?.["@id"] || main["schema:url"] || null;

  const region = main["dcterms:spatial"];
  const regionStr = typeof region === "string" ? region : region?.["@value"] || "";

  return {
    name: nameStr,
    description: descStr.slice(0, 300) + (descStr.length > 300 ? "\u2026" : ""),
    fullDescription: descStr,
    image: imageUrl,
    lat,
    lon,
    category: matched,
    categoryKey: categoryKey || typeKey,
    url,
    region: regionStr,
  };
}

/**
 * Search Visit Sweden for places near a charging station
 * @param {object} options
 * @param {number} options.lat - Station latitude
 * @param {number} options.lon - Station longitude
 * @param {number} [options.maxWalkMin] - Max walking minutes (default 15)
 * @param {string} [options.type] - "place" | "food" | "lodging" | "event" | "store" | "all"
 * @returns {Promise<Array>} Results sorted by distance, with walkMin and distanceM
 */
/**
 * Fetch one type from Visit Sweden, filter by distance
 */
async function fetchType(typeUri, lat, lon, maxDistM) {
  const query = `public:true+AND+rdfType:${escapeUri(typeUri)}`;
  const url = `${BASE}/search?type=solr&query=${query}&limit=100&rdfFormat=application/ld%2Bjson`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  const children = data?.resource?.children || [];

  return children
    .map((entry) => {
      try {
        const graph = entry?.metadata?.["@graph"];
        if (!graph || !Array.isArray(graph)) return null;
        const parsed = extractFromGraph(graph);
        if (!parsed.name || (!parsed.lat && !parsed.lon)) return null;

        const dist = distanceMeters(lat, lon, parsed.lat, parsed.lon);
        if (dist > maxDistM) return null;

        return {
          ...parsed,
          distanceM: Math.round(dist),
          walkMin: walkingMinutes(dist),
          entryId: entry.entryId,
          contextId: entry.contextId,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export async function searchNearStation({ lat, lon, maxWalkMin = 15, type = "all" } = {}) {
  const maxDistM = maxWalkMin * 80;

  if (type !== "all") {
    const uri = TYPES[type];
    if (!uri) throw new Error(`Unknown type: ${type}`);
    const results = await fetchType(uri, lat, lon, maxDistM);
    return results.sort((a, b) => a.distanceM - b.distanceM);
  }

  // For "all": fetch every type in parallel, combine, dedupe by name+lat
  const allResults = await Promise.all(
    Object.values(TYPES).map((uri) => fetchType(uri, lat, lon, maxDistM))
  );

  const seen = new Set();
  const combined = allResults.flat().filter((item) => {
    const key = `${item.name}|${item.lat}|${item.lon}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return combined.sort((a, b) => a.distanceM - b.distanceM);
}

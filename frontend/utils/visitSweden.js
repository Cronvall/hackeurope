/**
 * Visit Sweden API client
 * Docs: https://docs.visitsweden.com/en/api/
 * Base: https://data.visitsweden.com/store/
 */

const BASE = "https://data.visitsweden.com/store";

const TYPES = {
  place: "http://schema.org/Place",
  food: "http://schema.org/FoodEstablishment",
  lodging: "http://schema.org/LodgingBusiness",
  event: "http://schema.org/Event",
  store: "http://schema.org/Store",
};

// Map Visit Sweden categories to our experience types
const CATEGORY_MAP = {
  Restaurant: { type: "food", icon: "🍽️", label: "Restaurant" },
  CafeOrCoffeeShop: { type: "food", icon: "☕", label: "Cafe" },
  BarOrPub: { type: "food", icon: "🍺", label: "Bar" },
  FastFoodRestaurant: { type: "food", icon: "🍔", label: "Fast Food" },
  FoodEstablishment: { type: "food", icon: "🍽️", label: "Dining" },
  Museum: { type: "culture", icon: "🏛️", label: "Museum" },
  Park: { type: "nature", icon: "🌿", label: "Park" },
  NaturalFeature: { type: "nature", icon: "🏔️", label: "Nature" },
  TouristAttraction: { type: "activity", icon: "📸", label: "Attraction" },
  LandmarksOrHistoricalBuildings: { type: "culture", icon: "🏰", label: "Landmark" },
  CivicStructure: { type: "culture", icon: "🏛️", label: "Civic" },
  ExerciseAction: { type: "activity", icon: "🏃", label: "Activity" },
  SportsActivityLocation: { type: "activity", icon: "⚽", label: "Sports" },
  Store: { type: "shopping", icon: "🛍️", label: "Shopping" },
  LodgingBusiness: { type: "lodging", icon: "🏨", label: "Accommodation" },
  Campground: { type: "nature", icon: "⛺", label: "Camping" },
};

function escapeUri(uri) {
  return uri.replace(/:/g, "\\:");
}

function extractFromGraph(graph) {
  const main = graph.find(
    (n) =>
      n["@type"] &&
      (n["@type"].includes("schema:") || String(n["@type"]).startsWith("schema:"))
  ) || graph[0];

  const geo = graph.find(
    (n) => n["@type"] === "schema:GeoCoordinates"
  );

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

  const photos = main["schema:photo"];
  const photoUrls = Array.isArray(photos)
    ? photos.map((p) => p["@id"] || p).filter(Boolean).slice(0, 3)
    : [];

  const lat = parseFloat(
    geo?.["schema:latitude"] || main["schema:latitude"] || 0
  );
  const lon = parseFloat(
    geo?.["schema:longitude"] || main["schema:longitude"] || 0
  );

  const additionalType = main["schema:additionalType"];
  const categoryRaw = additionalType?.["@id"] || (typeof additionalType === "string" ? additionalType : "");
  const categoryKey = categoryRaw.replace("schema:", "").replace("http://schema.org/", "");

  const typeRaw = Array.isArray(main["@type"]) ? main["@type"][0] : main["@type"] || "";
  const typeKey = typeRaw.replace("schema:", "").replace("http://schema.org/", "");

  const matched = CATEGORY_MAP[categoryKey] || CATEGORY_MAP[typeKey] || {
    type: "activity",
    icon: "📍",
    label: categoryKey || typeKey || "Place",
  };

  const url = main["schema:url"]?.["@id"] || main["schema:url"] || null;

  const region = main["dcterms:spatial"];
  const regionStr =
    typeof region === "string"
      ? region
      : region?.["@value"] || "";

  return {
    name: nameStr,
    description: descStr.slice(0, 300) + (descStr.length > 300 ? "…" : ""),
    fullDescription: descStr,
    image: imageUrl,
    photos: imageUrl ? [imageUrl, ...photoUrls] : photoUrls,
    lat,
    lon,
    category: matched,
    categoryKey: categoryKey || typeKey,
    url,
    region: regionStr,
  };
}

/**
 * Search Visit Sweden for places/experiences
 * @param {object} options
 * @param {string} [options.type] - "place" | "food" | "lodging" | "event" | "store" | "all"
 * @param {number} [options.limit] - Max results (max 100)
 * @param {number} [options.offset] - Pagination offset
 * @returns {Promise<{results: Array, total: number}>}
 */
export async function searchVisitSweden({ type = "all", limit = 20, offset = 0 } = {}) {
  let typeQuery;
  if (type === "all") {
    const uris = Object.values(TYPES).map((u) => `rdfType:${escapeUri(u)}`);
    typeQuery = `(${uris.join("+OR+")})`;
  } else {
    const uri = TYPES[type];
    if (!uri) throw new Error(`Unknown type: ${type}`);
    typeQuery = `rdfType:${escapeUri(uri)}`;
  }

  const query = `public:true+AND+${typeQuery}`;
  const url = `${BASE}/search?type=solr&query=${query}&limit=${limit}&offset=${offset}&rdfFormat=application/ld%2Bjson`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Visit Sweden API error: ${resp.status}`);
  const data = await resp.json();

  const results = (data.results || [])
    .map((entry) => {
      try {
        const graph = entry?.metadata?.["@graph"];
        if (!graph || !Array.isArray(graph)) return null;
        const parsed = extractFromGraph(graph);
        if (!parsed.name || (!parsed.lat && !parsed.lon)) return null;
        return {
          ...parsed,
          entryId: entry.entryId,
          contextId: entry.contextId,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return { results, total: data.results?.length || 0 };
}

/**
 * Swedish regions along the E4 corridor (for filtering)
 */
export const REGIONS = [
  "Stockholm",
  "Södermanland",
  "Östergötland",
  "Jönköping",
  "Småland",
  "Halland",
  "Västra Götaland",
  "Skåne",
  "Gävleborg",
  "Värmland",
];

export const VS_CATEGORIES = CATEGORY_MAP;

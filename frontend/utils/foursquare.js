/**
 * Foursquare Places API client — geo-search near charging stations
 * Docs: https://docs.foursquare.com/reference/place-search
 *
 * Native radius search — far denser data than Visit Sweden.
 * Walking estimate: straight-line × 1.4 detour factor, 80m/min.
 */

const BASE = "https://api.foursquare.com/v3/places/search";
const API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;

// Foursquare category IDs (v3)
// Full taxonomy: https://docs.foursquare.com/data-products/docs/categories
const CATEGORY_IDS = {
  food: "13000",        // Dining and Drinking
  place: "16000",       // Landmarks and Outdoors
  lodging: "19014",     // Lodging
  event: "14000",       // Arts and Entertainment (closest to events)
  store: "17000",       // Retail
};

const CATEGORY_DISPLAY = {
  food: { icon: "\u{1F37D}\uFE0F", label: "Dining", type: "food" },
  place: { icon: "\u{1F4CD}", label: "Place", type: "place" },
  lodging: { icon: "\u{1F3E8}", label: "Stay", type: "lodging" },
  event: { icon: "\u{1F3AD}", label: "Entertainment", type: "event" },
  store: { icon: "\u{1F6CD}\uFE0F", label: "Shopping", type: "store" },
};

// Map Foursquare top-level category IDs to our display types
function categorize(categories) {
  if (!categories || categories.length === 0) {
    return { icon: "\u{1F4CD}", label: "Place", type: "place" };
  }
  const cat = categories[0];
  const id = String(cat.id);

  if (id.startsWith("13")) return { icon: "\u{1F37D}\uFE0F", label: cat.name || "Dining", type: "food" };
  if (id.startsWith("14")) return { icon: "\u{1F3AD}", label: cat.name || "Entertainment", type: "event" };
  if (id.startsWith("16")) return { icon: "\u{1F33F}", label: cat.name || "Place", type: "place" };
  if (id.startsWith("17")) return { icon: "\u{1F6CD}\uFE0F", label: cat.name || "Shopping", type: "store" };
  if (id.startsWith("19")) return { icon: "\u{1F3E8}", label: cat.name || "Stay", type: "lodging" };

  return { icon: "\u{1F4CD}", label: cat.name || "Place", type: "place" };
}

/** Estimate real walking distance & time from API distance (meters). */
const DETOUR_FACTOR = 1.4;
function walkingEstimate(distanceMeters) {
  const realMeters = Math.round(distanceMeters * DETOUR_FACTOR);
  const minutes = Math.round(realMeters / 80);
  return { realMeters, minutes };
}

/** Build photo URL from Foursquare photo prefix/suffix */
function photoUrl(photo, size = "300x200") {
  if (!photo) return null;
  return `${photo.prefix}${size}${photo.suffix}`;
}

/**
 * Search Foursquare for places near a charging station
 * @param {object} options
 * @param {number} options.lat - Station latitude
 * @param {number} options.lon - Station longitude
 * @param {number} [options.maxWalkMin] - Max walking minutes (default 15)
 * @param {string} [options.type] - "place" | "food" | "lodging" | "event" | "store" | "all"
 * @returns {Promise<Array>} Results sorted by distance, with walkMin and distanceM
 */
export async function searchNearStation({ lat, lon, maxWalkMin = 15, type = "all" } = {}) {
  if (!API_KEY) {
    throw new Error("Foursquare API key not configured. Add VITE_FOURSQUARE_API_KEY to .env");
  }

  // Convert max walk time to radius in meters (reverse the detour factor)
  // maxWalkMin * 80m/min = real distance, / 1.4 = straight-line ≈ API distance
  const radiusMeters = Math.round((maxWalkMin * 80) / DETOUR_FACTOR);

  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: String(radiusMeters),
    sort: "DISTANCE",
    limit: "50",
    fields: "fsq_id,name,location,geocodes,categories,photos,rating,hours,distance,website,tel,description",
  });

  // Add category filter for specific types
  if (type !== "all" && CATEGORY_IDS[type]) {
    params.set("categories", CATEGORY_IDS[type]);
  }

  const url = `${BASE}?${params}`;
  const resp = await fetch(url, {
    headers: { Authorization: API_KEY, Accept: "application/json" },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Foursquare API error (${resp.status}): ${text}`);
  }

  const data = await resp.json();
  const results = data.results || [];

  return results
    .map((place) => {
      const walk = walkingEstimate(place.distance || 0);
      if (walk.minutes > maxWalkMin) return null;

      const photo = place.photos && place.photos.length > 0 ? place.photos[0] : null;
      const category = categorize(place.categories);
      const geo = place.geocodes?.main;

      return {
        name: place.name,
        description: place.categories?.map((c) => c.name).join(" · ") || "",
        fullDescription: place.description || place.categories?.map((c) => c.name).join(" · ") || "",
        image: photoUrl(photo),
        lat: geo?.latitude || lat,
        lon: geo?.longitude || lon,
        category,
        categoryKey: place.categories?.[0]?.name || "",
        url: place.website || null,
        region: place.location?.locality || place.location?.region || "",
        entryId: place.fsq_id,
        contextId: place.fsq_id,
        // Distances
        distanceM: walk.realMeters,
        walkMin: walk.minutes,
        // Foursquare extras
        rating: place.rating || null,
        openNow: place.hours?.open_now ?? null,
        address: place.location?.formatted_address || place.location?.address || "",
        phone: place.tel || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * Foursquare Places API client — geo-search near charging stations
 * Uses the new places-api.foursquare.com endpoint (migrated June 2025)
 * Docs: https://docs.foursquare.com/developer/reference/places-api-overview
 *
 * Native radius search — far denser data than Visit Sweden.
 * Walking estimate: straight-line × 1.4 detour factor, 80m/min.
 */

// In dev, Vite proxies /api/foursquare → places-api.foursquare.com (avoids CORS)
// In production, use the direct URL (server-side or CORS-enabled deployment)
const BASE = import.meta.env.DEV
  ? "/api/foursquare/places/search"
  : "https://places-api.foursquare.com/places/search";
const API_KEY = import.meta.env.VITE_FOURSQUARE_API_KEY;
const API_VERSION = "2025-06-17";

// Foursquare category IDs
const CATEGORY_IDS = {
  food: "13000",        // Dining and Drinking
  place: "16000",       // Landmarks and Outdoors
  lodging: "19014",     // Lodging
  event: "14000",       // Arts and Entertainment
  store: "17000",       // Retail
};

// Map Foursquare top-level category IDs to our display types
function categorize(categories) {
  if (!categories || categories.length === 0) {
    return { icon: "\u{1F4CD}", label: "Place", type: "place" };
  }
  const cat = categories[0];
  const id = String(cat.fsq_category_id || "");

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
  const radiusMeters = Math.round((maxWalkMin * 80) / DETOUR_FACTOR);

  const params = new URLSearchParams({
    ll: `${lat},${lon}`,
    radius: String(radiusMeters),
    sort: "DISTANCE",
    limit: "50",
  });

  // Add category filter for specific types
  if (type !== "all" && CATEGORY_IDS[type]) {
    params.set("categories", CATEGORY_IDS[type]);
  }

  const url = `${BASE}?${params}`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
      "X-Places-Api-Version": API_VERSION,
    },
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

      return {
        name: place.name,
        description: place.categories?.map((c) => c.name).join(" \u00B7 ") || "",
        fullDescription: place.description || place.categories?.map((c) => c.name).join(" \u00B7 ") || "",
        image: photoUrl(photo),
        lat: place.latitude || lat,
        lon: place.longitude || lon,
        category,
        categoryKey: place.categories?.[0]?.name || "",
        url: place.website || null,
        region: place.location?.locality || place.location?.region || "",
        entryId: place.fsq_place_id,
        contextId: place.fsq_place_id,
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

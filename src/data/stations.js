// Merged station data from v1 (E4 corridor) and v2 (charging network)
// v1 stations are used by the AI trip planner; v2 stations by the route/experience system

// ─── V1: E4 CORRIDOR STATIONS (Stockholm → Gothenburg AI planner) ───
export const AI_STATIONS = [
  {
    id: "s1", name: "Ionity Södertälje", location: "Södertälje", lat: 59.18, lng: 17.63,
    km_from_start: 35, chargers: { ccs: 6, chademo: 2 }, max_kw: 350,
    amenities: ["café", "restrooms", "wifi"], rating: 4.2,
    community_tips: [
      { text: "Bay 3 is the fastest — consistently hits 280kW on our Model Y", traveler: "Solo", author: "Erik L.", votes: 12, date: "2026-02-10" },
      { text: "The attached Shell station has good coffee and clean toilets", traveler: "Family", author: "Anna K.", votes: 8, date: "2026-02-05" },
    ],
    congestion: { weekday: "low", weekend: "medium", holiday: "high" },
    ai_summary: null,
  },
  {
    id: "s2", name: "Tesla Supercharger Nyköping", location: "Nyköping", lat: 58.75, lng: 17.01,
    km_from_start: 115, chargers: { tesla: 12 }, max_kw: 250,
    amenities: ["restaurant", "playground", "restrooms", "dog_area"],
    rating: 4.5,
    community_tips: [
      { text: "Kids loved the playground next to McDonald's — perfect 25min charge + meal combo", traveler: "Family", author: "Lisa M.", votes: 24, date: "2026-02-14" },
      { text: "Fenced dog area behind the parking lot, 2 min walk from chargers", traveler: "Dog owner", author: "Marcus J.", votes: 15, date: "2026-01-28" },
      { text: "Gets PACKED on Fridays 14-18. Midsommar weekend was 45min queue last year", traveler: "Solo", author: "Johan S.", votes: 31, date: "2026-01-15" },
    ],
    congestion: { weekday: "low", weekend: "high", holiday: "extreme" },
    ai_summary: null,
  },
  {
    id: "s3", name: "Recharge Norrköping", location: "Norrköping", lat: 58.59, lng: 16.19,
    km_from_start: 165, chargers: { ccs: 4 }, max_kw: 150,
    amenities: ["café", "restrooms"], rating: 3.8,
    community_tips: [
      { text: "Charger #2 often throws errors. Stick with 1, 3, or 4", traveler: "Solo", author: "David R.", votes: 19, date: "2026-02-12" },
      { text: "The café (Brödernas) has amazing kanelbullar and oat lattes", traveler: "Couple", author: "Sofia E.", votes: 11, date: "2026-02-01" },
    ],
    congestion: { weekday: "low", weekend: "low", holiday: "medium" },
    ai_summary: null,
  },
  {
    id: "s4", name: "Ionity Linköping", location: "Linköping", lat: 58.41, lng: 15.62,
    km_from_start: 200, chargers: { ccs: 8, chademo: 2 }, max_kw: 350,
    amenities: ["shopping_center", "restaurants", "restrooms", "playground", "dog_area"],
    rating: 4.6,
    community_tips: [
      { text: "Tornby shopping center right there — perfect for a longer break. H&M, Clas Ohlson, food court", traveler: "Family", author: "Petra N.", votes: 28, date: "2026-02-08" },
      { text: "All 8 bays working reliably. Never waited more than 5 min even on weekends", traveler: "Business", author: "Henrik A.", votes: 16, date: "2026-02-11" },
      { text: "Dog-friendly outdoor seating at the burger place in the food court area", traveler: "Dog owner", author: "Karin B.", votes: 9, date: "2026-01-20" },
    ],
    congestion: { weekday: "low", weekend: "medium", holiday: "medium" },
    ai_summary: null,
  },
  {
    id: "s5", name: "Tesla Supercharger Jönköping", location: "Jönköping", lat: 57.78, lng: 14.16,
    km_from_start: 320, chargers: { tesla: 16 }, max_kw: 250,
    amenities: ["hotel", "restaurants", "lake_view", "restrooms", "playground"],
    rating: 4.4,
    community_tips: [
      { text: "Lake Vättern view from the chargers — the most scenic charging stop on the E4", traveler: "Couple", author: "Mikael P.", votes: 35, date: "2026-02-15" },
      { text: "A2 Hotel next door is great for overnight if splitting the trip. EV charging included in room rate", traveler: "Business", author: "Emma W.", votes: 22, date: "2026-01-30" },
      { text: "Holiday weekends: arrive before 10am or after 8pm. Midday is chaos", traveler: "Family", author: "Oscar T.", votes: 29, date: "2026-02-03" },
    ],
    congestion: { weekday: "low", weekend: "high", holiday: "extreme" },
    ai_summary: null,
  },
  {
    id: "s6", name: "Recharge Mullsjö", location: "Mullsjö", lat: 57.91, lng: 13.88,
    km_from_start: 340, chargers: { ccs: 4 }, max_kw: 150,
    amenities: ["café", "restrooms", "nature_trail"], rating: 4.0,
    community_tips: [
      { text: "Hidden gem! Almost never busy because everyone goes to Jönköping. The nature trail is lovely for stretching legs", traveler: "Dog owner", author: "Lena G.", votes: 18, date: "2026-02-06" },
      { text: "Perfect Jönköping alternative on holidays. 20km detour but zero queue", traveler: "Solo", author: "Anders F.", votes: 14, date: "2026-01-25" },
    ],
    congestion: { weekday: "low", weekend: "low", holiday: "low" },
    ai_summary: null,
  },
  {
    id: "s7", name: "Ionity Borås", location: "Borås", lat: 57.72, lng: 12.94,
    km_from_start: 410, chargers: { ccs: 6 }, max_kw: 350,
    amenities: ["restrooms", "café", "wifi"], rating: 4.1,
    community_tips: [
      { text: "Good last-stop option before Gothenburg if you need a top-up. Reliable 350kW chargers", traveler: "Business", author: "Fredrik L.", votes: 10, date: "2026-02-09" },
      { text: "The café closes at 17:00 — plan accordingly for late trips", traveler: "Solo", author: "Sara H.", votes: 7, date: "2026-01-18" },
    ],
    congestion: { weekday: "low", weekend: "low", holiday: "medium" },
    ai_summary: null,
  },
];

// ─── V2: CHARGING STATIONS (experience platform) ───
export const CHARGING_STATIONS = {
  "cs-linkoping": { id: "cs-linkoping", name: "Linköping Travel Centre", city: "Linköping", lat: 58.4102, lng: 15.6248, power: "150 kW DC", connectors: ["CCS2", "CHAdeMO"], network: "IONITY", pricePerKwh: 0.79, numPoints: 6, available: 4, congestion: "low", amenities: ["Restroom", "Waiting area", "Café 200m"] },
  "cs-jonkoping": { id: "cs-jonkoping", name: "Jönköping Elmia", city: "Jönköping", lat: 57.7806, lng: 14.1618, power: "150 kW DC", connectors: ["CCS2", "CHAdeMO", "Type 2"], network: "Recharge", pricePerKwh: 0.72, numPoints: 8, available: 6, congestion: "low", amenities: ["Restaurant", "Shop", "Restroom"] },
  "cs-gavle": { id: "cs-gavle", name: "Gävle Travel Centre", city: "Gävle", lat: 60.6742, lng: 17.1443, power: "150 kW DC", connectors: ["CCS2", "CHAdeMO"], network: "IONITY", pricePerKwh: 0.79, numPoints: 4, available: 3, congestion: "low", amenities: ["Restroom", "Waiting area"] },
  "cs-malmo": { id: "cs-malmo", name: "Malmö Central Station", city: "Malmö", lat: 55.6100, lng: 12.9985, power: "150 kW DC", connectors: ["CCS2", "CHAdeMO", "Type 2"], network: "Mer", pricePerKwh: 0.68, numPoints: 10, available: 7, congestion: "medium", amenities: ["Restaurant", "Shop", "Restroom", "Waiting area"] },
};

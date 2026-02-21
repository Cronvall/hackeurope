export const EXPERIENCE_TYPES = [
  { id: "food", label: "Food & Drink", icon: "🍽️", color: "#c06010" },
  { id: "market", label: "Market", icon: "🥕", color: "#1e5c2e" },
  { id: "nature", label: "Nature", icon: "🌳", color: "#0f766e" },
  { id: "attraction", label: "Attraction", icon: "🏛️", color: "#1a4a8c" },
  { id: "activity", label: "Activity", icon: "🎯", color: "#6b21a8" },
  { id: "shopping", label: "Shopping", icon: "🛍️", color: "#c02828" },
  { id: "event", label: "Event", icon: "🎪", color: "#e8a020" },
];

export const SOURCE_META = {
  "bondensegen.com": { bg: "#e8f4eb", text: "#1e5c2e", border: "#b8d8be", dot: "#1e5c2e", label: "Bondens Marknad" },
  "visitsweden.com": { bg: "#e8f0fc", text: "#1a4a8c", border: "#b8ccf0", dot: "#1a4a8c", label: "Visit Sweden" },
  "foursquare.com": { bg: "#fdf0e8", text: "#c06010", border: "#f0c898", dot: "#c06010", label: "Foursquare" },
  "community": { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe", dot: "#6b21a8", label: "Community" },
};

export const DURATION_RANGES = [
  { label: "Quick stop", min: 0, max: 20, icon: "⚡", desc: "Under 20 min" },
  { label: "Short break", min: 20, max: 35, icon: "☕", desc: "20–35 min" },
  { label: "Full charge", min: 35, max: 60, icon: "🕐", desc: "35–60 min" },
];

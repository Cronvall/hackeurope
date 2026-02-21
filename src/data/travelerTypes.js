// ─── TRAVELER TYPES (v2 format — used across the app) ───
export const TRAVELER_TYPES = [
  { id: "families", label: "Families", icon: "👨‍👩‍👧", color: "#1a4a8c", bg: "#e8f0fc" },
  { id: "solo", label: "Solo", icon: "🧍", color: "#6b21a8", bg: "#f3e8ff" },
  { id: "couples", label: "Couples", icon: "❤️", color: "#c02828", bg: "#fdeaea" },
  { id: "dogs", label: "Dog owners", icon: "🐕", color: "#0f766e", bg: "#ccfbf1" },
  { id: "business", label: "Business", icon: "💼", color: "#374151", bg: "#f3f4f6" },
];

// ─── V1 TRAVELER MAPPING (used by AI chat for intent parsing) ───
export const AI_TRAVELER_MAP = {
  Family: { color: "#FF6B6B", emoji: "👨‍👩‍👧‍👦" },
  Solo: { color: "#4ECDC4", emoji: "🧑" },
  Couple: { color: "#FF85A2", emoji: "💑" },
  "Dog owner": { color: "#95D5B2", emoji: "🐕" },
  Business: { color: "#7B8CDE", emoji: "💼" },
};

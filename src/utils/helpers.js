export function generateId() {
  return "user-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function fitsCharge(exp, duration) {
  return exp.minDuration <= duration && exp.walkMin * 2 + 10 <= duration;
}

export function socColor(soc) {
  return soc >= 60 ? "#1e5c2e" : soc >= 30 ? "#e8a020" : "#c02828";
}

export function congestionLabel(level) {
  return level === "low" ? "Available" : level === "medium" ? "Moderate" : "Busy";
}

export function congestionColor(level) {
  return level === "low" ? "#1e5c2e" : level === "medium" ? "#e8a020" : "#c02828";
}

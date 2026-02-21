import { AI_STATIONS } from "../data/stations";
import { AI_EV_MODELS } from "../data/evModels";
import { AI_TRAVELER_MAP } from "../data/travelerTypes";
import { AGENT_PROMPTS } from "../data/agentPrompts";

export function generateAISummary(station) {
  const tips = station.community_tips;
  if (tips.length === 0) return "No community data yet.";

  const topTip = [...tips].sort((a, b) => b.votes - a.votes)[0];
  const travelerTypes = [...new Set(tips.map(t => t.traveler))];
  const avgVotes = Math.round(tips.reduce((s, t) => s + t.votes, 0) / tips.length);

  const congestionWarning = station.congestion.holiday === "extreme"
    ? `Holiday alert: This station gets extremely busy during peak travel days.`
    : station.congestion.holiday === "high"
    ? `Moderate holiday congestion expected.`
    : `Generally low congestion, even on holidays.`;

  const amenityHighlights = station.amenities.includes("playground")
    ? " Great for families with a playground nearby."
    : station.amenities.includes("dog_area")
    ? " Dog-friendly with a dedicated area."
    : station.amenities.includes("lake_view")
    ? " Scenic stop with views."
    : "";

  return `${congestionWarning}${amenityHighlights} Community favorite tip (${topTip.votes} upvotes): "${topTip.text}" — Active feedback from ${travelerTypes.join(", ")} travelers. ${tips.length} tips, avg ${avgVotes} upvotes.`;
}

export function planTrip(params) {
  const { ev, soc, travelerType, travelDay, priorities, departure } = params;
  const vehicle = AI_EV_MODELS.find(v => v.name === ev) || AI_EV_MODELS[0];
  const currentRange = (soc / 100) * vehicle.range_km;
  const totalDistance = 470;

  const compatible = AI_STATIONS.filter(s => {
    const chargerTypes = Object.keys(s.chargers);
    if (vehicle.connector === "tesla") return chargerTypes.includes("tesla") || chargerTypes.includes("ccs");
    return chargerTypes.includes("ccs");
  });

  const scored = compatible.map(s => {
    let score = 0;
    const congestionKey = travelDay === "holiday" ? "holiday" : travelDay === "weekend" ? "weekend" : "weekday";
    const congestionLevel = s.congestion[congestionKey];

    if (congestionLevel === "extreme") score -= 30;
    else if (congestionLevel === "high") score -= 15;
    else if (congestionLevel === "medium") score -= 5;
    else score += 10;

    score += s.rating * 5;

    const relevantTips = s.community_tips.filter(t => t.traveler === travelerType);
    score += relevantTips.length * 5;
    score += relevantTips.reduce((sum, t) => sum + t.votes, 0) * 0.5;

    if (travelerType === "Family" && (s.amenities.includes("playground") || s.amenities.includes("restaurants"))) score += 15;
    if (travelerType === "Dog owner" && s.amenities.includes("dog_area")) score += 20;
    if (travelerType === "Business" && (s.amenities.includes("wifi") || s.amenities.includes("hotel"))) score += 15;
    if (travelerType === "Couple" && (s.amenities.includes("café") || s.amenities.includes("lake_view"))) score += 15;

    if (priorities.includes("speed") && s.max_kw >= 250) score += 15;
    if (priorities.includes("amenities") && s.amenities.length >= 4) score += 15;
    if (priorities.includes("avoid_queues") && congestionLevel === "low") score += 25;

    return { ...s, score, congestionLevel };
  });

  const stops = [];
  let remainingRange = currentRange;
  let currentKm = 0;
  const sortedByDistance = scored.sort((a, b) => a.km_from_start - b.km_from_start);

  for (const station of sortedByDistance) {
    const distToStation = station.km_from_start - currentKm;
    if (remainingRange - distToStation < 60) {
      const reachable = scored
        .filter(s => s.km_from_start > currentKm && s.km_from_start - currentKm < remainingRange - 30)
        .sort((a, b) => b.score - a.score);
      if (reachable.length > 0) {
        stops.push(reachable[0]);
        currentKm = reachable[0].km_from_start;
        remainingRange = vehicle.range_km * 0.85;
      }
    }
  }

  if (stops.length === 0) {
    const midpoint = scored
      .filter(s => s.km_from_start > 150 && s.km_from_start < 350)
      .sort((a, b) => b.score - a.score);
    if (midpoint.length > 0) stops.push(midpoint[0]);
  }

  const arrivalEstimate = departure ? calculateArrival(departure, stops.length) : null;

  return { stops, vehicle, arrivalEstimate, totalDistance };
}

function calculateArrival(departure, numStops) {
  const drivingMinutes = 270;
  const chargingMinutes = numStops * 25;
  const totalMinutes = drivingMinutes + chargingMinutes;
  const [h, m] = departure.split(":").map(Number);
  const arrivalH = h + Math.floor((m + totalMinutes) / 60);
  const arrivalM = (m + totalMinutes) % 60;
  return `${String(arrivalH % 24).padStart(2, "0")}:${String(arrivalM).padStart(2, "0")}`;
}

export function getNextQuestionStatic(params) {
  if (!params.ev) return { content: AGENT_PROMPTS.greeting, chips: AI_EV_MODELS.slice(0, 6).map(ev => ev.name) };
  if (!params.soc) return { content: AGENT_PROMPTS.askSoc(params.ev), chips: ["100%", "90%", "80%", "70%", "50%"] };
  if (!params.travelerType) return {
    content: AGENT_PROMPTS.askTraveler,
    chips: Object.keys(AI_TRAVELER_MAP).map(t => ({ label: `${AI_TRAVELER_MAP[t].emoji} ${t}`, value: t })),
  };
  if (!params.travelDay) return {
    content: AGENT_PROMPTS.askDay,
    chips: [
      { label: "Holiday (Midsommar, etc)", value: "holiday" },
      { label: "Weekend", value: "weekend" },
      { label: "Weekday", value: "weekday" },
    ],
  };
  if (!params.priorities || params.priorities.length === 0) return {
    content: AGENT_PROMPTS.askPriorities,
    chips: [
      { label: "Fastest charging", value: "speed" },
      { label: "Avoid queues", value: "avoid_queues" },
      { label: "Best amenities", value: "amenities" },
    ],
  };
  if (!params.departure) return {
    content: AGENT_PROMPTS.askDeparture,
    chips: [
      { label: "07:00 — Early bird", value: "07:00" },
      { label: "09:00 — Morning", value: "09:00" },
      { label: "12:00 — Noon", value: "12:00" },
      { label: "15:00 — Afternoon", value: "15:00" },
    ],
  };
  return null;
}

export function parseUserIntent(message) {
  const lower = message.toLowerCase().trim();

  for (const ev of AI_EV_MODELS) {
    const nameParts = ev.name.toLowerCase().split(" ");
    if (nameParts.some(p => lower.includes(p)) || lower.includes(ev.name.toLowerCase())) {
      return { type: "ev_model", value: ev.name };
    }
  }

  const socMatch = lower.match(/(\d+)\s*%/);
  if (socMatch) return { type: "soc", value: parseInt(socMatch[1]) };
  if (lower.includes("full")) return { type: "soc", value: 100 };

  const travelerKeys = Object.keys(AI_TRAVELER_MAP);
  for (const type of travelerKeys) {
    if (lower.includes(type.toLowerCase())) return { type: "traveler", value: type };
  }
  if (lower.includes("kid") || lower.includes("children")) return { type: "traveler", value: "Family" };
  if (lower.includes("alone") || lower.includes("just me")) return { type: "traveler", value: "Solo" };
  if (lower.includes("partner") || lower.includes("girlfriend") || lower.includes("boyfriend")) return { type: "traveler", value: "Couple" };
  if (lower.includes("dog") || lower.includes("pet")) return { type: "traveler", value: "Dog owner" };
  if (lower.includes("work") || lower.includes("meeting") || lower.includes("business")) return { type: "traveler", value: "Business" };

  if (lower.includes("midsommar") || lower.includes("holiday") || lower.includes("christmas") || lower.includes("easter") || lower.includes("jul")) return { type: "day", value: "holiday" };
  if (lower.includes("weekend") || lower.includes("saturday") || lower.includes("sunday") || lower.includes("lördag") || lower.includes("söndag")) return { type: "day", value: "weekend" };
  if (lower.includes("weekday") || lower.includes("monday") || lower.includes("tuesday") || lower.includes("wednesday") || lower.includes("thursday") || lower.includes("friday")) return { type: "day", value: "weekday" };

  const timeMatch = lower.match(/(\d{1,2})[:\.](\d{2})/);
  if (timeMatch) return { type: "departure", value: `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` };
  if (lower.includes("morning") || lower.includes("early")) return { type: "departure", value: "07:00" };
  if (lower.includes("noon") || lower.includes("lunch")) return { type: "departure", value: "12:00" };
  if (lower.includes("afternoon")) return { type: "departure", value: "15:00" };
  if (lower.includes("evening")) return { type: "departure", value: "18:00" };

  const priorities = [];
  if (lower.includes("fast") || lower.includes("quick") || lower.includes("speed")) priorities.push("speed");
  if (lower.includes("queue") || lower.includes("wait") || lower.includes("busy") || lower.includes("avoid")) priorities.push("avoid_queues");
  if (lower.includes("amenity") || lower.includes("food") || lower.includes("play") || lower.includes("comfort")) priorities.push("amenities");
  if (priorities.length > 0) return { type: "priorities", value: priorities };

  return { type: "unknown", value: message };
}

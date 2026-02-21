// ─── AI PLANNER EV MODELS (v1 — richer data for trip planning) ───
export const AI_EV_MODELS = [
  { name: "Tesla Model 3 LR", battery_kwh: 75, range_km: 490, charge_speed: "250kW", connector: "tesla" },
  { name: "Tesla Model Y LR", battery_kwh: 75, range_km: 455, charge_speed: "250kW", connector: "tesla" },
  { name: "Volvo EX30", battery_kwh: 69, range_km: 460, charge_speed: "153kW", connector: "ccs" },
  { name: "Volvo EX40", battery_kwh: 82, range_km: 490, charge_speed: "200kW", connector: "ccs" },
  { name: "Kia EV6 LR", battery_kwh: 77, range_km: 475, charge_speed: "240kW", connector: "ccs" },
  { name: "VW ID.4 Pro", battery_kwh: 77, range_km: 415, charge_speed: "135kW", connector: "ccs" },
  { name: "BMW iX3", battery_kwh: 80, range_km: 410, charge_speed: "150kW", connector: "ccs" },
  { name: "Polestar 2 LR", battery_kwh: 82, range_km: 480, charge_speed: "205kW", connector: "ccs" },
  { name: "Hyundai Ioniq 5 LR", battery_kwh: 77, range_km: 470, charge_speed: "240kW", connector: "ccs" },
];

// ─── ROUTE PLANNER EV MODELS (v2 — used for route/experience pages) ───
export const ROUTE_EV_MODELS = [
  { id: "tesla-m3", name: "Tesla Model 3", range: 498 },
  { id: "volvo-xc40", name: "Volvo XC40 Recharge", range: 418 },
  { id: "polestar-2", name: "Polestar 2", range: 487 },
  { id: "vw-id4", name: "VW ID.4", range: 520 },
  { id: "ioniq6", name: "Hyundai IONIQ 6", range: 614 },
];

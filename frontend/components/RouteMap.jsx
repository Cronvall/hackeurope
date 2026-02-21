import { CHARGING_STATIONS } from "../data/stations";

export default function RouteMap({ route, activeStop, onStopClick }) {
  if (!route) return null;
  const W = 700, H = 110, M = 60;
  const totalPts = route.stops.length + 2;
  const step = (W - M * 2) / (totalPts - 1);

  const points = [
    { x: M, label: "Start", sub: route.label.split("\u2192")[0].trim(), type: "origin" },
    ...route.stops.map((s, i) => ({
      x: M + step * (i + 1),
      label: CHARGING_STATIONS[s.stationId]?.city || s.stationId,
      sub: `${s.chargeMin}min`, type: "charge", idx: i,
    })),
    { x: W - M, label: "Dest.", sub: route.label.split("\u2192")[1].trim(), type: "destination" },
  ];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, display: "block" }}>
        <line x1={M} y1={55} x2={W - M} y2={55} stroke="var(--border)" strokeWidth={2} />
        {points.map((p, i) => {
          const isActive = p.type === "charge" && activeStop === p.idx;
          const isCharge = p.type === "charge";
          return (
            <g key={i} onClick={() => isCharge && onStopClick(p.idx)} style={{ cursor: isCharge ? "pointer" : "default" }}>
              <circle cx={p.x} cy={55} r={isCharge ? 13 : 8} fill={isActive ? "var(--forest)" : isCharge ? "#fff" : "var(--forest)"} stroke={isCharge ? "var(--forest)" : "none"} strokeWidth={2} />
              {isCharge && <text x={p.x} y={59} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono',monospace" fill={isActive ? "#fff" : "var(--forest)"} fontWeight={700}>{"\u26A1"}</text>}
              <text x={p.x} y={isCharge ? 80 : 76} textAnchor="middle" fontSize={10} fontFamily="'Outfit',sans-serif" fontWeight={600} fill="var(--ink)">{p.label}</text>
              <text x={p.x} y={isCharge ? 91 : 88} textAnchor="middle" fontSize={9} fontFamily="'JetBrains Mono',monospace" fill={isCharge ? "var(--forest)" : "var(--ink-muted)"}>{p.sub}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

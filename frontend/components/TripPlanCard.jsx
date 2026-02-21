import Icons from "./Icons";
import { CongestionBadge } from "./SmallComponents";

export default function TripPlanCard({ plan, tripParams }) {
  if (!plan || !plan.stops || plan.stops.length === 0) return null;
  return (
    <div style={{
      background: "#fff", border: "2px solid var(--forest)",
      borderRadius: 16, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icons.Navigation size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ color: "var(--ink)", fontSize: 16, fontWeight: 700, margin: 0 }}>Your Optimized Route</h3>
          <p style={{ color: "var(--ink-muted)", fontSize: 12, margin: 0 }}>
            Stockholm {"\u2192"} Gothenburg {"\u00B7"} {plan.totalDistance}km {"\u00B7"} {plan.stops.length} charging stop{plan.stops.length > 1 ? "s" : ""}
            {plan.arrivalEstimate && ` \u00B7 ETA ${plan.arrivalEstimate}`}
          </p>
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--forest)", position: "absolute", left: 0 }} />
          <div>
            <span style={{ color: "var(--forest)", fontSize: 13, fontWeight: 600 }}>Stockholm</span>
            <span style={{ color: "var(--ink-muted)", fontSize: 12, marginLeft: 8 }}>
              {tripParams?.departure || "Departure"} {"\u00B7"} {tripParams?.soc || 90}% battery
            </span>
          </div>
        </div>

        {plan.stops.map((stop, i) => (
          <div key={stop.id} style={{ marginBottom: 20, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: -20, width: 2, background: "var(--border)", marginLeft: 5 }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--forest)", position: "absolute", left: 0 }} />
            <div style={{ paddingLeft: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>{stop.name}</span>
                <CongestionBadge level={stop.congestionLevel} />
              </div>
              <p style={{ color: "var(--ink-muted)", fontSize: 12, margin: "4px 0 0" }}>
                {stop.km_from_start}km {"\u00B7"} {stop.max_kw}kW {"\u00B7"} ~25 min charge
              </p>
              {stop.community_tips.length > 0 && (
                <p style={{ color: "var(--purple)", fontSize: 12, margin: "4px 0 0", fontStyle: "italic" }}>
                  {stop.community_tips.sort((a, b) => b.votes - a.votes)[0].text.slice(0, 80)}...
                </p>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--red)", position: "absolute", left: 0 }} />
          <div style={{ paddingLeft: 20 }}>
            <span style={{ color: "var(--red)", fontSize: 13, fontWeight: 600 }}>Gothenburg</span>
            <span style={{ color: "var(--ink-muted)", fontSize: 12, marginLeft: 8 }}>
              {plan.arrivalEstimate ? `ETA ${plan.arrivalEstimate}` : "~4.5-5h total"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

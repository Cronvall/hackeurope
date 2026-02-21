import { CHARGING_STATIONS } from "../data/stations";
import { congestionLabel, congestionColor } from "../utils/helpers";
import { SocBar, Tag } from "./SmallComponents";

export default function StopDetail({ stop, onClose }) {
  const station = CHARGING_STATIONS[stop.stationId];
  if (!station) return null;

  return (
    <div style={{ background: "#fff", border: "2px solid var(--forest)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)", animation: "slideUp 0.25s ease" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Charging Stop</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>{station.name}</h3>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)" }}>{station.power} {"\u00B7"} {station.network}</span>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: congestionColor(station.congestion), fontWeight: 600 }}>{congestionLabel(station.congestion)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, fontSize: 15, color: "var(--ink-muted)", cursor: "pointer" }}>x</button>
        </div>

        {/* SOC bars */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div><div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase" }}>Arrival</div><SocBar soc={stop.arrivalSoc} /></div>
          <div><div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase" }}>Departure</div><SocBar soc={stop.departSoc} /></div>
        </div>

        {/* Charge time */}
        <div style={{ background: "var(--forest)", borderRadius: 8, padding: "10px 14px", color: "#fff", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7 }}>CHARGE TIME</span>
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{stop.chargeMin} min</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "var(--electric)", borderRadius: 3 }} />
          </div>
        </div>

        {/* Station details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ background: "var(--cream)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 4, textTransform: "uppercase" }}>Connectors</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {station.connectors.map(c => (
                <span key={c} style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: "var(--forest)", background: "var(--forest-pale)", padding: "2px 6px", borderRadius: 4 }}>{c}</span>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--cream)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 4, textTransform: "uppercase" }}>Availability</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--forest)" }}>
              {station.available}/{station.numPoints} <span style={{ fontSize: 10, fontWeight: 400, color: "var(--ink-muted)" }}>points free</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div style={{ background: "var(--cream)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--border)", marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 4, textTransform: "uppercase" }}>Price</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink)" }}>
            {station.pricePerKwh} SEK/kWh
          </div>
        </div>

        {/* Amenities */}
        <div>
          <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 6, textTransform: "uppercase" }}>Amenities</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {station.amenities.map(a => <Tag key={a}>{a}</Tag>)}
          </div>
        </div>
      </div>
    </div>
  );
}

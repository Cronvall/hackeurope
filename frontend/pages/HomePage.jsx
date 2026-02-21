import { useState } from "react";
import { CHARGING_STATIONS } from "../data/stations";
import { ROUTE_EV_MODELS } from "../data/evModels";
import { ROUTES } from "../data/routes";
import { congestionLabel, congestionColor } from "../utils/helpers";
import { SocBar, Tag } from "../components/SmallComponents";
import RouteMap from "../components/RouteMap";
import StopDetail from "../components/StopDetail";

// ─── Main Home Page ──
export default function HomePage({ onSelectStation }) {
  const [route, setRoute] = useState("sthlm-gbg");
  const [ev, setEv] = useState("tesla-m3");
  const [chargeDuration, setChargeDuration] = useState(40);
  const [activeStop, setActiveStop] = useState(null);

  const currentRoute = ROUTES[route];
  const totalChargeMin = currentRoute.stops.reduce((s, x) => s + x.chargeMin, 0);
  const currentStopData = activeStop !== null ? currentRoute.stops[activeStop] : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px", paddingBottom: 80 }}>
      {/* Trip config */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid var(--border)", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>Trip Setup</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5 }}>ROUTE</label>
            <div style={{ position: "relative" }}>
              <select value={route} onChange={e => { setRoute(e.target.value); setActiveStop(null); }} style={{ width: "100%", padding: "9px 30px 9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", color: "var(--ink)" }}>
                {Object.entries(ROUTES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--ink-muted)" }}>▼</span>
            </div>
          </div>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5 }}>EV MODEL</label>
            <div style={{ position: "relative" }}>
              <select value={ev} onChange={e => setEv(e.target.value)} style={{ width: "100%", padding: "9px 30px 9px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", color: "var(--ink)" }}>
                {ROUTE_EV_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--ink-muted)" }}>▼</span>
            </div>
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5 }}>
              MY CHARGE STOP: <span style={{ color: "var(--forest)", fontWeight: 700 }}>{chargeDuration} MIN</span>
            </label>
            <input type="range" min={15} max={60} step={5} value={chargeDuration} onChange={e => setChargeDuration(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--forest)", height: 36 }} />
          </div>
          <div style={{ display: "flex", gap: 12, background: "var(--cream)", borderRadius: 8, padding: "8px 14px", border: "1px solid var(--border)" }}>
            {[["Dist.", `${currentRoute.distance}km`], ["Drive", `${Math.floor(currentRoute.duration / 60)}h${currentRoute.duration % 60}m`], ["Stops", `${currentRoute.stops.length}`], ["Charge", `${totalChargeMin}min`]].map(([l, v]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", textTransform: "uppercase" }}>{l}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Route map */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", border: "1px solid var(--border)", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Route with Charging Stops</div>
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>Click a stop for details</span>
        </div>
        <RouteMap route={currentRoute} activeStop={activeStop} onStopClick={i => setActiveStop(activeStop === i ? null : i)} />
      </div>

      {/* Charging stops + detail panel */}
      <div style={{ display: "grid", gridTemplateColumns: activeStop !== null ? "1fr 1fr" : "1fr", gap: 16 }}>
        {/* Stop cards */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-light)", marginBottom: 12 }}>
            Charging Stops ({currentRoute.stops.length})
          </div>
          {currentRoute.stops.map((stop, idx) => {
            const station = CHARGING_STATIONS[stop.stationId];
            if (!station) return null;
            const isActive = activeStop === idx;

            return (
              <div key={stop.stationId} onClick={() => setActiveStop(isActive ? null : idx)} className="hover-lift" style={{ background: "#fff", border: `2px solid ${isActive ? "var(--forest)" : "var(--border)"}`, borderRadius: 12, padding: "18px 20px", cursor: "pointer", marginBottom: 12, transition: "border-color 0.15s", animation: "slideUp 0.25s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: isActive ? "var(--forest)" : "var(--forest-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "background 0.15s" }}>
                      <span style={{ filter: isActive ? "brightness(0) invert(1)" : "none" }}>⚡</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "'Libre Baskerville',serif", marginBottom: 2 }}>{station.name}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)" }}>{station.power} · {station.network}</span>
                        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: congestionColor(station.congestion), fontWeight: 600 }}>{congestionLabel(station.congestion)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--forest)" }}>{stop.chargeMin}<span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-muted)" }}>min</span></div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{station.pricePerKwh} SEK/kWh</div>
                  </div>
                </div>

                {/* SOC bars */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div><div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase" }}>Arrival</div><SocBar soc={stop.arrivalSoc} /></div>
                  <div><div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 3, textTransform: "uppercase" }}>Departure</div><SocBar soc={stop.departSoc} /></div>
                </div>

                {/* Amenities */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {station.amenities.map(a => <Tag key={a}>{a}</Tag>)}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: isActive ? "var(--forest)" : "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                    {isActive ? "Close details" : "View details"}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectStation(station); }}
                    style={{ fontSize: 10, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--forest)", background: "var(--forest-pale)", color: "var(--forest)", cursor: "pointer", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}
                  >
                    Explore nearby →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: stop detail panel */}
        {activeStop !== null && currentStopData && (
          <div style={{ position: "sticky", top: 74, maxHeight: "calc(100vh - 94px)" }}>
            <StopDetail stop={currentStopData} onClose={() => setActiveStop(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { CHARGING_STATIONS } from "../data/stations";
import { TRAVELER_TYPES } from "../data/travelerTypes";
import { EXPERIENCE_TYPES, SOURCE_META } from "../data/experienceTypes";
import ExperienceCard from "../components/ExperienceCard";

export default function ExplorePage({ allExperiences, onVote }) {
  const [filterTraveler, setFilterTraveler] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStation, setFilterStation] = useState("all");

  const filtered = allExperiences.filter(e => {
    if (e.status !== "approved") return false;
    if (filterTraveler !== "all" && !(e.travelerTypes || []).includes(filterTraveler)) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterSource !== "all" && e.source !== filterSource) return false;
    if (filterStation !== "all" && e.stationId !== filterStation) return false;
    return true;
  }).sort((a, b) => b.votes - a.votes);

  return (
    <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>Explore Experiences</h2>
        <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Discover what to do while your EV charges across Sweden</p>
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", marginBottom: 16 }}>
        {/* Station filter */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Station</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setFilterStation("all")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterStation === "all" ? "var(--forest)" : "var(--border)"}`, background: filterStation === "all" ? "var(--forest-pale)" : "#fff", color: filterStation === "all" ? "var(--forest)" : "var(--ink-muted)", cursor: "pointer", fontWeight: filterStation === "all" ? 600 : 400 }}>
              All stations
            </button>
            {Object.values(CHARGING_STATIONS).map(s => (
              <button key={s.id} onClick={() => setFilterStation(s.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${filterStation === s.id ? "var(--forest)" : "var(--border)"}`, background: filterStation === s.id ? "var(--forest-pale)" : "#fff", color: filterStation === s.id ? "var(--forest)" : "var(--ink-muted)", cursor: "pointer", fontWeight: filterStation === s.id ? 600 : 400 }}>
                {s.city}
              </button>
            ))}
          </div>
        </div>

        {/* Traveler filter */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Traveler</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["all", ...TRAVELER_TYPES.map(t => t.id)].map(tid => {
              const t = TRAVELER_TYPES.find(x => x.id === tid);
              return (
                <button key={tid} onClick={() => setFilterTraveler(tid)} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, border: `1px solid ${filterTraveler === tid ? (t?.color || "var(--forest)") : "var(--border)"}`, background: filterTraveler === tid ? (t?.bg || "var(--forest-pale)") : "#fff", color: filterTraveler === tid ? (t?.color || "var(--forest)") : "var(--ink-muted)", cursor: "pointer", fontWeight: filterTraveler === tid ? 600 : 400 }}>
                  {tid === "all" ? "All travelers" : `${t?.icon} ${t?.label}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type filter */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setFilterType("all")} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, border: `1px solid ${filterType === "all" ? "var(--forest)" : "var(--border)"}`, background: filterType === "all" ? "var(--forest-pale)" : "#fff", color: filterType === "all" ? "var(--forest)" : "var(--ink-muted)", cursor: "pointer", fontWeight: filterType === "all" ? 600 : 400 }}>
              All types
            </button>
            {EXPERIENCE_TYPES.map(t => (
              <button key={t.id} onClick={() => setFilterType(t.id)} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, border: `1px solid ${filterType === t.id ? t.color : "var(--border)"}`, background: filterType === t.id ? t.color + "18" : "#fff", color: filterType === t.id ? t.color : "var(--ink-muted)", cursor: "pointer", fontWeight: filterType === t.id ? 600 : 400 }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source filter */}
        <div>
          <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button onClick={() => setFilterSource("all")} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, border: `1px solid ${filterSource === "all" ? "var(--forest)" : "var(--border)"}`, background: filterSource === "all" ? "var(--forest-pale)" : "#fff", color: filterSource === "all" ? "var(--forest)" : "var(--ink-muted)", cursor: "pointer", fontWeight: filterSource === "all" ? 600 : 400 }}>
              All sources
            </button>
            {Object.entries(SOURCE_META).map(([k, v]) => (
              <button key={k} onClick={() => setFilterSource(k)} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 12, border: `1px solid ${filterSource === k ? v.border : "var(--border)"}`, background: filterSource === k ? v.bg : "#fff", color: filterSource === k ? v.text : "var(--ink-muted)", cursor: "pointer", fontWeight: filterSource === k ? 600 : 400 }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
        {filtered.length} experience{filtered.length !== 1 ? "s" : ""} found
      </div>

      {/* Experience cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-muted)", fontSize: 13 }}>
          No experiences match your filters. Try adjusting them.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(exp => (
            <ExperienceCard key={exp.id} exp={exp} chargeDuration={40} onVote={onVote} showStation />
          ))}
        </div>
      )}
    </div>
  );
}

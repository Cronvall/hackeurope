import { useState, useEffect } from "react";
import { CHARGING_STATIONS } from "../data/stations";
import { TRAVELER_TYPES } from "../data/travelerTypes";
import { EXPERIENCE_TYPES, SOURCE_META } from "../data/experienceTypes";
import ExperienceCard from "../components/ExperienceCard";
import RecommendationCard from "../components/RecommendationCard";
import { searchVisitSweden } from "../utils/visitSweden";

const VS_TYPE_FILTERS = [
  { id: "all", label: "All", icon: "🌍" },
  { id: "place", label: "Places", icon: "📍" },
  { id: "food", label: "Dining", icon: "🍽️" },
  { id: "lodging", label: "Stay", icon: "🏨" },
  { id: "event", label: "Events", icon: "🎭" },
  { id: "store", label: "Shopping", icon: "🛍️" },
];

export default function ExplorePage({ allExperiences, onVote }) {
  const [tab, setTab] = useState("discover");

  // Visit Sweden state
  const [vsResults, setVsResults] = useState([]);
  const [vsLoading, setVsLoading] = useState(false);
  const [vsError, setVsError] = useState(null);
  const [vsType, setVsType] = useState("all");
  const [vsOffset, setVsOffset] = useState(0);
  const [vsHasMore, setVsHasMore] = useState(true);

  // Community filters
  const [filterTraveler, setFilterTraveler] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStation, setFilterStation] = useState("all");

  // Fetch Visit Sweden data
  useEffect(() => {
    let cancelled = false;
    setVsLoading(true);
    setVsError(null);

    searchVisitSweden({ type: vsType, limit: 20, offset: vsOffset })
      .then((data) => {
        if (cancelled) return;
        if (vsOffset === 0) {
          setVsResults(data.results);
        } else {
          setVsResults((prev) => [...prev, ...data.results]);
        }
        setVsHasMore(data.results.length >= 10);
        setVsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setVsError(err.message);
        setVsLoading(false);
      });

    return () => { cancelled = true; };
  }, [vsType, vsOffset]);

  // Reset offset when type changes
  const handleVsTypeChange = (type) => {
    setVsType(type);
    setVsOffset(0);
    setVsResults([]);
  };

  const filtered = allExperiences.filter((e) => {
    if (e.status !== "approved") return false;
    if (filterTraveler !== "all" && !(e.travelerTypes || []).includes(filterTraveler)) return false;
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterSource !== "all" && e.source !== filterSource) return false;
    if (filterStation !== "all" && e.stationId !== filterStation) return false;
    return true;
  }).sort((a, b) => b.votes - a.votes);

  return (
    <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>
          Explore Sweden
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>
          Discover places and experiences while your EV charges
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "var(--cream-dark)", borderRadius: 10, padding: 3 }}>
        {[
          { id: "discover", label: "Discover Sweden", icon: "🇸🇪" },
          { id: "community", label: "Community", icon: "👥" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 400,
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "var(--forest)" : "var(--ink-muted)",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Discover Sweden tab */}
      {tab === "discover" && (
        <>
          {/* Type filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {VS_TYPE_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => handleVsTypeChange(f.id)}
                style={{
                  fontSize: 12,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${vsType === f.id ? "var(--forest)" : "var(--border)"}`,
                  background: vsType === f.id ? "var(--forest)" : "#fff",
                  color: vsType === f.id ? "#fff" : "var(--ink-muted)",
                  cursor: "pointer",
                  fontWeight: vsType === f.id ? 600 : 400,
                  transition: "all 0.2s",
                  fontFamily: "'Outfit',sans-serif",
                }}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Powered by badge */}
          <div style={{ fontSize: 10, color: "var(--ink-muted)", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#006AA7", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 9 }}>Visit Sweden</span>
            <span>{vsResults.length} recommendation{vsResults.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Error state */}
          {vsError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "#b91c1c" }}>
              Could not load recommendations. {vsError}
            </div>
          )}

          {/* Results grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {vsResults.map((item, i) => (
              <RecommendationCard key={`${item.entryId}-${i}`} item={item} />
            ))}
          </div>

          {/* Loading state */}
          {vsLoading && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 24, marginBottom: 8, animation: "pulse 1.5s infinite" }}>🇸🇪</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
                Loading recommendations from Visit Sweden...
              </div>
            </div>
          )}

          {/* Load more */}
          {!vsLoading && vsHasMore && vsResults.length > 0 && (
            <button
              onClick={() => setVsOffset((prev) => prev + 20)}
              style={{
                display: "block",
                width: "100%",
                margin: "16px 0",
                padding: "12px",
                border: "1.5px solid var(--forest)",
                borderRadius: 10,
                background: "transparent",
                color: "var(--forest)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Outfit',sans-serif",
              }}
            >
              Load more recommendations
            </button>
          )}

          {/* Empty state */}
          {!vsLoading && !vsError && vsResults.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-muted)", fontSize: 13 }}>
              No recommendations found for this category. Try another filter.
            </div>
          )}
        </>
      )}

      {/* Community tab */}
      {tab === "community" && (
        <>
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

          <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace" }}>
            {filtered.length} experience{filtered.length !== 1 ? "s" : ""} found
          </div>

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
        </>
      )}
    </div>
  );
}

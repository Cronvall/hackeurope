import { useState, useEffect } from "react";
import { CHARGING_STATIONS } from "../data/stations";
import RecommendationCard from "../components/RecommendationCard";
import { searchNearStation } from "../utils/foursquare";

const TYPE_FILTERS = [
  { id: "all", label: "All", icon: "\u{1F30D}" },
  { id: "place", label: "Places", icon: "\u{1F4CD}" },
  { id: "food", label: "Dining", icon: "\u{1F37D}\uFE0F" },
  { id: "lodging", label: "Stay", icon: "\u{1F3E8}" },
  { id: "event", label: "Events", icon: "\u{1F3AD}" },
  { id: "store", label: "Shopping", icon: "\u{1F6CD}\uFE0F" },
];

const ALL_STATIONS = Object.values(CHARGING_STATIONS);

export default function ExplorePage({ selectedStation, onChangeStation }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch nearby places whenever station or type filter changes
  useEffect(() => {
    if (!selectedStation) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    searchNearStation({
      lat: selectedStation.lat,
      lon: selectedStation.lng,
      maxWalkMin: 15,
      type: typeFilter,
    })
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [selectedStation, typeFilter]);

  // No station selected — show station picker
  if (!selectedStation) {
    return (
      <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>
            Explore nearby
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            Select a charging station to discover places within a 15-minute walk.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ALL_STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onChangeStation(s)}
              className="hover-lift"
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 20px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 14,
                transition: "border-color 0.15s",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "var(--forest-pale)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>
                {"\u26A1"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 2 }}>
                  {s.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                  {s.city} {"\u00B7"} {s.power} {"\u00B7"} {s.network}
                </div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--forest)", fontWeight: 600 }}>
                {"Explore \u2192"}
              </div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: "var(--ink-muted)", textAlign: "center", fontFamily: "'JetBrains Mono',monospace" }}>
          Or select a station on the Route tab and tap "Explore nearby"
        </div>
      </div>
    );
  }

  // Station selected — show nearby recommendations
  return (
    <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto" }}>
      {/* Station header */}
      <div style={{ background: "var(--forest)", borderRadius: 12, padding: "16px 20px", marginBottom: 16, color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", opacity: 0.6, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Exploring near
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>
              {selectedStation.name}
            </div>
            <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7 }}>
              {selectedStation.city} {"\u00B7"} {selectedStation.power} {"\u00B7"} {selectedStation.network}
            </div>
          </div>
          <button
            onClick={() => onChangeStation(null)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "6px 12px",
              color: "#fff",
              fontSize: 11,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Change station
          </button>
        </div>
        <div style={{ marginTop: 10, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", opacity: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
          {"\u{1F6B6}"} Within 15 min walk ({"\u223C"}1.2 km)
        </div>
      </div>

      {/* Type filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setTypeFilter(f.id)}
            style={{
              fontSize: 12,
              padding: "6px 14px",
              borderRadius: 20,
              border: `1.5px solid ${typeFilter === f.id ? "var(--forest)" : "var(--border)"}`,
              background: typeFilter === f.id ? "var(--forest)" : "#fff",
              color: typeFilter === f.id ? "#fff" : "var(--ink-muted)",
              cursor: "pointer",
              fontWeight: typeFilter === f.id ? 600 : 400,
              transition: "all 0.2s",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Results count + source */}
      {!loading && !error && (
        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 12, fontFamily: "'JetBrains Mono',monospace", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "#8b2eff", color: "#fff", padding: "2px 6px", borderRadius: 4, fontWeight: 600, fontSize: 9 }}>Foursquare</span>
          <span>{results.length} place{results.length !== 1 ? "s" : ""} within walking distance</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", marginBottom: 16, fontSize: 13, color: "#b91c1c" }}>
          Could not load recommendations. {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "pulse 1.5s infinite" }}>{"\u{1F1F8}\u{1F1EA}"}</div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            Finding places near {selectedStation.city}...
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {results.map((item, i) => (
            <RecommendationCard key={`${item.entryId}-${i}`} item={item} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u{1F50D}"}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
            No places found nearby
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            No listings found within 15 minutes of this station.
            Try a different station or category.
          </p>
        </div>
      )}
    </div>
  );
}

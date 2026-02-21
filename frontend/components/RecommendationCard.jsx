import { useState } from "react";

export default function RecommendationCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const cat = item.category || {};

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className="hover-lift"
      style={{
        background: "#fff",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        animation: "slideUp 0.25s ease",
      }}
    >
      {/* Image */}
      {item.image && !imgError ? (
        <div style={{ position: "relative", height: 160, overflow: "hidden" }}>
          <img
            src={item.image}
            alt={item.name}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(transparent, rgba(0,0,0,0.5))",
              height: 60,
            }}
          />
          {/* Category badge on image */}
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--forest)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {cat.icon} {cat.label}
          </div>
          {/* Rating badge */}
          {item.rating != null && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fbbf24",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {"\u2605"} {(item.rating / 2).toFixed(1)}
            </div>
          )}
          {item.region && (
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                color: "#fff",
                fontSize: 11,
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 500,
                textShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}
            >
              {item.region}
            </div>
          )}
        </div>
      ) : (
        /* Fallback: no image */
        <div
          style={{
            height: 80,
            background: `linear-gradient(135deg, var(--forest-pale), var(--cream-dark))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 28 }}>{cat.icon || "\u{1F4CD}"}</span>
          {item.region && (
            <span
              style={{
                fontSize: 12,
                fontFamily: "'JetBrains Mono',monospace",
                color: "var(--forest)",
                fontWeight: 500,
              }}
            >
              {item.region}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "14px 16px" }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ink)",
            marginBottom: 4,
            fontFamily: "'Libre Baskerville',serif",
          }}
        >
          {item.name}
        </div>

        {/* Walking distance + open status */}
        {item.walkMin != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--forest)", fontWeight: 600, background: "var(--forest-pale)", padding: "2px 7px", borderRadius: 4 }}>
              {"\u{1F6B6}"} {item.walkMin} min walk
            </span>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)" }}>
              {item.distanceM >= 1000 ? `${(item.distanceM / 1000).toFixed(1)} km` : `${item.distanceM} m`}
            </span>
            {item.openNow != null && (
              <span style={{
                fontSize: 10,
                fontFamily: "'JetBrains Mono',monospace",
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 4,
                background: item.openNow ? "#dcfce7" : "#fef2f2",
                color: item.openNow ? "#16a34a" : "#dc2626",
              }}>
                {item.openNow ? "Open now" : "Closed"}
              </span>
            )}
          </div>
        )}

        {/* Address */}
        {item.address && (
          <div style={{
            fontSize: 11,
            color: "var(--ink-muted)",
            marginBottom: 6,
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {item.address}
          </div>
        )}

        <p
          style={{
            fontSize: 13,
            color: "var(--ink-light)",
            lineHeight: 1.6,
            marginBottom: 10,
          }}
        >
          {expanded ? item.fullDescription || item.description : item.description}
        </p>

        {/* Tags row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {!item.image && (
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 6,
                background: "var(--forest-pale)",
                color: "var(--forest)",
                fontWeight: 600,
              }}
            >
              {cat.icon} {cat.label}
            </span>
          )}
          {item.rating != null && !item.image && (
            <span
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 6,
                background: "#fef9c3",
                color: "#a16207",
                fontWeight: 600,
                fontFamily: "'JetBrains Mono',monospace",
              }}
            >
              {"\u2605"} {(item.rating / 2).toFixed(1)}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 6,
              background: "var(--cream)",
              border: "1px solid var(--border)",
              color: "var(--ink-muted)",
              fontFamily: "'JetBrains Mono',monospace",
            }}
          >
            Foursquare
          </span>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontSize: 10,
                padding: "3px 8px",
                borderRadius: 6,
                background: "var(--forest)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {"Website \u2197"}
            </a>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              fontSize: 11,
              color: "var(--ink-muted)",
              fontFamily: "'JetBrains Mono',monospace",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              {item.lat && item.lon && (
                <span>{"\u{1F4CD}"} {item.lat.toFixed(4)}, {item.lon.toFixed(4)}</span>
              )}
              {item.categoryKey && (
                <span style={{ opacity: 0.7 }}>{item.categoryKey}</span>
              )}
            </div>
            {item.phone && (
              <a
                href={`tel:${item.phone}`}
                onClick={(e) => e.stopPropagation()}
                style={{ color: "var(--forest)", textDecoration: "none" }}
              >
                {"\u{1F4DE}"} {item.phone}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

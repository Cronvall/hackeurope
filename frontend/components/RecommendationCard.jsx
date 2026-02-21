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
          <span style={{ fontSize: 28 }}>{cat.icon || "📍"}</span>
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
            Visit Sweden
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
              Website ↗
            </a>
          )}
        </div>

        {/* Coordinates (shown when expanded) */}
        {expanded && item.lat && item.lon && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              fontSize: 11,
              color: "var(--ink-muted)",
              fontFamily: "'JetBrains Mono',monospace",
              display: "flex",
              gap: 12,
            }}
          >
            <span>📍 {item.lat.toFixed(4)}, {item.lon.toFixed(4)}</span>
            {item.categoryKey && (
              <span style={{ opacity: 0.7 }}>{item.categoryKey}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { TRAVELER_TYPES } from "../data/travelerTypes";
import { SOURCE_META } from "../data/experienceTypes";
import { socColor } from "../utils/helpers";
import { loadVotes, saveVotes } from "../utils/storage";

export function SourceBadge({ source, sourceLabel }) {
  const s = SOURCE_META[source] || { bg: "#f0f0f0", text: "#666", border: "#ccc", dot: "#666" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 10, fontFamily: "'JetBrains Mono',monospace", fontWeight: 500, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }}/>
      {sourceLabel || s.label || source}
    </span>
  );
}

export function TravelerBadge({ type }) {
  const t = TRAVELER_TYPES.find(x => x.id === type);
  if (!t) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: t.bg, color: t.color, fontSize: 10, padding: "2px 7px", borderRadius: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {t.icon} {t.label}
    </span>
  );
}

export function Tag({ children }) {
  return (
    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", background: "var(--cream-dark)", padding: "2px 7px", borderRadius: 3, border: "1px solid var(--border)" }}>
      {children}
    </span>
  );
}

export function SocBar({ soc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: "#ddd", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${soc}%`, height: "100%", background: socColor(soc), borderRadius: 3, transition: "width 0.5s ease" }}/>
      </div>
      <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: socColor(soc), fontWeight: 600, minWidth: 30 }}>{soc}%</span>
    </div>
  );
}

export function CongestionBadge({ level }) {
  const config = {
    low: { bg: "var(--forest-pale)", color: "var(--forest)", label: "Low traffic" },
    medium: { bg: "var(--amber-pale)", color: "#8a5000", label: "Moderate" },
    high: { bg: "var(--red-pale)", color: "var(--red)", label: "Busy" },
    extreme: { bg: "#fdeaea", color: "#c02828", label: "Very busy" },
  };
  const c = config[level] || config.low;
  return (
    <span style={{ background: c.bg, color: c.color, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

export function VoteButton({ expId, initialVotes, onVote }) {
  const [votes, setVotes] = useState(initialVotes || 0);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVotes().then(v => setVoted(!!v[expId]));
  }, [expId]);

  const handleVote = async (e) => {
    e.stopPropagation();
    if (voted || loading) return;
    setLoading(true);
    const currentVotes = await loadVotes();
    currentVotes[expId] = true;
    await saveVotes(currentVotes);
    const newCount = votes + 1;
    setVotes(newCount);
    setVoted(true);
    setLoading(false);
    onVote && onVote(expId, newCount);
  };

  return (
    <button onClick={handleVote} disabled={voted || loading} style={{ display: "flex", alignItems: "center", gap: 5, background: voted ? "var(--forest-pale)" : "#fff", color: voted ? "var(--forest)" : "var(--ink-muted)", border: `1px solid ${voted ? "#b8d8be" : "var(--border)"}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace", fontWeight: voted ? 700 : 400, cursor: voted ? "default" : "pointer", transition: "all 0.15s" }}>
      <span style={{ fontSize: 14 }}>{voted ? "▲" : "△"}</span>
      {votes}
    </button>
  );
}

export function QuickChips({ options, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {options.map(opt => (
        <button
          key={typeof opt === "string" ? opt : opt.label}
          onClick={() => onSelect(typeof opt === "string" ? opt : opt.value)}
          style={{
            background: "var(--forest-pale)",
            border: "1px solid #b8d8be",
            borderRadius: 20, padding: "6px 14px",
            color: "var(--forest)", fontSize: 13, cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "'Outfit', sans-serif",
          }}
          onMouseEnter={e => { e.target.style.background = "#d4ebd9"; }}
          onMouseLeave={e => { e.target.style.background = "var(--forest-pale)"; }}
        >
          {typeof opt === "string" ? opt : opt.label}
        </button>
      ))}
    </div>
  );
}

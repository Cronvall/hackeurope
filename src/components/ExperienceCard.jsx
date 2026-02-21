import { useState } from "react";
import { EXPERIENCE_TYPES } from "../data/experienceTypes";
import { CHARGING_STATIONS } from "../data/stations";
import { fitsCharge, timeAgo } from "../utils/helpers";
import { SourceBadge, TravelerBadge, Tag, VoteButton } from "./SmallComponents";

export default function ExperienceCard({ exp, chargeDuration, onVote, showStation }) {
  const [expanded, setExpanded] = useState(false);
  const fits = fitsCharge(exp, chargeDuration);
  const typeInfo = EXPERIENCE_TYPES.find(t => t.id === exp.type);
  const isUserSubmitted = exp.source === "community";
  const isPending = exp.status === "pending";

  return (
    <div onClick={() => setExpanded(v => !v)} className="hover-lift" style={{ background: "#fff", border: `1.5px solid ${fits ? "#c8e8cc" : isPending ? "#fde68a" : "var(--border)"}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", animation: "slideUp 0.25s ease", position: "relative", overflow: "hidden", opacity: isPending ? 0.85 : 1 }}>
      {isPending && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "#e8a020", color: "#fff", fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, padding: "3px 8px", borderBottomLeftRadius: 6, letterSpacing: "0.05em" }}>
          PENDING REVIEW
        </div>
      )}
      {fits && !isPending && (
        <div style={{ position: "absolute", top: 0, right: 0, background: "var(--forest)", color: "var(--electric)", fontSize: 9, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, padding: "3px 8px", borderBottomLeftRadius: 6, letterSpacing: "0.05em" }}>
          FITS {chargeDuration}MIN
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0, background: typeInfo ? typeInfo.color + "18" : "var(--cream-dark)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {exp.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 3, paddingRight: fits ? 80 : 0 }}>
            {exp.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <SourceBadge source={exp.source} sourceLabel={exp.sourceLabel} />
            <span style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
              {exp.walkMin}min walk · {exp.distanceM >= 1000 ? `${(exp.distanceM / 1000).toFixed(1)}km` : `${exp.distanceM}m`}
            </span>
            {exp.rating && (
              <span style={{ fontSize: 10, color: "var(--amber)", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>
                {exp.rating}{exp.ratingMax ? `/${exp.ratingMax}` : ""}
              </span>
            )}
            {showStation && CHARGING_STATIONS[exp.stationId] && (
              <span style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
                {CHARGING_STATIONS[exp.stationId].city}
              </span>
            )}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-light)", lineHeight: 1.6, marginBottom: 8 }}>{exp.description}</p>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace", background: "var(--cream)", padding: "2px 7px", borderRadius: 4, border: "1px solid var(--border)" }}>
          {exp.minDuration}–{exp.maxDuration}min
        </span>
        {(exp.travelerTypes || []).map(t => <TravelerBadge key={t} type={t} />)}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        {exp.hours && <span style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{exp.hours}</span>}
        {exp.price && <span style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{exp.price}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        {(exp.tags || []).map(t => <Tag key={t}>{t}</Tag>)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <VoteButton expId={exp.id} initialVotes={exp.votes} onVote={onVote} />
        {isUserSubmitted && (
          <span style={{ fontSize: 10, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>
            by {exp.submittedBy || "anonymous"} · {timeAgo(exp.submittedAt)}
          </span>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", animation: "slideDown 0.2s ease" }}>
          {exp.tips && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tips</div>
              {exp.tips.map((t, i) => <div key={i} style={{ fontSize: 12, color: "var(--ink-light)", marginBottom: 4, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>"{t}"</div>)}
            </div>
          )}
          {exp.openDates && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>Open Dates</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {exp.openDates.map(d => <span key={d} style={{ fontSize: 11, background: "var(--amber-pale)", color: "var(--amber)", padding: "2px 7px", borderRadius: 4, border: "1px solid #e8c880", fontFamily: "'JetBrains Mono',monospace" }}>{d}</span>)}
              </div>
            </div>
          )}
          {exp.submitterNote && (
            <div style={{ background: "var(--purple-pale)", border: "1px solid #d8b4fe", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "var(--purple)", fontStyle: "italic", marginTop: 8 }}>
              "{exp.submitterNote}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

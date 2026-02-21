import { useState } from "react";
import { CHARGING_STATIONS } from "../data/stations";
import { EXPERIENCE_TYPES, DURATION_RANGES } from "../data/experienceTypes";
import { TRAVELER_TYPES } from "../data/travelerTypes";
import { generateId } from "../utils/helpers";

export default function SubmissionForm({ onSubmit, onClose, prefilledStation, user }) {
  const [form, setForm] = useState({
    stationId: prefilledStation || "cs-linkoping",
    name: "", type: "food", icon: "🍽️",
    description: "", hours: "", price: "",
    walkMin: "", distanceM: "",
    minDuration: 20, maxDuration: 45,
    travelerTypes: [], tags: "",
    submitterNote: "", openDates: "",
  });
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const toggleTraveler = (id) => {
    set("travelerTypes", form.travelerTypes.includes(id)
      ? form.travelerTypes.filter(t => t !== id)
      : [...form.travelerTypes, id]
    );
  };

  const validate1 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.description.trim().length < 30) e.description = "Please write at least 30 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validate2 = () => {
    const e = {};
    if (!form.walkMin || isNaN(form.walkMin) || form.walkMin < 1) e.walkMin = "Enter walking time in minutes";
    if (form.travelerTypes.length === 0) e.travelerTypes = "Select at least one traveler type";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate2()) return;
    const typeInfo = EXPERIENCE_TYPES.find(t => t.id === form.type);
    const submission = {
      id: generateId(),
      stationId: form.stationId,
      name: form.name.trim(),
      type: form.type,
      icon: typeInfo?.icon || "📍",
      description: form.description.trim(),
      hours: form.hours.trim() || null,
      price: form.price.trim() || null,
      walkMin: parseInt(form.walkMin),
      distanceM: parseInt(form.walkMin) * 75,
      minDuration: form.minDuration,
      maxDuration: form.maxDuration,
      travelerTypes: form.travelerTypes,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      openDates: form.openDates ? form.openDates.split(",").map(d => d.trim()).filter(Boolean) : null,
      submittedBy: user?.name || "anonymous",
      submitterNote: form.submitterNote.trim() || null,
      submittedAt: new Date().toISOString(),
      source: "community",
      sourceLabel: "Community",
      votes: 0,
      status: "pending",
    };
    onSubmit(submission);
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "10px 12px", border: `1px solid ${errors[field] ? "#c02828" : "var(--border)"}`, borderRadius: 8, fontSize: 13, background: "#fff", color: "var(--ink)"
  });

  return (
    <div>
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 2 }}>Add an Experience</h2>
          <p style={{ fontSize: 12, color: "var(--ink-muted)" }}>Share a local discovery near a charging stop · Step {step} of 2</p>
        </div>
        <button onClick={onClose} style={{ background: "var(--cream-dark)", border: "1px solid var(--border)", borderRadius: 6, width: 30, height: 30, fontSize: 16, color: "var(--ink-muted)", cursor: "pointer" }}>x</button>
      </div>

      <div style={{ display: "flex", gap: 0, padding: "0 24px", borderBottom: "1px solid var(--border)" }}>
        {["The experience", "Details & audience"].map((label, i) => (
          <div key={i} style={{ flex: 1, padding: "12px 0", borderBottom: `2px solid ${step === i + 1 ? "var(--forest)" : "transparent"}`, textAlign: "center", fontSize: 12, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? "var(--forest)" : "var(--ink-muted)" }}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Charging Station</label>
              <div style={{ position: "relative" }}>
                <select value={form.stationId} onChange={e => set("stationId", e.target.value)} style={inputStyle()}>
                  {Object.values(CHARGING_STATIONS).map(s => <option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
                </select>
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--ink-muted)" }}>▼</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXPERIENCE_TYPES.map(t => (
                  <button key={t.id} onClick={() => set("type", t.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${form.type === t.id ? t.color : "var(--border)"}`, background: form.type === t.id ? t.color + "15" : "#fff", color: form.type === t.id ? t.color : "var(--ink-muted)", fontSize: 12, fontWeight: form.type === t.id ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name *</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Old Town Bakery, Lakeside Viewpoint..." style={inputStyle("name")} />
              {errors.name && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.name}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Description *</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe the experience from a traveler's perspective..." rows={4} style={{ ...inputStyle("description"), resize: "vertical", lineHeight: 1.6 }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {errors.description ? <span style={{ fontSize: 11, color: "var(--red)" }}>{errors.description}</span> : <span />}
                <span style={{ fontSize: 10, color: form.description.length < 30 ? "var(--red)" : "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{form.description.length}/30 min</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Opening hours</label>
                <input type="text" value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="e.g. Mon-Fri 09-17" style={inputStyle()} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price</label>
                <input type="text" value={form.price} onChange={e => set("price", e.target.value)} placeholder="e.g. Free, 50-150 SEK" style={inputStyle()} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Your personal tip (optional)</label>
              <input type="text" value={form.submitterNote} onChange={e => set("submitterNote", e.target.value)} placeholder="e.g. Ask for the daily special..." style={inputStyle()} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
              <button className="btn-primary" onClick={() => { if (validate1()) setStep(2); }}>Continue</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Walking time from charger (minutes) *</label>
              <input type="text" value={form.walkMin} onChange={e => set("walkMin", e.target.value)} placeholder="e.g. 8" style={inputStyle("walkMin")} />
              {errors.walkMin && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.walkMin}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recommended stop duration — <span style={{ color: "var(--forest)", fontWeight: 700 }}>{form.minDuration}–{form.maxDuration} min</span>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>Minimum</div>
                  <input type="range" min={10} max={55} step={5} value={form.minDuration} onChange={e => set("minDuration", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--forest)" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>Maximum</div>
                  <input type="range" min={15} max={60} step={5} value={form.maxDuration} onChange={e => set("maxDuration", Number(e.target.value))} style={{ width: "100%", accentColor: "var(--forest)" }} />
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                {DURATION_RANGES.map(d => (
                  <button key={d.label} onClick={() => { set("minDuration", d.min); set("maxDuration", d.max); }} style={{ flex: 1, padding: "7px 6px", borderRadius: 8, border: `1.5px solid ${form.minDuration === d.min ? "var(--forest)" : "var(--border)"}`, background: form.minDuration === d.min ? "var(--forest-pale)" : "#fff", color: form.minDuration === d.min ? "var(--forest)" : "var(--ink-muted)", fontSize: 11, cursor: "pointer", textAlign: "center" }}>
                    {d.icon} {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Best suited for *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {TRAVELER_TYPES.map(t => {
                  const selected = form.travelerTypes.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTraveler(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 20, border: `1.5px solid ${selected ? t.color : "var(--border)"}`, background: selected ? t.bg : "#fff", color: selected ? t.color : "var(--ink-muted)", fontSize: 13, fontWeight: selected ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                      {t.icon} {t.label}
                    </button>
                  );
                })}
              </div>
              {errors.travelerTypes && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 3 }}>{errors.travelerTypes}</div>}
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Tags (comma-separated)</label>
              <input type="text" value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="e.g. Local, Organic, Dog-friendly" style={inputStyle()} />
            </div>

            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Open dates (optional, comma-separated)</label>
              <input type="text" value={form.openDates} onChange={e => set("openDates", e.target.value)} placeholder="e.g. 5 Jul, 12 Jul, 19 Jul" style={inputStyle()} />
            </div>

            <div style={{ background: "var(--forest-pale)", border: "1px solid #c8e8cc", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--forest)", display: "flex", alignItems: "center", gap: 8 }}>
              Submitting as <strong>{user?.name || "anonymous"}</strong>
            </div>

            <div style={{ background: "var(--amber-pale)", border: "1px solid #e8c87a", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#8a5000" }}>
              Your submission will be reviewed before going live. It will appear immediately for you (marked as pending).
            </div>

            <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={handleSubmit} style={{ flex: 1 }}>Submit for review</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

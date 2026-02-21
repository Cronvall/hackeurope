import { useState, useEffect } from "react";
import { loadUsers, saveUsers, loadSession, saveSession, clearSession, loadEvSettings, saveEvSettings, loadSubmissions } from "../utils/storage";
import { AI_EV_MODELS } from "../data/evModels";
import { TRAVELER_TYPES, AI_TRAVELER_MAP } from "../data/travelerTypes";
import Icons from "../components/Icons";
import ExperienceCard from "../components/ExperienceCard";

export default function ProfilePage({ user, onLogin, onLogout }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [evSettings, setEvSettings] = useState({ model: "", soc: 90, travelerType: "", priorities: [] });
  const [mySubmissions, setMySubmissions] = useState([]);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const saved = loadEvSettings();
    if (saved) setEvSettings(saved);
    loadSubmissions().then(subs => {
      if (user) {
        setMySubmissions(subs.filter(s => s.submittedBy === user.name));
      }
    });
  }, [user]);

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setError(""); };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    const users = await loadUsers();

    if (mode === "register") {
      if (!form.name.trim()) { setError("Display name is required"); setLoading(false); return; }
      if (!form.email.trim() || !form.email.includes("@")) { setError("Valid email is required"); setLoading(false); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
      if (form.password !== form.confirm) { setError("Passwords don't match"); setLoading(false); return; }
      const key = form.email.toLowerCase();
      if (users[key]) { setError("An account with this email already exists"); setLoading(false); return; }
      const hash = btoa(form.password + "ev-salt-2025");
      users[key] = { name: form.name.trim(), email: key, hash, joinedAt: new Date().toISOString() };
      await saveUsers(users);
      const session = { email: key, name: form.name.trim(), loggedInAt: new Date().toISOString() };
      await saveSession(session);
      onLogin(session);
    } else {
      if (!form.email.trim() || !form.password) { setError("Please enter your email and password"); setLoading(false); return; }
      const key = form.email.toLowerCase();
      const u = users[key];
      if (!u) { setError("No account found with this email"); setLoading(false); return; }
      const hash = btoa(form.password + "ev-salt-2025");
      if (u.hash !== hash) { setError("Incorrect password"); setLoading(false); return; }
      const session = { email: key, name: u.name, loggedInAt: new Date().toISOString() };
      await saveSession(session);
      onLogin(session);
    }
    setLoading(false);
  };

  const handleSaveSettings = () => {
    saveEvSettings(evSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const togglePriority = (p) => {
    setEvSettings(prev => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter(x => x !== p)
        : [...prev.priorities, p],
    }));
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "#fff", color: "var(--ink)", fontFamily: "'Outfit',sans-serif" };

  // ── LOGGED OUT: Auth Form ──
  if (!user) {
    return (
      <div style={{ padding: "24px 20px", maxWidth: 440, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--forest-pale)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icons.User size={28} color="var(--forest)" />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 4 }}>
            {mode === "login" ? "Welcome back" : "Join the community"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-muted)" }}>Sign in to contribute experiences, save EV settings, and plan trips with AI</p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 2, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {[["login", "Sign in"], ["register", "Create account"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, background: mode === m ? "#fff" : "transparent", border: "none", color: mode === m ? "var(--ink)" : "var(--ink-muted)", padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: mode === m ? 600 : 400, cursor: "pointer", boxShadow: mode === m ? "var(--shadow-sm)" : "none", transition: "all 0.15s", fontFamily: "'Outfit',sans-serif" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Display name *</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)} placeholder="How you'll appear on contributions" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Email *</label>
            <input type="text" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Password *</label>
            <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder={mode === "register" ? "At least 6 characters" : "Your password"} style={inputStyle} />
          </div>
          {mode === "register" && (
            <div>
              <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Confirm password *</label>
              <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} placeholder="Repeat password" style={inputStyle} />
            </div>
          )}

          {error && (
            <div style={{ background: "var(--red-pale)", border: "1px solid #f0b8b8", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--red)", display: "flex", alignItems: "center", gap: 6 }}>
              {error}
            </div>
          )}

          <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--ink-muted)", lineHeight: 1.6 }}>
            Your account is stored locally in this app. Your display name will appear on contributions you make.
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn-primary" style={{ padding: "12px", fontSize: 14, opacity: loading ? 0.7 : 1 }}>
            {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </div>
      </div>
    );
  }

  // ── LOGGED IN: Profile + Settings ──
  return (
    <div style={{ padding: "24px 20px", maxWidth: 520, margin: "0 auto" }}>
      {/* User info */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.User size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Libre Baskerville',serif" }}>{user.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{user.email}</div>
            </div>
          </div>
          <button onClick={async () => { await clearSession(); onLogout(); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid var(--border)", color: "var(--ink-muted)", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
            <Icons.LogOut size={14} color="var(--ink-muted)" /> Sign out
          </button>
        </div>
      </div>

      {/* EV Settings */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Icons.Settings size={16} color="var(--forest)" />
          <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Libre Baskerville',serif" }}>EV Settings</h3>
        </div>
        <p style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          These settings pre-fill your AI trip planner so you don't have to repeat them each time.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* EV Model */}
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>EV Model</label>
            <div style={{ position: "relative" }}>
              <select value={evSettings.model} onChange={e => setEvSettings(p => ({ ...p, model: e.target.value }))} style={{ ...inputStyle, paddingRight: 30 }}>
                <option value="">Select your vehicle...</option>
                {AI_EV_MODELS.map(m => <option key={m.name} value={m.name}>{m.name} ({m.range_km}km range)</option>)}
              </select>
              <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--ink-muted)" }}>▼</span>
            </div>
          </div>

          {/* Default SOC */}
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Default battery level: <span style={{ color: "var(--forest)", fontWeight: 700 }}>{evSettings.soc}%</span>
            </label>
            <input type="range" min={20} max={100} step={5} value={evSettings.soc} onChange={e => setEvSettings(p => ({ ...p, soc: Number(e.target.value) }))} style={{ width: "100%", accentColor: "var(--forest)" }} />
          </div>

          {/* Traveler type */}
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Traveler type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {Object.keys(AI_TRAVELER_MAP).map(type => (
                <button key={type} onClick={() => setEvSettings(p => ({ ...p, travelerType: type }))} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${evSettings.travelerType === type ? "var(--forest)" : "var(--border)"}`, background: evSettings.travelerType === type ? "var(--forest-pale)" : "#fff", color: evSettings.travelerType === type ? "var(--forest)" : "var(--ink-muted)", fontSize: 13, fontWeight: evSettings.travelerType === type ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                  {AI_TRAVELER_MAP[type].emoji} {type}
                </button>
              ))}
            </div>
          </div>

          {/* Priorities */}
          <div>
            <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-muted)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Trip priorities</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { id: "speed", label: "Fastest charging" },
                { id: "avoid_queues", label: "Avoid queues" },
                { id: "amenities", label: "Best amenities" },
              ].map(p => {
                const sel = evSettings.priorities.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePriority(p.id)} style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${sel ? "var(--forest)" : "var(--border)"}`, background: sel ? "var(--forest-pale)" : "#fff", color: sel ? "var(--forest)" : "var(--ink-muted)", fontSize: 13, fontWeight: sel ? 600 : 400, cursor: "pointer", transition: "all 0.15s" }}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={handleSaveSettings} className="btn-primary" style={{ marginTop: 4 }}>
            {settingsSaved ? "Saved!" : "Save settings"}
          </button>
        </div>
      </div>

      {/* My Submissions */}
      {mySubmissions.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Libre Baskerville',serif", marginBottom: 14 }}>My Contributions ({mySubmissions.length})</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mySubmissions.map(exp => (
              <ExperienceCard key={exp.id} exp={exp} chargeDuration={40} showStation />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

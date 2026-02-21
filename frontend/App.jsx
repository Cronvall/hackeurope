import { useState, useEffect, useCallback } from "react";
import GlobalStyles from "./components/GlobalStyles";
import BottomNav from "./components/BottomNav";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import AIPage from "./pages/AIPage";
import ProfilePage from "./pages/ProfilePage";
import { SEED_EXPERIENCES } from "./data/experiences";
import { loadSubmissions, saveSubmissions, loadSession } from "./utils/storage";
import Icons from "./components/Icons";

export default function App() {
  const [activePage, setActivePage] = useState("home");
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  // Load session + submissions on mount
  useEffect(() => {
    loadSession().then(s => { if (s) setUser(s); });
    loadSubmissions().then(s => setSubmissions(s));
  }, []);

  const allExperiences = [...SEED_EXPERIENCES, ...submissions];

  const handleVote = useCallback(async (id, newCount) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, votes: newCount } : s));
  }, []);

  const handleSubmit = async (submission) => {
    const updated = [...submissions, submission];
    setSubmissions(updated);
    await saveSubmissions(updated);
  };

  const handleLogin = (session) => {
    setUser(session);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleRequestAuth = () => {
    setActivePage("profile");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <GlobalStyles />

      {/* App Header */}
      <header style={{ background: "var(--forest)", color: "#fff", padding: "0 20px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--electric)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icons.Zap size={16} color="var(--forest)" />
            </div>
            <div>
              <div style={{ fontFamily: "'Libre Baskerville',serif", fontWeight: 700, fontSize: 15 }}>RouteVolt</div>
              <div style={{ fontSize: 9, opacity: 0.6, fontFamily: "'JetBrains Mono',monospace" }}>AI Trip Planning · Community</div>
            </div>
          </div>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "4px 10px" }}>
              <Icons.User size={14} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.9 }}>{user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* Page Content */}
      <main style={{ paddingBottom: 60 }}>
        {activePage === "home" && (
          <HomePage onSelectStation={(station) => { setSelectedStation(station); setActivePage("explore"); }} />
        )}
        {activePage === "explore" && (
          <ExplorePage
            selectedStation={selectedStation}
            onChangeStation={setSelectedStation}
            allExperiences={allExperiences}
            onVote={handleVote}
          />
        )}
        {activePage === "ai" && (
          <AIPage user={user} />
        )}
        {activePage === "profile" && (
          <ProfilePage
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav active={activePage} onChange={setActivePage} />
    </div>
  );
}

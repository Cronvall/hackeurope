import Icons from "./Icons";

const TABS = [
  { id: "home", label: "Route", Icon: Icons.Car },
  { id: "explore", label: "Explore", Icon: Icons.Compass },
  { id: "ai", label: "AI", Icon: Icons.Bot },
  { id: "profile", label: "Profile", Icon: Icons.User },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "#fff",
      borderTop: "1px solid var(--border)",
      display: "flex",
      zIndex: 200,
      boxShadow: "0 -2px 12px rgba(26,24,20,0.06)",
    }}>
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "10px 0 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isActive ? "var(--forest)" : "var(--ink-muted)",
              transition: "color 0.15s",
            }}
          >
            <tab.Icon size={22} color={isActive ? "var(--forest)" : "var(--ink-muted)"} />
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 700 : 500,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.02em",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

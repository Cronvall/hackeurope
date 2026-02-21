export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=JetBrains+Mono:wght@300;400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :root {
        --cream: #f5f1eb; --cream-dark: #ede8e0; --paper: #faf8f4;
        --ink: #1a1814; --ink-light: #4a4540; --ink-muted: #8a8278;
        --forest: #1e5c2e; --forest-light: #2d7a3e; --forest-pale: #e8f4eb;
        --electric: #d4f020; --amber: #e8a020; --amber-pale: #fdf3e0;
        --blue: #1a4a8c; --blue-pale: #e8f0fc; --red: #c02828; --red-pale: #fdeaea;
        --purple: #6b21a8; --purple-pale: #f3e8ff;
        --teal: #0f766e; --teal-pale: #ccfbf1;
        --border: #d8d0c4;
        --shadow-sm: 0 1px 3px rgba(26,24,20,0.08);
        --shadow-md: 0 4px 16px rgba(26,24,20,0.1);
        --shadow-lg: 0 12px 40px rgba(26,24,20,0.15);
      }
      body { background: var(--cream); color: var(--ink); font-family: 'Outfit', sans-serif; }
      ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: var(--cream-dark); }
      ::-webkit-scrollbar-thumb { background: var(--ink-muted); border-radius: 3px; }
      @keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } }
      .hover-lift { transition: transform 0.18s, box-shadow 0.18s; }
      .hover-lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
      .btn-primary { background: var(--forest); color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 600; font-family: 'Outfit', sans-serif; cursor: pointer; transition: background 0.15s; }
      .btn-primary:hover { background: var(--forest-light); }
      .btn-secondary { background: #fff; color: var(--ink); border: 1px solid var(--border); border-radius: 8px; padding: 9px 18px; font-size: 13px; font-family: 'Outfit', sans-serif; cursor: pointer; transition: border-color 0.15s; }
      .btn-secondary:hover { border-color: var(--forest); color: var(--forest); }
      input[type=text], input[type=url], input[type=password], textarea, select { font-family: 'Outfit', sans-serif; }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--forest); outline-offset: 1px; }
      select { appearance: none; }
    `}</style>
  );
}

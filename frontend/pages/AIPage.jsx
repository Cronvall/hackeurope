import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AI_EV_MODELS } from "../data/evModels";
import { AI_TRAVELER_MAP } from "../data/travelerTypes";
import { AGENT_PROMPTS } from "../data/agentPrompts";
import { planTrip, parseUserIntent, generateAISummary } from "../utils/tripPlanner";
import { loadEvSettings } from "../utils/storage";
import Icons from "../components/Icons";
import { CongestionBadge, QuickChips } from "../components/SmallComponents";

// ── Trip Plan Card ──
function TripPlanCard({ plan, tripParams }) {
  if (!plan || !plan.stops || plan.stops.length === 0) return null;
  return (
    <div style={{
      background: "#fff", border: "2px solid var(--forest)",
      borderRadius: 16, padding: 20, marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: "var(--forest)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icons.Navigation size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ color: "var(--ink)", fontSize: 16, fontWeight: 700, margin: 0 }}>Your Optimized Route</h3>
          <p style={{ color: "var(--ink-muted)", fontSize: 12, margin: 0 }}>
            Stockholm → Gothenburg · {plan.totalDistance}km · {plan.stops.length} charging stop{plan.stops.length > 1 ? "s" : ""}
            {plan.arrivalEstimate && ` · ETA ${plan.arrivalEstimate}`}
          </p>
        </div>
      </div>

      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--forest)", position: "absolute", left: 0 }} />
          <div>
            <span style={{ color: "var(--forest)", fontSize: 13, fontWeight: 600 }}>Stockholm</span>
            <span style={{ color: "var(--ink-muted)", fontSize: 12, marginLeft: 8 }}>
              {tripParams?.departure || "Departure"} · {tripParams?.soc || 90}% battery
            </span>
          </div>
        </div>

        {plan.stops.map((stop, i) => (
          <div key={stop.id} style={{ marginBottom: 20, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: -20, width: 2, background: "var(--border)", marginLeft: 5 }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--forest)", position: "absolute", left: 0 }} />
            <div style={{ paddingLeft: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--ink)", fontSize: 14, fontWeight: 600 }}>{stop.name}</span>
                <CongestionBadge level={stop.congestionLevel} />
              </div>
              <p style={{ color: "var(--ink-muted)", fontSize: 12, margin: "4px 0 0" }}>
                {stop.km_from_start}km · {stop.max_kw}kW · ~25 min charge
              </p>
              {stop.community_tips.length > 0 && (
                <p style={{ color: "var(--purple)", fontSize: 12, margin: "4px 0 0", fontStyle: "italic" }}>
                  {stop.community_tips.sort((a, b) => b.votes - a.votes)[0].text.slice(0, 80)}...
                </p>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--red)", position: "absolute", left: 0 }} />
          <div style={{ paddingLeft: 20 }}>
            <span style={{ color: "var(--red)", fontSize: 13, fontWeight: 600 }}>Gothenburg</span>
            <span style={{ color: "var(--ink-muted)", fontSize: 12, marginLeft: 8 }}>
              {plan.arrivalEstimate ? `ETA ${plan.arrivalEstimate}` : "~4.5-5h total"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AI Page ──
export default function AIPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [tripParams, setTripParams] = useState({});
  const [tripPlan, setTripPlan] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const initializedRef = useRef(false);

  // Initialize with greeting + pre-fill from saved settings
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = loadEvSettings();
    const initParams = {};

    if (saved?.model) initParams.ev = saved.model;
    if (saved?.soc) initParams.soc = saved.soc;
    if (saved?.travelerType) initParams.travelerType = saved.travelerType;
    if (saved?.priorities?.length > 0) initParams.priorities = saved.priorities;

    setTripParams(initParams);

    // Build initial messages
    const msgs = [];
    if (Object.keys(initParams).length > 0) {
      let prefillNote = "I've loaded your saved settings: ";
      const parts = [];
      if (initParams.ev) parts.push(initParams.ev);
      if (initParams.soc) parts.push(`${initParams.soc}% battery`);
      if (initParams.travelerType) parts.push(`${initParams.travelerType} trip`);
      if (initParams.priorities?.length) parts.push(`priorities: ${initParams.priorities.join(", ")}`);
      prefillNote += parts.join(", ") + ".";

      // Find next question
      const next = getNextQuestionStatic(initParams);
      if (next) {
        msgs.push({ role: "agent", content: `Hey! ${prefillNote}\n\n${next.content}`, chips: next.chips });
      } else {
        msgs.push({ role: "agent", content: `Hey! ${prefillNote} You're all set — let me plan your route!`, chips: [] });
      }
    } else {
      msgs.push({ role: "agent", content: AGENT_PROMPTS.greeting, chips: AI_EV_MODELS.slice(0, 6).map(ev => ev.name) });
    }
    setMessages(msgs);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const processMessage = useCallback((text) => {
    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      const newParams = { ...tripParams };
      const intent = parseUserIntent(text);

      switch (intent.type) {
        case "ev_model": newParams.ev = intent.value; break;
        case "soc": newParams.soc = intent.value; break;
        case "traveler": newParams.travelerType = intent.value; break;
        case "day": newParams.travelDay = intent.value; break;
        case "priorities": newParams.priorities = intent.value; break;
        case "departure": newParams.departure = intent.value; break;
        case "multi": Object.assign(newParams, intent.value); break;
        default: break;
      }

      setTripParams(newParams);

      const next = getNextQuestionStatic(newParams);
      if (next) {
        let ack = "";
        if (intent.type === "ev_model") ack = `Got it — ${intent.value}! `;
        else if (intent.type === "soc") ack = `${intent.value}% battery, noted. `;
        else if (intent.type === "traveler") ack = `${AI_TRAVELER_MAP[intent.value]?.emoji || ""} ${intent.value} trip — I'll tailor recommendations for that. `;
        else if (intent.type === "day") ack = `${intent.value === "holiday" ? "Holiday travel" : intent.value === "weekend" ? "Weekend" : "Weekday"} — I'll factor in congestion patterns. `;
        else if (intent.type === "priorities") ack = `Priorities set! `;
        else if (intent.type === "departure") ack = `Departing at ${intent.value}. `;

        setMessages(prev => [...prev, { role: "agent", content: ack + next.content, chips: next.chips }]);
      } else {
        const plan = planTrip(newParams);
        setTripPlan(plan);

        const stopNames = plan.stops.map(s => s.name).join(" → ");
        const congestionWarnings = plan.stops.filter(s => s.congestionLevel === "high" || s.congestionLevel === "extreme").map(s => s.name);

        let narrative = `Here's your optimized route!\n\n`;
        narrative += `**${newParams.ev}** at ${newParams.soc}% · ${newParams.travelerType} trip · ${newParams.travelDay}\n\n`;
        narrative += `**Route:** Stockholm → ${stopNames} → Gothenburg\n`;
        narrative += `**Estimated arrival:** ${plan.arrivalEstimate || "~4.5-5h"}\n\n`;

        if (congestionWarnings.length > 0) {
          narrative += `**Congestion alert:** ${congestionWarnings.join(", ")} may be busy. I've already optimized around the worst spots.\n\n`;
        }

        plan.stops.forEach((stop, i) => {
          narrative += `**Stop ${i + 1}: ${stop.name}** (${stop.km_from_start}km)\n`;
          narrative += `${stop.max_kw}kW · ${stop.congestionLevel} traffic · ${stop.rating}\n`;
          const topTip = stop.community_tips.sort((a, b) => b.votes - a.votes)[0];
          if (topTip) narrative += `"${topTip.text}"\n`;
          narrative += `\n`;
        });

        narrative += `Want me to adjust anything? You can say things like "avoid Jönköping" or "add a lunch stop" or "what if I leave at 15:00 instead?"`;

        setMessages(prev => [...prev, { role: "agent", content: narrative, plan: plan, chips: ["Show all stations", "Alternative route", "More details on stops"] }]);
      }

      setIsThinking(false);
    }, 800 + Math.random() * 600);
  }, [tripParams]);

  const handleSend = () => {
    if (!input.trim()) return;
    processMessage(input.trim());
    setInput("");
  };

  const handleChipClick = (value) => {
    processMessage(value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 520, margin: "0 auto", width: "100%" }}>
      {/* Chat header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icons.Bot size={18} color="#fff" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Libre Baskerville',serif" }}>RouteVolt AI Agent</h3>
            <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: 0, fontFamily: "'JetBrains Mono',monospace" }}>Stockholm → Gothenburg · Community intelligence</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 8px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 16, display: "flex", flexDirection: "column",
            alignItems: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            {msg.role === "agent" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8,
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icons.Bot size={13} color="#fff" />
                </div>
                <span style={{ color: "var(--ink-muted)", fontSize: 11, fontWeight: 600 }}>RouteVolt Agent</span>
              </div>
            )}
            <div style={{
              background: msg.role === "user" ? "var(--forest)" : "var(--paper)",
              color: msg.role === "user" ? "#fff" : "var(--ink)",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              padding: "12px 16px", maxWidth: "88%",
              border: msg.role === "agent" ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {msg.content.split(/(\*\*.*?\*\*)/).map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </div>
            </div>
            {msg.plan && <div style={{ marginTop: 12, width: "100%" }}><TripPlanCard plan={msg.plan} tripParams={tripParams} /></div>}
            {msg.chips && msg.role === "agent" && (
              <QuickChips options={msg.chips} onSelect={handleChipClick} />
            )}
          </div>
        ))}
        {isThinking && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
            <div style={{
              width: 24, height: 24, borderRadius: 8,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icons.Bot size={13} color="#fff" />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: 4,
                  background: "var(--forest)",
                  animation: `pulse 1.2s infinite ${i * 0.2}s`,
                  opacity: 0.4,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px 72px", borderTop: "1px solid var(--border)", background: "#fff" }}>
        <div style={{
          display: "flex", gap: 8,
          background: "var(--cream)", borderRadius: 14,
          border: "1px solid var(--border)",
          padding: "4px 4px 4px 16px", alignItems: "center",
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Tell me about your trip..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--ink)", fontSize: 14, padding: "8px 0", fontFamily: "'Outfit',sans-serif" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: input.trim() ? "var(--forest)" : "var(--cream-dark)",
              border: "none", cursor: input.trim() ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            <Icons.Send size={16} color={input.trim() ? "#fff" : "var(--ink-muted)"} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Static version of getNextQuestion (no hook deps)
function getNextQuestionStatic(params) {
  if (!params.ev) return { content: AGENT_PROMPTS.greeting, chips: AI_EV_MODELS.slice(0, 6).map(ev => ev.name) };
  if (!params.soc) return { content: AGENT_PROMPTS.askSoc(params.ev), chips: ["100%", "90%", "80%", "70%", "50%"] };
  if (!params.travelerType) return {
    content: AGENT_PROMPTS.askTraveler,
    chips: Object.keys(AI_TRAVELER_MAP).map(t => ({ label: `${AI_TRAVELER_MAP[t].emoji} ${t}`, value: t })),
  };
  if (!params.travelDay) return {
    content: AGENT_PROMPTS.askDay,
    chips: [
      { label: "Holiday (Midsommar, etc)", value: "holiday" },
      { label: "Weekend", value: "weekend" },
      { label: "Weekday", value: "weekday" },
    ],
  };
  if (!params.priorities || params.priorities.length === 0) return {
    content: AGENT_PROMPTS.askPriorities,
    chips: [
      { label: "Fastest charging", value: "speed" },
      { label: "Avoid queues", value: "avoid_queues" },
      { label: "Best amenities", value: "amenities" },
    ],
  };
  if (!params.departure) return {
    content: AGENT_PROMPTS.askDeparture,
    chips: [
      { label: "07:00 — Early bird", value: "07:00" },
      { label: "09:00 — Morning", value: "09:00" },
      { label: "12:00 — Noon", value: "12:00" },
      { label: "15:00 — Afternoon", value: "15:00" },
    ],
  };
  return null;
}

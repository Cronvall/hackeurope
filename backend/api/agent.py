"""
Claude agent — pre-orchestration architecture.

Per user turn:
  1. Haiku call  — classify intent; for plain chat, also generates the reply.
  2a. trip_plan  — Python gathers all Chargetrip data in parallel (no Claude),
                   then ONE Sonnet call synthesises 3 routes.
  2b. chat       — Haiku reply already done in step 1. Nothing else needed.

When the destination is within single-charge range (0 charge stops),
step 2a is skipped entirely and a direct response is returned instantly.

Total Claude API calls:
  Chat message      : 1  (Haiku)
  Trip (needs charge): 2  (Haiku intent + Sonnet synthesis)
  Trip (in range)    : 1  (Haiku intent only)
"""

import copy
import json
import logging
import os
import time
from collections.abc import AsyncGenerator
from pathlib import Path

import anthropic
from dotenv import load_dotenv

from .orchestrator import gather_trip_data

load_dotenv()

log = logging.getLogger("agent")

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

_PROFILE_PATH = Path(__file__).parent / "profile.json"
_PROFILE = json.loads(_PROFILE_PATH.read_text())

# In-memory conversation store: conversation_id -> list of lean message dicts
_conversations: dict[str, list[dict]] = {}

# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

_INTENT_SYSTEM = """\
You are an intent classifier for an EV trip planner app.

If the user wants to plan a route / go somewhere, output ONLY this JSON:
{"type": "trip_plan", "destination_name": "<city>", "destination_coordinates": [<lon>, <lat>]}

Otherwise (questions, greetings, follow-ups, chat without a new destination),
respond as a warm, concise EV trip planner assistant AND wrap your reply in:
{"type": "chat", "response": "<your reply here>"}

Always output valid JSON only. No markdown fences, no extra text outside the JSON."""

_SYNTHESIS_SYSTEM = f"""\
You are an AI-powered EV trip planner. Call submit_routes exactly once with 3 route
alternatives synthesised from the pre-gathered trip data provided by the user message.

## User Profile
{json.dumps(_PROFILE, indent=2)}

## Routes to compose
- Route A (id="A"): Fastest    — highest-power charger, minimum detour
- Route B (id="B"): Personalised — best match for user history/preferences (recommended=true)
- Route C (id="C"): Scenic      — interesting stop, extra amenity, or added character

## Rules
- total_duration_min / total_distance_km: use values from Chargetrip base_route data.
- power_kw: read max_electric_power from connector data; if > 1000 divide by 1000 (it's in W).
- charge_time_min: use chargeTime from the matching route leg (value is in seconds; divide by 60).
- coordinates: [longitude, latitude] from station data.
- polyline: use base_route polyline if available, otherwise empty string.
- Include a short warm message (1-2 sentences) in the `message` field.\
"""

_SUBMIT_ROUTES_TOOL = {
    "name": "submit_routes",
    "description": (
        "Submit exactly 3 route alternatives (A=fastest, B=personalised, C=scenic) "
        "plus a short chat message to the user. Call this exactly once."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Short warm chat message introducing the routes (1-2 sentences).",
            },
            "routes": {
                "type": "array",
                "description": "Exactly 3 route alternatives.",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "'A', 'B', or 'C'"},
                        "label": {"type": "string", "description": "Short label, e.g. 'Fastest'"},
                        "badge_emoji": {"type": "string", "description": "Emoji badge(s), e.g. '⚡' or '☕🛍️'"},
                        "recommended": {"type": "boolean"},
                        "total_duration_min": {"type": "integer"},
                        "total_distance_km": {"type": "number"},
                        "stops": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "emoji": {"type": "string"},
                                    "charge_time_min": {"type": "integer"},
                                    "power_kw": {"type": "number"},
                                    "amenities": {"type": "array", "items": {"type": "string"}},
                                    "coordinates": {"type": "array", "items": {"type": "number"}},
                                },
                                "required": ["name", "emoji", "charge_time_min", "power_kw", "amenities", "coordinates"],
                            },
                        },
                        "polyline": {"type": "string"},
                    },
                    "required": ["id", "label", "badge_emoji", "recommended",
                                 "total_duration_min", "total_distance_km", "stops", "polyline"],
                },
            },
        },
        "required": ["message", "routes"],
    },
}

# ---------------------------------------------------------------------------
# Conversation history
# ---------------------------------------------------------------------------


def get_history(conversation_id: str) -> list[dict]:
    return _conversations.setdefault(conversation_id, [])


def clear_history(conversation_id: str) -> None:
    _conversations.pop(conversation_id, None)


# ---------------------------------------------------------------------------
# Step 1 — Intent classification (Haiku, always fast + cheap)
# ---------------------------------------------------------------------------


def _classify(user_message: str, history: list[dict]) -> dict:
    """
    Returns one of:
      {"type": "trip_plan", "destination_name": str, "destination_coordinates": [lon, lat]}
      {"type": "chat", "response": str}
    """
    log.info("[1/3] INTENT  Haiku classifying: %r", user_message)
    t0 = time.perf_counter()
    messages = list(history[-6:]) + [{"role": "user", "content": user_message}]
    resp = _client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        system=_INTENT_SYSTEM,
        messages=messages,
    )
    raw = resp.content[0].text.strip()
    log.debug("[1/3] INTENT  raw response: %s", raw)
    try:
        # Strip markdown fences if the model wrapped its JSON anyway
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        elapsed = time.perf_counter() - t0
        log.info("[1/3] INTENT  → type=%s  (%.1fs, in=%d out=%d tokens)",
                 result.get("type"), elapsed,
                 resp.usage.input_tokens, resp.usage.output_tokens)
        if result.get("type") == "trip_plan":
            log.info("[1/3] INTENT  → destination=%r  coords=%s",
                     result.get("destination_name"), result.get("destination_coordinates"))
        return result
    except Exception as exc:
        log.warning("[1/3] INTENT  JSON parse failed (%s) — falling back to chat. Raw: %s", exc, raw)
        return {"type": "chat", "response": "How can I help with your trip today?"}


# ---------------------------------------------------------------------------
# No-charge shortcut — destination within single-charge range
# ---------------------------------------------------------------------------


def _no_charge_response(
    trip_data: dict, origin: dict, destination: dict
) -> tuple[str, list[dict]]:
    """Build an instant response when 0 charging stops are needed."""
    br = trip_data["base_route"]
    dist_km = round((br.get("distance") or 0) / 1000)
    dur_min = round((br.get("duration") or 0) / 60)
    hours = dur_min // 60
    mins = dur_min % 60
    dur_str = f"{hours}h {mins}min" if hours else f"{mins} min"
    soc_start = br.get("rangeStartPercentage", "?")
    soc_end = br.get("rangeEndPercentage", "?")
    vehicle = _PROFILE["vehicle"]["display"]
    polyline = br.get("polyline") or ""

    message = (
        f"Great news — your {vehicle} can make it from {origin['name']} to "
        f"{destination['name']} on a single charge! {dist_km} km, ~{dur_str}. "
        f"You'll arrive with about {soc_end}% battery. Enjoy the drive!"
    )
    route = {
        "id": "A",
        "label": "Direct",
        "badge_emoji": "⚡",
        "recommended": True,
        "total_duration_min": dur_min,
        "total_distance_km": dist_km,
        "stops": [],
        "polyline": polyline,
    }
    log.info("NO-CHARGE shortcut  %s → %s  %dkm  %s  soc %s→%s%%",
             origin["name"], destination["name"], dist_km, dur_str,
             soc_start, soc_end)
    return message, [route]


# ---------------------------------------------------------------------------
# Step 2 (trip) — Single Sonnet synthesis call
# ---------------------------------------------------------------------------


def _trim_trip_data(trip_data: dict) -> dict:
    """Return a copy of trip_data with heavy fields stripped for the LLM prompt."""
    td = copy.deepcopy(trip_data)
    br = td.get("base_route") or {}
    br.pop("polyline", None)
    for leg in br.get("legs") or []:
        for key in ("origin", "destination"):
            geo = leg.get(key)
            if isinstance(geo, dict):
                geo.pop("properties", None)
    return td


def _synthesize(trip_data: dict, user_message: str) -> tuple[str, list[dict] | None]:
    """
    Passes all pre-gathered data to Sonnet in one call.
    Returns (chat_message, routes_list).
    """
    n_stops = len(trip_data.get("charge_stops", []))
    n_candidates = len(trip_data.get("candidate_amenities", {}))
    log.info("[3/3] SYNTHESIZE  Sonnet call  (charge_stops=%d, candidate_stations=%d)",
             n_stops, n_candidates)
    t0 = time.perf_counter()

    trimmed = _trim_trip_data(trip_data)
    prompt = (
        f"User request: {user_message}\n\n"
        f"## Pre-gathered trip data\n"
        f"{json.dumps(trimmed, indent=2, default=str)}"
    )
    resp = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        system=_SYNTHESIS_SYSTEM,
        tools=[_SUBMIT_ROUTES_TOOL],
        tool_choice={"type": "tool", "name": "submit_routes"},
        messages=[{"role": "user", "content": prompt}],
    )
    elapsed = time.perf_counter() - t0
    log.info("[3/3] SYNTHESIZE  done (%.1fs, in=%d out=%d tokens)",
             elapsed, resp.usage.input_tokens, resp.usage.output_tokens)

    for block in resp.content:
        if block.type == "tool_use" and block.name == "submit_routes":
            routes = block.input.get("routes") or []
            log.info("[3/3] SYNTHESIZE  submit_routes called with %d routes: %s",
                     len(routes), [r.get("id") for r in routes])
            return block.input.get("message", "Here are your routes!"), routes

    log.error("[3/3] SYNTHESIZE  submit_routes was NOT called — no routes returned")
    return "I had trouble planning those routes — please try again.", None


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


async def run_agent(conversation_id: str, user_message: str) -> tuple[str, list[dict] | None]:
    """
    Run one agent turn. Returns (message_text, routes_or_None).
    """
    t_total = time.perf_counter()
    log.info("── NEW TURN  conversation=%s ──────────────────────────", conversation_id)
    history = get_history(conversation_id)

    # --- Step 1: classify (Haiku) ---
    intent = _classify(user_message, history)

    if intent.get("type") != "trip_plan":
        text = intent.get("response") or "How can I help with your trip today?"
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        log.info("── DONE (chat, %.1fs) ─────────────────────────────────", time.perf_counter() - t_total)
        return text, None

    # Validate that Haiku gave us usable coordinates
    coords = intent.get("destination_coordinates")
    if not coords or len(coords) < 2:
        log.warning("INTENT  missing/bad coordinates for %r", intent.get("destination_name"))
        text = f"I couldn't locate {intent.get('destination_name', 'that destination')}. Could you be more specific?"
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        return text, None

    # --- Step 2a: resolve origin/vehicle from profile ---
    origin = {"coordinates": _PROFILE["home"]["coordinates"], "name": _PROFILE["home"]["name"]}
    destination = {"coordinates": coords, "name": intent["destination_name"]}
    vehicle_id = _PROFILE["vehicle"]["chargetrip_id"]
    user_prefs = _PROFILE.get("preferences", {}).get("amenities", [])

    log.info("TRIP  %s → %s  vehicle=%s  prefs=%s",
             origin["name"], destination["name"], vehicle_id, user_prefs)

    # --- Step 2b: gather all data in parallel (Python, zero Claude calls) ---
    try:
        trip_data = await gather_trip_data(vehicle_id, origin, destination, user_prefs)
    except (RuntimeError, TimeoutError) as exc:
        log.warning("ROUTE FAILED  %s → %s: %s", origin["name"], destination["name"], exc)
        text = (
            f"I wasn't able to plan a route from {origin['name']} to "
            f"{destination['name']}. This can happen if the route is too long, "
            f"crosses unsupported regions, or has no EV charging coverage along "
            f"the way. Could you try a different destination?"
        )
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        log.info("── DONE (trip/failed, %.1fs) ──────────────────────────────",
                 time.perf_counter() - t_total)
        return text, None

    # --- Shortcut: no charging needed → skip Sonnet entirely ---
    charge_stops = trip_data.get("charge_stops") or []
    if not charge_stops:
        text, routes = _no_charge_response(trip_data, origin, destination)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        log.info("── DONE (trip/no-charge, %.1fs total) ─────────────────────",
                 time.perf_counter() - t_total)
        return text, routes

    # --- Step 2c: synthesise (ONE Sonnet call) ---
    text, routes = _synthesize(trip_data, user_message)

    # Store only the lean chat exchange in history — not the full trip blob
    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": text})

    log.info("── DONE (trip, %.1fs total) ───────────────────────────────", time.perf_counter() - t_total)
    return text, routes


# ---------------------------------------------------------------------------
# Streaming public entry point (SSE)
# ---------------------------------------------------------------------------


async def run_agent_stream(
    conversation_id: str, user_message: str
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Async generator that yields (event_type, payload) tuples.

    Event types: status, message, routes, done, error
    """
    t_total = time.perf_counter()
    log.info("── NEW TURN (stream)  conversation=%s ──────────────────", conversation_id)
    history = get_history(conversation_id)

    # --- Step 1: classify ---
    yield ("status", {"step": "intent", "message": "Understanding your request…"})
    intent = _classify(user_message, history)

    if intent.get("type") != "trip_plan":
        text = intent.get("response") or "How can I help with your trip today?"
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        yield ("message", {"delta": text})
        yield ("done", {"conversation_id": conversation_id})
        log.info("── DONE stream/chat  %.1fs ──────────────────────────────",
                 time.perf_counter() - t_total)
        return

    coords = intent.get("destination_coordinates")
    if not coords or len(coords) < 2:
        text = f"I couldn't locate {intent.get('destination_name', 'that destination')}. Could you be more specific?"
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        yield ("message", {"delta": text})
        yield ("done", {"conversation_id": conversation_id})
        return

    origin = {"coordinates": _PROFILE["home"]["coordinates"], "name": _PROFILE["home"]["name"]}
    destination = {"coordinates": coords, "name": intent["destination_name"]}
    vehicle_id = _PROFILE["vehicle"]["chargetrip_id"]
    user_prefs = _PROFILE.get("preferences", {}).get("amenities", [])

    # --- Step 2: route planning ---
    yield ("status", {
        "step": "routing",
        "message": f"Planning route {origin['name']} → {destination['name']}…",
    })
    try:
        trip_data = await gather_trip_data(vehicle_id, origin, destination, user_prefs)
    except (RuntimeError, TimeoutError) as exc:
        log.warning("ROUTE FAILED (stream)  %s → %s: %s",
                    origin["name"], destination["name"], exc)
        text = (
            f"I wasn't able to plan a route from {origin['name']} to "
            f"{destination['name']}. This can happen if the route is too long, "
            f"crosses unsupported regions, or has no EV charging coverage along "
            f"the way. Could you try a different destination?"
        )
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        yield ("message", {"delta": text})
        yield ("done", {"conversation_id": conversation_id})
        return

    # --- No-charge shortcut ---
    charge_stops = trip_data.get("charge_stops") or []
    if not charge_stops:
        text, routes = _no_charge_response(trip_data, origin, destination)
        history.append({"role": "user", "content": user_message})
        history.append({"role": "assistant", "content": text})
        yield ("message", {"delta": text})
        yield ("routes", {"routes": routes})
        yield ("done", {"conversation_id": conversation_id})
        log.info("── DONE stream/no-charge  %.1fs ─────────────────────────",
                 time.perf_counter() - t_total)
        return

    # --- Step 3: Sonnet synthesis (streamed) ---
    yield ("status", {
        "step": "synthesizing",
        "message": "Crafting route alternatives…",
    })

    trimmed = _trim_trip_data(trip_data)
    prompt = (
        f"User request: {user_message}\n\n"
        f"## Pre-gathered trip data\n"
        f"{json.dumps(trimmed, indent=2, default=str)}"
    )
    polyline = (trip_data.get("base_route") or {}).get("polyline") or ""

    t0 = time.perf_counter()
    log.info("[3/3] SYNTHESIZE (stream)  starting Sonnet call …")

    collected_json = ""
    with _client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        system=_SYNTHESIS_SYSTEM,
        tools=[_SUBMIT_ROUTES_TOOL],
        tool_choice={"type": "tool", "name": "submit_routes"},
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for event in stream:
            if hasattr(event, "type") and event.type == "content_block_delta":
                delta = getattr(event, "delta", None)
                if delta and getattr(delta, "type", None) == "input_json_delta":
                    collected_json += delta.partial_json

    elapsed = time.perf_counter() - t0
    log.info("[3/3] SYNTHESIZE (stream)  done (%.1fs)", elapsed)

    text = "Here are your routes!"
    routes = None
    try:
        parsed = json.loads(collected_json)
        text = parsed.get("message", text)
        routes = parsed.get("routes") or []
        for r in routes:
            if not r.get("polyline"):
                r["polyline"] = polyline
        log.info("[3/3] SYNTHESIZE (stream)  got %d routes: %s",
                 len(routes), [r.get("id") for r in routes])
    except json.JSONDecodeError as exc:
        log.error("[3/3] SYNTHESIZE (stream)  JSON parse failed: %s", exc)
        yield ("error", {"detail": "Failed to parse route data — please try again."})
        return

    history.append({"role": "user", "content": user_message})
    history.append({"role": "assistant", "content": text})

    yield ("message", {"delta": text})
    yield ("routes", {"routes": routes})
    yield ("done", {"conversation_id": conversation_id})
    log.info("── DONE stream/trip  %.1fs total ────────────────────────────",
             time.perf_counter() - t_total)

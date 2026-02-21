# EV Trip Routing Agent — Architecture

## Project Overview

An AI-powered EV trip planner that converses with the user, plans routes with charging stops, and personalizes stop recommendations based on user preferences (e.g. cafés over fast-food). Presented as a phone-format web app for hackathon demo.

The backend API wrapper lives in `chargetrip_experiment/` and exposes vehicle lookup, station search, amenity discovery, operator listing, and route planning via the Chargetrip GraphQL API.

---

## User Journey

1. **Chat** — User opens the app and talks to the agent: _"I want to go to Gothenburg"_
2. **Plan** — Agent resolves context (user profile: vehicle, home, preferences), calls route + station + amenity APIs, builds **3 route alternatives (A/B/C)**
3. **Pick** — User sees routes as swipeable cards (flight-layover style) with emoji-badged stops, picks one
4. **Navigate** — Selected route displays on map with stop details; chat stays available for adjustments

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM / Orchestrator | Anthropic Claude API (tool use) |
| Backend | Python — wraps Chargetrip API (`chargetrip_experiment/`) |
| Frontend | React / Next.js — phone viewport |
| Map | Mapbox or Leaflet (render polylines + stop markers) |

---

## User Profile Schema

Stored per user (hardcoded for hackathon demo). The `history` array trains the agent's personalization over time.

```json
{
  "name": "Oscar",
  "vehicle": {
    "display": "VW ID.3",
    "chargetrip_id": "5f043da2bc262f1627fc0333"
  },
  "home": {
    "coordinates": [18.0686, 59.3293],
    "name": "Stockholm"
  },
  "preferences": {
    "amenities": ["coffee", "restaurant"],
    "speed_tolerance": "relaxed",
    "connector_preferred": "IEC_62196_T2_COMBO"
  },
  "history": [
    {
      "trip": "Stockholm → Gothenburg",
      "date": "2025-01-15",
      "chosen_route": "B",
      "stops_chosen": [
        { "type": "coffee", "station": "Jönköping Espresso House", "over": "Shell Recharge Highway" }
      ]
    },
    {
      "trip": "Stockholm → Malmö",
      "date": "2025-02-01",
      "chosen_route": "A",
      "stops_chosen": [
        { "type": "fastest", "station": "Ionity Linköping", "over": "Café stop +12min" }
      ]
    }
  ]
}
```

---

## Agent Tool Definitions

These are the tools exposed to the Claude API via tool use. Each maps to a function in `chargetrip_experiment/`.

| Tool | Maps to | When the agent calls it |
|------|---------|------------------------|
| `lookup_vehicle` | `client.py` → `vehicleList` | Resolve user's car model to a Chargetrip vehicle ID |
| `plan_route` | `routes.py` → `create_and_wait(vehicle_id, origin, destination, via?)` | User states a destination |
| `find_stations_nearby` | `stations.py` → `station_around(lon, lat, distance, ...)` | Discover alternative charging stations near a route leg |
| `get_station_details` | `stations.py` → `get_station(station_id)` | Get full info (connectors, power, operator) for a station |
| `get_amenities` | `stations.py` → `amenity_list(station_id, amenity_types?)` | Check what's near a station (café, restaurant, park, etc.) |
| `list_operators` | `operators.py` → `operator_list(country?)` | Show charging network operators in a region |
| `refine_route` | `routes.py` → `create_and_wait(..., via=[waypoint])` | User picks an alternative stop → re-plan with waypoint |

### Tool Call Sequence (typical trip planning)

```
User: "I want to go to Gothenburg"

1. Agent resolves context from user profile
   → origin = Stockholm, vehicle = VW ID.3

2. plan_route(vehicle_id, Stockholm, Gothenburg)
   → base route: 1 stop near Jönköping, 4h38m

3. find_stations_nearby(Jönköping coords, radius=10000)
   → 8 candidate stations

4. get_amenities(station_id) × N stations
   → Station A: no amenities, 150kW
   → Station B: coffee 50m away, 100kW
   → Station C: shopping + restaurant, 50kW

5. Agent checks user history: Oscar picks cafés 70% of the time

6. Agent optionally explores detour:
   find_stations_nearby(Linköping coords)
   → interesting café stop, adds 12 min

7. Agent composes 3 route alternatives and responds
```

---

## Route Alternatives Model

Present routes like flight booking sites show layover options. Each route is a complete package with emoji-badged stops.

### Emoji Badge System

| Emoji | Amenity type | Meaning |
|-------|-------------|---------|
| ⚡ | _(none)_ | Fastest charger, no amenity focus |
| ☕ | `coffee` | Café nearby |
| 🍔 | `restaurant` | Restaurant nearby |
| 🛍️ | `shopping` | Shopping nearby |
| 🏨 | `hotel` | Hotel (longer trips) |
| 🌳 | `park` | Park / outdoor area |
| 💊 | `pharmacy` | Pharmacy |
| 🛝 | `playground` | Playground (family trips) |

### Example Output

```
Route A ⚡ Fastest
Stockholm → ⚡ Shell Recharge Jönköping (22 min) → Gothenburg
4h 38min  |  470 km  |  1 stop

Route B ☕ Oscar's Pick  ★
Stockholm → ☕ Espresso House Jönköping (28 min) → Gothenburg
4h 45min  |  472 km  |  1 stop

Route C ☕🛍️ Scenic
Stockholm → ☕ Barista Linköping (18 min) → 🛍️ Mall Jönköping (15 min) → Gothenburg
5h 12min  |  495 km  |  2 stops
```

`★` = recommended based on user history and preferences.

---

## Agent → Frontend Response Contract

The agent returns structured JSON alongside its chat message so the frontend can render route cards and map layers.

```json
{
  "message": "Here are three ways to get to Gothenburg! Based on your usual picks, I think you'll like Route B 😊",
  "routes": [
    {
      "id": "A",
      "label": "Fastest",
      "badge_emoji": "⚡",
      "recommended": false,
      "total_duration_min": 278,
      "total_distance_km": 470,
      "stops": [
        {
          "name": "Shell Recharge Jönköping",
          "emoji": "⚡",
          "charge_time_min": 22,
          "power_kw": 150,
          "amenities": [],
          "coordinates": [14.16, 57.78]
        }
      ],
      "polyline": "encoded_polyline_string"
    },
    {
      "id": "B",
      "label": "Oscar's Pick",
      "badge_emoji": "☕",
      "recommended": true,
      "total_duration_min": 285,
      "total_distance_km": 472,
      "stops": [
        {
          "name": "Espresso House Jönköping",
          "emoji": "☕",
          "charge_time_min": 28,
          "power_kw": 100,
          "amenities": ["coffee"],
          "coordinates": [14.17, 57.77]
        }
      ],
      "polyline": "encoded_polyline_string"
    },
    {
      "id": "C",
      "label": "Scenic",
      "badge_emoji": "☕🛍️",
      "recommended": false,
      "total_duration_min": 312,
      "total_distance_km": 495,
      "stops": [
        {
          "name": "Barista & Co Linköping",
          "emoji": "☕",
          "charge_time_min": 18,
          "power_kw": 75,
          "amenities": ["coffee"],
          "coordinates": [15.62, 58.41]
        },
        {
          "name": "A6 Center Jönköping",
          "emoji": "🛍️",
          "charge_time_min": 15,
          "power_kw": 50,
          "amenities": ["shopping"],
          "coordinates": [14.18, 57.79]
        }
      ],
      "polyline": "encoded_polyline_string"
    }
  ]
}
```

The frontend parses `routes` to render cards and map overlays. `message` goes into the chat bubble.

---

## Frontend States

Phone-format single screen with three states:

### State 1: CHAT (initial)
```
┌─────────────────────┐
│  Agent avatar + name │
│  ┌─────────────────┐│
│  │  💬 Chat area   ││
│  │  Messages       ││
│  │  Filler text    ││
│  ├─────────────────┤│
│  │  🎤 / ⌨️ Input  ││
│  └─────────────────┘│
└─────────────────────┘
```

### State 2: PICK (routes ready)
```
┌─────────────────────┐
│  🗺️ Map (compact)   │  All 3 routes overlaid
├─────────────────────┤
│  Route A ⚡  4h38m  │
│  Route B ☕★ 4h45m  │  ← Swipeable cards
│  Route C ☕🛍️ 5h12m │
├─────────────────────┤
│  [ Pick this route ] │
└─────────────────────┘
```

### State 3: NAVIGATE (route selected)
```
┌─────────────────────┐
│  🗺️ Map (full)      │  Selected route + markers
├─────────────────────┤
│  Next: ☕ 28 min     │  Compact stop card
│  💬 "Chat with me"  │  Pull-up to reopen chat
└─────────────────────┘
```

Chat is always accessible — user can pull it up to say _"Actually skip the café, I'm in a hurry"_ and the agent re-plans.

---

## Working / Loading States

While the agent chains API calls (5–15 seconds), rotate filler messages every 2–3 seconds:

```
"🔍 Finding the best route for you..."
"⚡ Checking charging stations along the way..."
"☕ Looking for your kind of stops..."
"🧮 Comparing alternatives..."
"✨ Almost ready!"
```

---

## Chargetrip API Reference (quick lookup)

All wrapper code lives in `chargetrip_experiment/`.

| Module | Function | Purpose |
|--------|----------|---------|
| `client.py` | `gql(query, variables)` | Execute any GraphQL query |
| `client.py` | `vehicleList(page, size)` | List EVs with make, model, range |
| `stations.py` | `station_around(lon, lat, distance, ...)` | Find stations by location + filters |
| `stations.py` | `get_station(station_id)` | Full station details |
| `stations.py` | `amenity_list(station_id, amenity_types?, ...)` | POIs near a station |
| `operators.py` | `operator_list(search?, country?, ...)` | List charge point operators |
| `routes.py` | `create_and_wait(vehicle_id, origin, dest, via?)` | Compute route with charging stops |

### Key filter parameters for `station_around`

| Parameter | Example | Use case |
|-----------|---------|----------|
| `speed_type` | `["fast"]`, `["turbo"]` | Show only fast/turbo chargers |
| `available_only` | `True` | Only stations with available EVSEs |
| `connector_type` | `["IEC_62196_T2_COMBO"]` | Filter by connector standard |
| `amenities` | `["coffee", "restaurant"]` | Stations near specific amenities |
| `power` | `[50.0, 150.0]` | Filter by kW range |

### Route origin/destination format

```python
{"coordinates": [lon, lat], "name": "Stockholm Centraal"}
```

### Amenity types available

`park`, `restaurant`, `museum`, `coffee`, `hotel`, `shopping`, `bathroom`, `supermarket`, `playground`, `pharmacy`

---

## Open for Extension

- **Voice input** — the chat input supports mic; speech-to-text feeds into the same agent
- **Multi-day trips** — longer routes could suggest hotel stops with overnight charging
- **Group preferences** — _"Travelling with kids"_ → prioritize playground + fast food stops
- **Real-time availability** — use `available_only` filter and refresh during navigation
- **Operator preferences** — _"I have an Ionity subscription"_ → prefer Ionity stations
- **Additional data sources** — plug in Google Places, Yelp, or other APIs for richer amenity data beyond what Chargetrip provides

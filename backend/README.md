# EV Trip Agent — Backend

FastAPI server that runs a Claude agent to plan EV routes with personalised charging stops. Wraps the Chargetrip GraphQL API for routing, station search, and amenity discovery.

---

## Setup

**Prerequisites:** Python 3.13+, [`uv`](https://docs.astral.sh/uv/)

```bash
cd backend
cp .env.example .env   # fill in your three keys (see below)
uv sync
```

**.env values:**
```
CHARGE_TRIP_PROJECT_ID=   # x-client-id on the Chargetrip project overview page
CHARGE_TRIP_APP_ID=       # x-app-id under your Chargetrip app
ANTHROPIC_API_KEY=        # sk-ant-...
```

---

## Running the server

```bash
uv run fastapi dev api/main.py
```

Server starts at **http://localhost:8000**
Interactive API docs at **http://localhost:8000/docs**

---

## Testing without a frontend

### Health check

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### User profile

```bash
curl http://localhost:8000/profile
```

Returns Oscar's hardcoded profile (vehicle, home, preferences, history).

---

### Start a trip planning conversation

```bash
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to go to Gothenburg"}' | jq
```

**Response shape:**
```json
{
  "message": "Here are three ways to get to Gothenburg! Based on your usual stops, I think you'll love Route B ☕",
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
      "polyline": "..."
    },
    { "id": "B", "recommended": true, "..." : "..." },
    { "id": "C", "..." : "..." }
  ],
  "conversation_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

`routes` is `null` for messages that don't trigger route planning (e.g. general questions).

---

### Continue a conversation (multi-turn)

Pass the `conversation_id` from the previous response to maintain context:

```bash
CONVO="3fa85f64-5717-4562-b3fc-2c963f66afa6"

curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Actually, skip the café stop — I'm in a hurry\", \"conversation_id\": \"$CONVO\"}" | jq
```

The agent replans with the updated preference. A new `routes` array is returned.

---

### Clear a conversation

```bash
curl -X DELETE http://localhost:8000/chat/$CONVO
# {"ok":true}
```

---

### Quick multi-step test script

```bash
# 1. Plan a trip
RESPONSE=$(curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to go to Malmö"}')

echo $RESPONSE | jq '.message'
echo $RESPONSE | jq '.routes | length'   # should be 3

CONVO=$(echo $RESPONSE | jq -r '.conversation_id')

# 2. Ask a follow-up
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"How long is the drive without charging?\", \"conversation_id\": \"$CONVO\"}" | jq '.message'

# 3. Clean up
curl -X DELETE http://localhost:8000/chat/$CONVO
```

---

## Frontend Integration

### Base URL

```
http://localhost:8000        (local dev)
http://<your-server>:8000   (deployed)
```

Set this as an environment variable in your Next.js app:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Conversation lifecycle

The backend holds conversation history in memory, keyed by `conversation_id`. The frontend must:

1. **Start a conversation** — send `POST /chat` without a `conversation_id`. Store the returned `conversation_id` in component state (or `localStorage` for persistence across refreshes).
2. **Continue the conversation** — always send the stored `conversation_id` with every subsequent message.
3. **Reset** — call `DELETE /chat/{conversation_id}` when the user starts a new trip or clears the chat, then discard the stored ID.

> **Note:** History is in-memory only — it is lost on server restart.

---

### Endpoint reference

#### `POST /chat`

```ts
// Request
{
  message: string           // user's chat message
  conversation_id?: string  // omit to start a new conversation
}

// Response
{
  message: string           // agent's reply — display in chat bubble
  routes: Route[] | null    // 3 alternatives, or null if not a planning turn
  conversation_id: string   // persist this and send it on every follow-up
}
```

#### `DELETE /chat/{conversation_id}`

Clears server-side history. Call when the user resets.

```ts
// Response
{ ok: true }
```

#### `GET /profile`

Returns the user profile. Use to display the user's name and vehicle in the UI.

```ts
{
  name: string
  vehicle: { display: string, chargetrip_id: string }
  home: { coordinates: [number, number], name: string }
  preferences: { amenities: string[], speed_tolerance: string, connector_preferred: string }
  history: [...]
}
```

#### `GET /health`

```ts
{ status: "ok" }
```

---

### Route object shape

```ts
interface Stop {
  name: string              // "Espresso House Jönköping"
  emoji: string             // "☕"
  charge_time_min: number   // 28
  power_kw: number          // 100
  amenities: string[]       // ["coffee"]
  coordinates: [number, number]  // [lon, lat]
}

interface Route {
  id: "A" | "B" | "C"
  label: string             // "Fastest" | "Oscar's Pick" | "Scenic"
  badge_emoji: string       // "⚡" | "☕" | "☕🛍️"
  recommended: boolean      // true on the agent-recommended route
  total_duration_min: number
  total_distance_km: number
  stops: Stop[]
  polyline: string          // encoded polyline — pass to Mapbox/Leaflet
}
```

---

### Suggested frontend state machine

```
IDLE  →  (user sends message)  →  LOADING
LOADING  →  (response arrives, routes = null)  →  IDLE   [just a chat reply]
LOADING  →  (response arrives, routes = [...])  →  PICK   [show route cards]
PICK    →  (user picks a route)  →  NAVIGATE
NAVIGATE →  (user pulls up chat and sends message)  →  LOADING
```

While in `LOADING`, rotate filler messages every 2–3 seconds:
```
"🔍 Finding the best route for you..."
"⚡ Checking charging stations along the way..."
"☕ Looking for your kind of stops..."
"🧮 Comparing alternatives..."
"✨ Almost ready!"
```

---

### Minimal fetch wrapper (TypeScript)

```ts
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function sendMessage(message: string, conversationId?: string) {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<{
    message: string;
    routes: Route[] | null;
    conversation_id: string;
  }>;
}

export async function resetConversation(conversationId: string) {
  await fetch(`${API}/chat/${conversationId}`, { method: "DELETE" });
}
```

---

### Rendering routes on a map

Each route has a `polyline` field (Google-encoded polyline string). Decode and render it alongside stop markers.

**Mapbox (via `@mapbox/polyline`):**
```ts
import polyline from "@mapbox/polyline";

const geojson = polyline.toGeoJSON(route.polyline);
// add as a GeoJSON source layer to your Mapbox map
```

Stop `coordinates` are `[longitude, latitude]` — match Mapbox's `LngLat` order directly.

---

## Project structure

```
backend/
├── api/
│   ├── main.py         FastAPI app + endpoints
│   ├── agent.py        Claude agent loop + conversation history
│   ├── tools.py        Tool definitions + executor
│   └── profile.json    Hardcoded user profile (Oscar)
│
├── chargetrip_experiment/
│   ├── client.py       GraphQL base client
│   ├── routes.py       Route planning (create + poll)
│   ├── stations.py     Station search + amenity list
│   └── operators.py    Operator lookup
│
├── pyproject.toml
├── .env.example
└── README.md
```

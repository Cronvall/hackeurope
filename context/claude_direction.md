# NOBIL Real-Time EV Charging — Test Environment Brief

## Goal

Build a local test environment that connects to the **NOBIL Real-time WebSocket stream** (via Enova's production API) and visualises live EV charger status updates on an interactive map — simulating what a heatmap product would look like.

---

## What We're Building

A simple full-stack dev environment with:

- A **Node.js backend** that connects to the NOBIL WebSocket stream and re-broadcasts updates via a local WebSocket server
- A **frontend dashboard** (single HTML file or React) showing:
  - A live map with charger locations (using Leaflet.js)
  - Colour-coded markers by status (green = AVAILABLE, red = CHARGING, grey = UNKNOWN etc.)
  - A live event log panel showing raw incoming stream messages
  - A simple counter: how many EVSEs are AVAILABLE vs CHARGING right now

---

## API Details

### Authentication Flow (two-step)

NOBIL's real-time stream requires two steps to connect:

**Step 1 — Get a WebSocket URL**

```
GET https://data.enova.no/real-time/v1/Realtime
Header: x-api-key: YOUR_API_KEY_HERE
```

This returns a temporary `wss://` URL (Azure Web PubSub token URL). This URL expires, so it must be fetched fresh each time you connect.

**Step 2 — Connect to the WebSocket**

Take the `wss://` URL from Step 1 and open a standard WebSocket connection to it. No additional auth headers needed on the WebSocket itself — the token is embedded in the URL.

### Stream Message Format

Every message from the stream looks like this:

```json
{
  "nobilId": "NOR_23314",
  "evseUId": "7381cc78-a032-4f23-a46f-3e0ebe4590ff",
  "status": "CHARGING"
}
```

**Possible status values:**

| Status | Meaning |
|---|---|
| `AVAILABLE` | Ready for a new session |
| `CHARGING` | Currently in use |
| `BLOCKED` | Physically blocked (car parked) |
| `RESERVED` | Reserved for a specific driver |
| `OUTOFORDER` | Currently broken |
| `INOPERATIVE` | Not yet active or decommissioned |
| `REMOVED` | Permanently removed |
| `PLANNED` | Coming soon |
| `UNKNOWN` | No status info / offline |

### Static Location Data (NOBIL REST API)

To get lat/lng for each station (needed for map markers), use the NOBIL REST API:

```
GET https://nobil.no/api/server/datadump.php?apikey=YOUR_API_KEY&countrycode=SWE&fromdate=2024-01-01&format=json
```

Also try Norway:
```
GET https://nobil.no/api/server/datadump.php?apikey=YOUR_API_KEY&countrycode=NOR&fromdate=2024-01-01&format=json
```

The `nobilId` in the stream (e.g. `NOR_23314`) maps to the station records in the REST response. Use this to enrich stream events with coordinates.

> **Note:** The same API key works for both the real-time stream and the static REST API.

---

## Tech Stack

Use whatever feels fastest. Suggested:

- **Backend:** Node.js with `ws` library and `node-fetch` or `axios`
- **Frontend:** Single `index.html` with Leaflet.js (CDN), no build step needed
- **Optional:** Express.js to serve the frontend and proxy the local WebSocket

Keep it simple — this is a hackathon test env, not production code.

---

## Project Structure

```
nobil-test/
├── package.json
├── .env                  # API key goes here
├── server.js             # Node backend: fetches WSS URL, connects to NOBIL, re-broadcasts locally
└── public/
    └── index.html        # Frontend: Leaflet map + live log + status counters
```

---

## Environment Variables

Create a `.env` file:

```
NOBIL_API_KEY=your_api_key_here
PORT=3000
```

---

## Backend Behaviour (server.js)

The backend should:

1. On startup, call `GET https://data.enova.no/real-time/v1/Realtime` with the `x-api-key` header to get the `wss://` URL
2. Open a WebSocket connection to that URL
3. On each incoming message, parse the JSON and:
   - Store the latest status for each `evseUId` in memory (a simple JS object/Map)
   - Broadcast the raw update to all connected frontend clients via a local WebSocket server on `ws://localhost:3001`
4. Handle reconnection if the NOBIL stream drops (the token URL expires periodically — refetch it)
5. Serve `public/index.html` via Express on `http://localhost:3000`

---

## Frontend Behaviour (index.html)

The frontend should:

1. On load, fetch static station data from NOBIL REST API (can be proxied through the backend to avoid CORS)
2. Plot all stations as markers on a Leaflet map, centered on **Gothenburg, Sweden** (`57.7089, 11.9746`)
3. Connect to the local WebSocket at `ws://localhost:3001`
4. On each status update:
   - Find the marker for that `nobilId` and update its colour
   - Add a row to a scrolling event log panel
   - Update the live counters (AVAILABLE count, CHARGING count, etc.)

### Marker colours by status:

```
AVAILABLE   → green  (#2ecc71)
CHARGING    → red    (#e74c3c)
BLOCKED     → orange (#e67e22)
RESERVED    → blue   (#3498db)
OUTOFORDER  → dark grey (#7f8c8d)
UNKNOWN     → light grey (#bdc3c7)
```

---

## Static Data Proxy (avoid CORS)

Add a backend endpoint that fetches and caches the NOBIL static dump:

```
GET http://localhost:3000/api/stations?country=SWE
```

This should fetch from NOBIL, parse the response, and return an array of:

```json
[
  {
    "nobilId": "SWE_1234",
    "name": "Nordstan Parkering",
    "lat": 57.7070,
    "lng": 11.9680,
    "connectors": 4
  }
]
```

Cache this in memory for the duration of the session — no need to refetch on every client load.

---

## Acceptance Criteria

When done, I should be able to:

- [ ] Run `npm install && npm start`
- [ ] Open `http://localhost:3000` in a browser
- [ ] See a Leaflet map centered on Gothenburg with markers for Swedish/Norwegian charging stations
- [ ] See markers change colour in real time as status updates arrive from NOBIL
- [ ] See a live event log with the raw JSON from the stream
- [ ] See counters showing how many EVSEs are currently AVAILABLE vs CHARGING

---

## Notes & Gotchas

- The WebSocket URL from Enova **expires** — implement a reconnect loop that re-fetches the URL when the connection closes
- The test environment (`test.data.enova.no`) has **no live data** — always use production (`data.enova.no`) for real updates
- NOBIL `nobilId` format is `{COUNTRYCODE}_{NUMBER}` e.g. `NOR_23314` or `SWE_4521`
- Not every station in the static dump will send real-time updates — only those whose CPOs have an active OCPI connection to NOBIL
- Sweden data may be sparser than Norway data — include both countries for a richer stream

---

## Nice to Have (if time allows)

- A heatmap layer toggle (using Leaflet.heat plugin) that colours areas by charger density
- Filter buttons to show only AVAILABLE or only CHARGING stations
- A simple chart (Chart.js) showing status distribution over the last 5 minutes
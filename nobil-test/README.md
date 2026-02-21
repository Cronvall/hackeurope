# nobil-test — EV Charging Dashboard

A real-time EV charging station monitoring dashboard. Connects to the NOBIL/Enova WebSocket stream, persists EVSE data in a local SQLite database, groups charging stations into geographic CPO clusters, and visualises everything on an interactive Leaflet.js map.

---

## Table of contents

1. [Architecture overview](#architecture-overview)
2. [Project structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Setup](#setup)
5. [Running the server](#running-the-server)
6. [Pages](#pages)
7. [Data pipeline](#data-pipeline)
8. [Database](#database)
9. [CPO clustering](#cpo-clustering)
10. [API reference](#api-reference)
11. [WebSocket protocol](#websocket-protocol)
12. [Coverage — countries and CPOs](#coverage--countries-and-cpos)
13. [Status colour reference](#status-colour-reference)
14. [Gotchas and known limitations](#gotchas-and-known-limitations)

---

## Architecture overview

```
NOBIL / Enova API (wss://)
         │
         │  POST /nobil/real-time/v1/Realtime  → temporary wss:// token
         │  WebSocket stream  → { nobilId, evseUId, status }
         ▼
   server.js  (Node.js / Express, port 3000)
         │
         ├─► SQLite  evse_enrichment.db   (persist + enrich EVSE records)
         │          └─ computeCpoClusters()  re-groups stations into CPO clusters
         │
         ├─► GET /api/enriched            (HTTP, serves enriched DB snapshot)
         │
         └─► WebSocket server  (port 3001, re-broadcasts live stream)
                   │
                   ▼
            Browser clients
              ├── index.html   (live view — status colours, real-time updates)
              └── static.html  (static view — CPO colours, no WebSocket)
```

The server acts as a proxy: it authenticates with the NOBIL API, holds a single upstream WebSocket connection, persists every new EVSE it sees into SQLite, then fans out status updates to all connected browser tabs over a local WebSocket.

---

## Project structure

```
nobil-test/
├── server.js              Node.js backend (Express + WebSocket + NOBIL stream)
├── db.js                  SQLite layer — schema, EVSE persistence, CPO clustering
├── package.json
├── .env                   Your secrets (gitignored)
├── .env.example           Template for .env
├── evse_enrichment.db     SQLite database — DO NOT DELETE
├── evse_enrichment.db-shm │  WAL shared-memory file
├── evse_enrichment.db-wal └─ WAL journal file
└── public/
    ├── index.html         Live view — status-coloured markers, real-time WS
    └── static.html        Static view — CPO-coloured markers, DB-only, no WS
```

> **Important:** the three `evse_enrichment.db*` files contain the accumulated enriched dataset. Never delete them. The server will re-use existing records and only append new ones.

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A valid **NOBIL API key** (from Enova/NOBIL — same key works for both real-time and static endpoints)

---

## Setup

**1. Install dependencies**

```bash
cd nobil-test
npm install
```

**2. Create your `.env` file**

Copy the example and fill in your key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
NOBIL_API_KEY=your_actual_api_key_here
PORT=3000
```

`PORT` is optional — defaults to `3000` if omitted.

---

## Running the server

```bash
npm start
```

On startup the server will:

1. Open the SQLite database (creating it if it doesn't exist yet)
2. Run `computeCpoClusters()` — re-groups all stations in the DB into geographic CPO clusters and writes the results back into the existing `charging_cluster_id` / `charging_cluster_capacity` columns
3. Start the Express HTTP server on `PORT` (default `3000`)
4. Start the local WebSocket re-broadcast server on port `3001`
5. Fetch a temporary WebSocket URL from the NOBIL API and connect to the live stream
6. Auto-reconnect with a 5-second delay if the upstream connection drops

Expected startup output:

```
computeCpoClusters: 2681 stations → 159 CPO clusters (radius=150 km)
Local WebSocket server on ws://localhost:3001
HTTP server running at http://localhost:3000
Got WSS URL, connecting...
Connected to NOBIL real-time stream
```

---

## Pages

### Live view — `http://localhost:3000`

`public/index.html`

The real-time monitoring dashboard.

- Loads the full enriched dataset from `/api/enriched` on page load — all CPO cluster positions are available immediately
- Connects to `ws://localhost:3001` and receives live EVSE status updates
- Markers appear (and change colour) as status updates arrive from the stream
- Clusters with only `UNKNOWN` statuses remain hidden until at least one EVSE reports a known status
- The header bar shows: live/disconnected badge, cluster count, EVSE count, total message count
- Clicking a marker opens a popup with: CPO name, cluster ID, station count, total EVSEs, centroid coordinates, and a per-status count breakdown

| Marker colour | Status |
|---|---|
| Green `#2ecc71` | AVAILABLE |
| Red `#e74c3c` | CHARGING |
| Orange `#e67e22` | BLOCKED |
| Blue `#3498db` | RESERVED |
| Dark grey `#7f8c8d` | OUTOFORDER |
| Hidden | UNKNOWN |

### Static view — `http://localhost:3000/static.html`

`public/static.html`

A snapshot view — no WebSocket, no live updates.

- Loads `/api/enriched` once and renders all CPO clusters immediately
- All clusters are visible from the start regardless of live status
- Markers are **coloured by CPO identity** (not status) so you can see operator coverage at a glance
- Marker size scales with the number of stations in the cluster
- The header legend lists every CPO — click any CPO name to hide/show that operator's clusters on the map
- Popup shows: CPO name, cluster ID, station count, total EVSEs, centroid coordinates

This page is the best starting point when the NOBIL stream is unavailable or you just want to explore the stored dataset.

---

## Data pipeline

### How a new EVSE enters the database

Every message on the NOBIL stream has the shape:

```json
{ "nobilId": "NOR_23314", "evseUId": "7381cc78-...", "status": "CHARGING" }
```

When `server.js` receives a message it:

1. Updates the in-memory `evseStatus` Map (`evseUId → { nobilId, status, timestamp }`)
2. Calls `ensureEvse(evseUId, nobilId)` — a transactional SQLite upsert:
   - If the EVSE already exists: no-op, returns the existing row
   - If it's new: looks up or generates location + CPO data for the station (`nobilId`), inserts the row, and increments `charging_cluster_capacity` for all EVSEs in the station
3. Broadcasts `{ type: 'update', raw: msg, messageCount }` to all connected browser clients

### Location and CPO enrichment

Because the NOBIL real-time stream only provides `nobilId` and `evseUId` (no coordinates or operator name), `db.js` synthesises this data:

- **Coordinates** are generated along realistic highway routes for each country (SWE, NOR, FIN) with ±300 m jitter, so markers land near actual roads
- **CPO names** are randomly assigned from a country-specific list of real Scandinavian operators

Once a station's data is generated it is stored permanently and reused for all subsequent EVSEs at that station. The DB is the source of truth — nothing is re-generated on restart.

---

## Database

### File

`evse_enrichment.db` (SQLite 3, WAL mode)

### Schema

```sql
CREATE TABLE evse_enrichment (
  evse_id                   TEXT PRIMARY KEY,  -- UUID from NOBIL stream
  nobil_id                  TEXT NOT NULL,     -- Station ID, e.g. "NOR_23314"
  latitude                  REAL NOT NULL,     -- Decimal degrees
  longitude                 REAL NOT NULL,     -- Decimal degrees
  cpo_party_id              TEXT NOT NULL,     -- Operator name, e.g. "Recharge"
  charging_cluster_id       TEXT NOT NULL,     -- CPO cluster ID, e.g. "Recharge_3"
  charging_cluster_capacity INTEGER NOT NULL   -- Total EVSEs in this CPO cluster
);

CREATE INDEX idx_cluster ON evse_enrichment(charging_cluster_id);
```

### Current dataset (approximate)

| Metric | Value |
|---|---|
| Total EVSEs | ~7,200 |
| Distinct stations (`nobil_id`) | ~2,680 |
| CPO clusters (after grouping) | ~159 |
| Distinct CPOs | 15 |
| Countries | SWE, NOR, FIN |

### Key relationships

```
evse_id  (1) ──► nobil_id  (many-to-1) ──► charging_cluster_id  (many-to-1)
 EVSE          Station / charger point         CPO geographic cluster
```

One station (`nobil_id`) contains one or more EVSEs (connectors). Multiple stations belonging to the same CPO and within 150 km of each other are merged into one `charging_cluster_id`.

---

## CPO clustering

`computeCpoClusters(radiusKm = 150)` in `db.js` — called automatically at startup.

### What it does

Re-populates `charging_cluster_id` and `charging_cluster_capacity` for every row in the DB using a greedy geographic sweep. No schema changes — only `UPDATE` statements on existing columns.

### Algorithm

1. Query one row per station: `SELECT nobil_id, cpo_party_id, AVG(lat), AVG(lng), COUNT(*) FROM evse_enrichment GROUP BY nobil_id`
2. Group stations by CPO (15 groups)
3. For each CPO's station list:
   - Pick the first unassigned station as a cluster seed
   - Assign every other unassigned station within `radiusKm` (Haversine distance) of the seed to the same cluster
   - ID format: `{CPO_SLUG}_{N}` — e.g. `IONITY_1`, `Recharge_3`, `Vattenfall_InCharge_2`
   - Repeat until all stations are assigned
4. For each cluster, compute `charging_cluster_capacity` = sum of all EVSEs across all member stations
5. Bulk-UPDATE both columns in a single transaction

### Result

~2,680 individual station markers collapse to ~159 CPO clusters at the 150 km default radius. Increasing the radius produces fewer, larger clusters; decreasing it produces more, smaller ones.

To change the radius, edit the call in `server.js`:

```js
computeCpoClusters(100); // 100 km radius — more clusters, finer granularity
computeCpoClusters(300); // 300 km radius — fewer clusters, coarser granularity
```

---

## API reference

Both endpoints are served by Express on `PORT` (default 3000).

### `GET /api/enriched`

Returns the full contents of `evse_enrichment` as a JSON array. Called by both frontend pages on load.

**Response** (array of objects):

```json
[
  {
    "evse_id": "156ba2af-c287-47e1-b745-495381df73de",
    "nobil_id": "NOR_23314",
    "latitude": 59.4123,
    "longitude": 10.8456,
    "cpo_party_id": "Recharge",
    "charging_cluster_id": "Recharge_3",
    "charging_cluster_capacity": 82
  },
  ...
]
```

---

## WebSocket protocol

The local WebSocket server runs on port `3001`. Only `index.html` connects to it.

### Messages sent to the browser

**On connection — full snapshot of current in-memory state:**

```json
{
  "type": "snapshot",
  "data": {
    "<evseUId>": { "nobilId": "NOR_23314", "status": "CHARGING", "timestamp": 1708512345678 }
  },
  "messageCount": 4200
}
```

**On each incoming NOBIL message:**

```json
{
  "type": "update",
  "raw": { "nobilId": "NOR_23314", "evseUId": "7381cc78-...", "status": "AVAILABLE" },
  "messageCount": 4201
}
```

**On upstream connect/disconnect:**

```json
{ "type": "connection", "status": "connected" }
{ "type": "connection", "status": "disconnected" }
```

### NOBIL authentication flow (server-side)

The NOBIL stream uses Azure Web PubSub with rotating tokens:

```
1. POST https://api.data.enova.no/nobil/real-time/v1/Realtime
   Header: x-api-key: <NOBIL_API_KEY>
   → Returns: { "accessToken": "wss://..." }  (token embedded in URL)

2. Connect WebSocket to the returned wss:// URL
   (no additional headers needed — token is in the URL)

3. On disconnect: repeat from step 1 (token expires)
```

---

## Coverage — countries and CPOs

### Countries

| Country | NOBIL ID prefix | Example station ID |
|---|---|---|
| Sweden | `SWE` | `SWE_4521` |
| Norway | `NOR` | `NOR_23314` |
| Finland | `FIN` | `FIN_72441` |

Denmark (`DAN`) is excluded — it appears in the stream but is filtered out in `ensureEvse()`.

### CPOs tracked

| CPO | Countries |
|---|---|
| Vattenfall InCharge | SWE |
| IONITY | SWE, NOR, FIN |
| Clever | SWE |
| Recharge | SWE, NOR, FIN |
| Circle K | SWE, NOR |
| Mer | SWE, NOR |
| Fortum | SWE, NOR, FIN |
| Bee | SWE |
| Kempower | NOR |
| Eviny | NOR |
| Easee | NOR |
| Virta | FIN |
| K-Lataus | FIN |
| ABC-lataus | FIN |
| Helen | FIN |

---

## Status colour reference

| Status | Colour | Hex |
|---|---|---|
| AVAILABLE | Green | `#2ecc71` |
| CHARGING | Red | `#e74c3c` |
| BLOCKED | Orange | `#e67e22` |
| RESERVED | Blue | `#3498db` |
| OUTOFORDER | Dark grey | `#7f8c8d` |
| UNKNOWN | Hidden | — |

---

## Gotchas and known limitations

**Always use production, never test**
The NOBIL test endpoint (`test.data.enova.no`) exists but has no live data. The server is hard-coded to the production endpoint (`api.data.enova.no`).

**Markers only appear in the live view after status updates arrive**
`index.html` hides clusters whose only status is `UNKNOWN`. On a fresh server start the map appears empty for the first few seconds. Use `static.html` if you need to see all clusters immediately.

**CPO and coordinate data is synthesised**
Because the real-time stream does not include operator names or GPS coordinates, `db.js` generates them: coordinates are interpolated along real highway routes (SWE/NOR/FIN) with ~300 m random jitter, and CPO names are drawn from a country-specific list. The data is realistic but not exact.

**`computeCpoClusters` runs on every startup**
This is intentional — it re-computes cluster assignments each time so the groupings stay consistent as the database grows. The operation takes milliseconds for the current dataset size.

**New EVSEs from the live stream get `charging_cluster_id = nobil_id`**
EVSEs that arrive after startup are inserted with their `nobil_id` as the cluster ID (the default 1:1 mapping). They will be correctly re-clustered the next time the server restarts and `computeCpoClusters` runs.

**Do not delete the SQLite files**
`evse_enrichment.db`, `evse_enrichment.db-shm`, and `evse_enrichment.db-wal` together form the WAL-mode SQLite database. Deleting any one of them will corrupt or lose the accumulated dataset. All three are listed in `.gitignore` — back them up separately if needed.

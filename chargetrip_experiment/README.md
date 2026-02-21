# Chargetrip Experiment — API Reference

This project wraps the [Chargetrip GraphQL API](https://api.chargetrip.io/graphql) for EV charging and route planning. Below is a feature overview and data shapes so frontend developers and models know exactly what the backend can provide.

---

## Setup

```bash
cp .env.example .env
# Edit .env with your Chargetrip credentials from https://account.chargetrip.com/

uv run python main.py   # Run the explorer
```

**Environment variables:**
- `CHARGE_TRIP_PROJECT_ID` — x-client-id (project overview page)
- `CHARGE_TRIP_APP_ID` — x-app-id (app created under project)

---

## Features Available

| Feature | Module | Description |
|--------|--------|-------------|
| **Vehicle list** | `client.py` | List EVs with make, model, range |
| **Stations around** | `stations.py` | Find charging stations by location + filters |
| **Station details** | `stations.py` | Full info for a single station |
| **Amenities** | `stations.py` | POIs near a station (restaurants, hotels, etc.) |
| **Operators** | `operators.py` | List charge point operators, optionally by country |
| **EV routes** | `routes.py` | Compute EV route with charging stops |

---

## 1. Vehicles

**GraphQL:** `vehicleList(page, size)`

- Paginated list of EVs in the Chargetrip catalog
- Fields: `id`, `naming.make`, `naming.model`, `range.chargetrip_range.best`, `range.chargetrip_range.worst`
- **Required for routes** — route calculation needs a vehicle ID

---

## 2. Stations

### 2.1 Search stations around a point

**Function:** `stations.station_around(lon, lat, ...)`  
**GraphQL:** `stationAround`

| Parameter | Type | Description |
|-----------|------|-------------|
| `lon`, `lat` | float | Center point (WGS84) |
| `distance` | int | Radius in meters (default 5000) |
| `power` | list[float] | Filter by kW, e.g. `[50.0, 150.0]` |
| `amenities` | list[str] | Filter by amenity type |
| `connector_type` | list[str] | e.g. `["IEC_62196_T2_COMBO", "CHADEMO"]` |
| `speed_type` | list[str] | `"slow"` (&lt;43 kW), `"fast"` (43–150), `"turbo"` (&gt;150) |
| `available_only` | bool | Only stations with at least one available EVSE |
| `page`, `size` | int | Pagination |

**Response shape per station:**
```
id, name, address, city, country, coordinates { latitude, longitude }
operator { id, name }
evses[] { uid, status, connectors[] { standard, max_electric_power, power_type } }
```

### 2.2 Get single station

**Function:** `stations.get_station(station_id)`  
**GraphQL:** `station(id)`

Full details: address, postal_code, facilities, evses with connectors and tariff_ids, capabilities.

### 2.3 Amenities near a station

**Function:** `stations.amenity_list(station_id, amenity_types?, page, size)`  
**GraphQL:** `amenityList`

**Amenity types:** `park`, `restaurant`, `museum`, `coffee`, `hotel`, `shopping`, `bathroom`, `supermarket`, `playground`, `pharmacy`

**Response shape:**
```
id, name, type, location, address { street, city, country }
opening_hours { twentyfourseven }, contact { phone, website }, rating
```

---

## 3. Operators

**Function:** `operators.operator_list(search?, country?, page, size)`  
**GraphQL:** `operatorList`

- `country`: ISO 3166-1 alpha-2 (e.g. `"DE"`, `"NL"`)
- Returns: `id`, `name`, `country`, `contact { phone, website }`

**Filtered list (by countries):** `operators.operator_list_filtered(countries=["DE", "NL"], ...)` — useful for route operator preferences.

**Single operator:** `operators.get_operator(operator_id)`

---

## 4. EV Routes

**Function:** `routes.create_and_wait(vehicle_id, origin, destination, via?)`  
(Or step-by-step: `create_route` → `poll_route` / `get_route`)

**Input format for origin/destination:**
```python
{"coordinates": [lon, lat], "name": "Amsterdam Centraal"}
```

**Optional `via`:** list of waypoints in the same format.

**Route response fields:**
| Field | Description |
|-------|-------------|
| `distance` | Total distance in meters |
| `duration` | Total drive time in seconds |
| `chargeTime` | Total charging time in seconds |
| `charges` | Number of charging stops |
| `rangeStartPercentage`, `rangeEndPercentage` | SoC at start/end |
| `polyline` | Encoded route geometry |
| `legs[]` | Drive and charge segments |

**Leg types:** `station`, `stationVia`, `stationAmenity`, `stationFinal` (charge legs) vs drive legs.

**Per-leg fields:** `distance`, `duration`, `chargeTime`, `type`, `name`, `stationId`, `operatorName`, `rangeStartPercentage`, `rangeEndPercentage`, `origin`, `destination`

**Note:** Chargetrip recommends WebSocket subscriptions for production; this implementation uses polling.

---

## Data Summary for Frontend

| Use case | Capability |
|----------|------------|
| "Find chargers near me" | `station_around(lon, lat, distance, speed_type?)` |
| "Show fast/turbo chargers" | `speed_type=["fast"]` or `["turbo"]` |
| "Show only available chargers" | `available_only=True` |
| "Filter by connector" | `connector_type=["IEC_62196_T2_COMBO"]` |
| "Stations with restaurants" | `amenity_list(station_id, amenity_types=["restaurant"])` |
| "Plan Amsterdam → Berlin" | `create_and_wait(vehicle_id, origin, dest)` |
| "Add waypoint" | `create_and_wait(..., via=[waypoint])` |
| "Operators in Germany" | `operator_list(country="DE")` or `operator_list_filtered(countries=["DE"])` |

---

## Module Overview

| File | Purpose |
|------|---------|
| `client.py` | GraphQL executor: `gql(query, variables)`, `introspect_type(type_name)` |
| `routes.py` | `create_route`, `get_route`, `poll_route`, `create_and_wait` |
| `stations.py` | `station_around`, `get_station`, `amenity_list` |
| `operators.py` | `operator_list`, `operator_list_filtered`, `get_operator` |
| `main.py` | CLI explorer that runs all demos in sequence |

---

## Running the Explorer

```bash
uv run python main.py
```

This executes demos for vehicles, operators, stations, amenities, and a sample Amsterdam → Berlin route.

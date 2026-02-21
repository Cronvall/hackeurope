"""
Chargetrip API explorer — exercises all endpoints in sequence.

Modules:
  client.py    — base GraphQL executor
  routes.py    — createRoute / getRoute / pollRoute
  stations.py  — stationAround / station / amenityList
  operators.py — operatorList / operatorList with filters

Run:
  uv run python main.py
"""

import json
from client import gql, GraphQLError
import routes
import stations
import operators

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SECTION = "=" * 60

def section(title: str):
    print(f"\n{SECTION}\n  {title}\n{SECTION}")

def dump(obj, indent: int = 2):
    print(json.dumps(obj, indent=indent, default=str))

# ---------------------------------------------------------------------------
# Vehicles (reused from original experiment)
# ---------------------------------------------------------------------------

_VEHICLE_LIST = """
query {
  vehicleList(page: 0, size: 5) {
    id
    naming { make model }
    range { chargetrip_range { best worst } }
  }
}
"""

def demo_vehicles() -> str:
    """Returns the ID of the first vehicle found."""
    section("VEHICLES — vehicleList")
    data = gql(_VEHICLE_LIST)
    vehicles = data["vehicleList"]
    print(f"Found {len(vehicles)} vehicles:\n")
    for v in vehicles:
        make = v["naming"]["make"]
        model = v["naming"]["model"]
        best = v["range"]["chargetrip_range"]["best"]
        worst = v["range"]["chargetrip_range"]["worst"]
        print(f"  [{v['id']}]  {make} {model}  —  {worst}–{best} km")
    return vehicles[0]["id"]

# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

def demo_operators():
    section("OPERATORS — operatorList (unfiltered, first 5)")
    ops = operators.operator_list(page=0, size=5)
    for op in ops:
        print(f"  [{op['id']}]  {op['name']}  ({op.get('country', '?')})")
    return ops

def demo_operators_filtered():
    section("OPERATORS — operatorList filtered by countries=[DE]")
    try:
        ops = operators.operator_list_filtered(countries=["DE"], size=5)
        for op in ops:
            print(f"  [{op['id']}]  {op['name']}  ({op.get('country', '?')})")
        return ops
    except GraphQLError as e:
        print(f"  [skipped — {e}]")
        return []

# ---------------------------------------------------------------------------
# Stations
# ---------------------------------------------------------------------------

# Amsterdam Centraal roughly
DEMO_LON, DEMO_LAT = 4.9002, 52.3786

def demo_station_around() -> str | None:
    section("STATIONS — stationAround (Amsterdam, 2 km radius)")
    nearby = stations.station_around(DEMO_LON, DEMO_LAT, distance=2000, size=5)
    if not nearby:
        print("  No stations found in this area.")
        return None
    for s in nearby:
        coords = s.get("coordinates") or {}
        lat = coords.get("latitude", "?")
        lon = coords.get("longitude", "?")
        evse_count = len(s.get("evses", []))
        print(f"  [{s['id']}]  {s['name']}  @ ({lat}, {lon})  ({evse_count} EVSEs)")
    return nearby[0]["id"]

def demo_station_around_filtered():
    section("STATIONS — stationAround filtered (turbo/fast-charge, Amsterdam 10 km)")
    try:
        nearby = stations.station_around(
            DEMO_LON, DEMO_LAT,
            distance=10_000,
            speed_type=["turbo"],
            size=5,
        )
        if not nearby:
            print("  No turbo stations found.")
            return
        for s in nearby:
            coords = s.get("coordinates") or {}
            print(f"  [{s['id']}]  {s['name']}  @ ({coords.get('latitude')}, {coords.get('longitude')})")
    except GraphQLError as e:
        print(f"  [skipped — {e}]")

def demo_station(station_id: str):
    section(f"STATIONS — station (single, id={station_id[:16]}…)")
    try:
        st = stations.get_station(station_id)
        print(f"  Name:     {st['name']}")
        print(f"  Address:  {st.get('address')} {st.get('city')} {st.get('country')}")
        op = st.get("operator") or {}
        print(f"  Operator: {op.get('name')}")
        evses = st.get("evses", [])
        print(f"  EVSEs:    {len(evses)}")
        for evse in evses[:3]:
            for c in evse.get("connectors", []):
                print(f"    {c['standard']}  {c.get('max_electric_power')} kW  status={evse['status']}")
    except GraphQLError as e:
        print(f"  [skipped — {e}]")

def demo_amenity_list(station_id: str):
    section(f"AMENITIES — amenityList (station {station_id[:16]}…)")
    try:
        amenities = stations.amenity_list(station_id, size=5)
        if not amenities:
            print("  No amenities found near this station.")
            return
        for a in amenities:
            print(f"  [{a['id']}]  {a['name']}  type={a.get('type')}  rating={a.get('rating')}")
    except GraphQLError as e:
        print(f"  [skipped — {e}]")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

def demo_route(vehicle_id: str):
    section("ROUTES — createRoute + poll (Amsterdam → Berlin)")
    origin      = {"coordinates": [4.9002, 52.3786], "name": "Amsterdam Centraal"}
    destination = {"coordinates": [13.4050, 52.5200], "name": "Berlin Hauptbahnhof"}

    try:
        print("  Creating route…")
        route = routes.create_and_wait(vehicle_id, origin, destination)
        if not route:
            print("  Route returned empty — vehicle may not be supported for this corridor.")
            return

        dist_km = (route.get("distance") or 0) / 1000
        dur_min = (route.get("duration") or 0) // 60
        charge_min = int((route.get("chargeTime") or 0) / 60)
        legs = route.get("legs", [])
        print(f"\n  Distance:    {dist_km:.0f} km")
        print(f"  Drive time:  {dur_min // 60}h {dur_min % 60}m")
        print(f"  Charge time: {charge_min // 60}h {charge_min % 60}m")
        print(f"  Charges:     {route.get('charges', 0)}")
        print(f"  SoC end:     {route.get('rangeEndPercentage')}%")
        print(f"\n  Legs ({len(legs)}):")
        charge_leg_types = {"station", "stationVia", "stationAmenity", "stationFinal"}
        for i, leg in enumerate(legs):
            d = (leg.get("distance") or 0) / 1000
            leg_type = leg.get("type", "")
            name = leg.get("name") or leg.get("operatorName") or "—"
            soc_end = leg.get("rangeEndPercentage", "?")
            charge_s = leg.get("chargeTime") or 0
            if leg_type in charge_leg_types:
                print(f"    Leg {i+1}: ⚡ charge at {name}  {charge_s//60}m  SoC→{soc_end}%")
            else:
                print(f"    Leg {i+1}: 🚗 drive  {d:.0f} km  SoC→{soc_end}%")
    except (GraphQLError, RuntimeError, TimeoutError) as e:
        print(f"  [skipped — {e}]")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\nChargetrip API Explorer")

    vehicle_id = demo_vehicles()

    demo_operators()
    demo_operators_filtered()

    station_id = demo_station_around()
    demo_station_around_filtered()

    if station_id:
        demo_station(station_id)
        demo_amenity_list(station_id)

    demo_route(vehicle_id)

    print(f"\n{SECTION}\n  Done.\n{SECTION}\n")

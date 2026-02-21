"""
Routes API — create, fetch, and poll Chargetrip routes.

Flow:
  1. create_route()    →  fires the newRoute mutation, returns route ID
  2. get_route(id)     →  single fetch of current route state
  3. poll_route(id)    →  keeps polling until status reaches a final state
  4. create_and_wait() →  convenience wrapper combining 1–3

Note: Chargetrip recommends WebSocket subscriptions over polling for production,
but polling is fine for scripting and experimentation.
"""

import time
from .client import gql

# ---------------------------------------------------------------------------
# GraphQL documents
# ---------------------------------------------------------------------------

_CREATE_ROUTE = """
mutation newRoute($input: RequestInput) {
  newRoute(input: $input)
}
"""

_GET_ROUTE = """
query route($id: ID!) {
  route(id: $id) {
    status
    route {
      id
      distance
      duration
      chargeTime
      charges
      polyline
      rangeStartPercentage
      rangeEndPercentage
      legs {
        distance
        duration
        chargeTime
        type
        name
        stationId
        operatorName
        rangeStartPercentage
        rangeEndPercentage
        origin { geometry { coordinates } properties }
        destination { geometry { coordinates } properties }
      }
    }
  }
}
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _feature(loc: dict) -> dict:
    """Build a GeoJSON FeaturePoint input from {"coordinates": [lon, lat], "name": "..."}."""
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": loc["coordinates"]},
        "properties": {"name": loc.get("name", "")},
    }

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def create_route(
    vehicle_id: str,
    origin: dict,
    destination: dict,
    via: list[dict] | None = None,
) -> str:
    """
    Fire the newRoute mutation. Returns the route ID immediately.

    Args:
        vehicle_id:   Chargetrip vehicle ID.
        origin:       {"coordinates": [lon, lat], "name": "Amsterdam"}
        destination:  {"coordinates": [lon, lat], "name": "Berlin"}
        via:          Optional list of waypoints in the same format.

    Returns:
        Route ID string.
    """
    route_request: dict = {
        "origin": _feature(origin),
        "destination": _feature(destination),
    }
    if via:
        route_request["via"] = [_feature(w) for w in via]

    data = gql(_CREATE_ROUTE, {"input": {
        "ev": {"id": vehicle_id},
        "routeRequest": route_request,
    }})
    return data["newRoute"]


def get_route(route_id: str) -> dict:
    """Fetch the current state of a route by ID. Returns the raw route wrapper dict."""
    data = gql(_GET_ROUTE, {"id": route_id})
    return data["route"]


def poll_route(route_id: str, timeout: int = 120, interval: float = 2.0) -> dict:
    """
    Poll until route status is 'done', 'error', or 'not_found'.

    Returns the completed RouteAlternative dict on success.
    Raises RuntimeError on error/not_found, TimeoutError on timeout.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        result = get_route(route_id)
        status = result["status"]
        print(f"  route status: {status}")
        if status == "done":
            return result["route"]
        if status in ("error", "not_found"):
            raise RuntimeError(f"Route calculation ended with status '{status}'")
        time.sleep(interval)

    raise TimeoutError(f"Route {route_id} did not complete within {timeout}s")


def create_and_wait(
    vehicle_id: str,
    origin: dict,
    destination: dict,
    via: list[dict] | None = None,
) -> dict:
    """Convenience: create a route and block until done. Returns the completed route."""
    route_id = create_route(vehicle_id, origin, destination, via=via)
    print(f"  Created route ID: {route_id}")
    return poll_route(route_id)

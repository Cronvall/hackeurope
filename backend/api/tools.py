"""
Tool definitions and executor for the Claude agent.

TOOL_DEFINITIONS — list of Anthropic tool schemas passed to the API.
execute_tool(name, inputs) — dispatches to the right chargetrip_experiment function.
"""

import json
import sys
import os

# Ensure chargetrip_experiment is importable from the backend root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from chargetrip_experiment import client, routes, stations, operators

# ---------------------------------------------------------------------------
# Vehicle lookup query (not in chargetrip_experiment as a standalone function)
# ---------------------------------------------------------------------------

_VEHICLE_LIST_QUERY = """
query vehicleList($search: String, $page: Int, $size: Int) {
  vehicleList(search: $search, page: $page, size: $size) {
    id
    naming { make model }
    range { chargetrip_range { best worst } }
  }
}
"""


def _lookup_vehicle(search: str, size: int = 10) -> list[dict]:
    data = client.gql(_VEHICLE_LIST_QUERY, {"search": search, "page": 0, "size": size})
    return data["vehicleList"]


# ---------------------------------------------------------------------------
# Tool definitions
# ---------------------------------------------------------------------------

TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "lookup_vehicle",
        "description": "Search for EV vehicles by name to get their Chargetrip vehicle ID. Use this to resolve a user's car model before planning a route.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {
                    "type": "string",
                    "description": "Vehicle name or make/model to search for, e.g. 'VW ID.3' or 'Tesla Model 3'.",
                },
                "size": {
                    "type": "integer",
                    "description": "Max results to return (default 10).",
                    "default": 10,
                },
            },
            "required": ["search"],
        },
    },
    {
        "name": "plan_route",
        "description": "Plan an EV route between two locations. Returns route details including distance, duration, charge time, and charging legs. This is the primary route planning tool.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicle_id": {
                    "type": "string",
                    "description": "Chargetrip vehicle ID (from lookup_vehicle).",
                },
                "origin": {
                    "type": "object",
                    "description": "Origin location.",
                    "properties": {
                        "coordinates": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "[longitude, latitude]",
                        },
                        "name": {"type": "string", "description": "Human-readable name."},
                    },
                    "required": ["coordinates", "name"],
                },
                "destination": {
                    "type": "object",
                    "description": "Destination location.",
                    "properties": {
                        "coordinates": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "[longitude, latitude]",
                        },
                        "name": {"type": "string", "description": "Human-readable name."},
                    },
                    "required": ["coordinates", "name"],
                },
            },
            "required": ["vehicle_id", "origin", "destination"],
        },
    },
    {
        "name": "find_stations_nearby",
        "description": "Find charging stations near a coordinate. Use to discover alternative stations around a route leg or charging stop.",
        "input_schema": {
            "type": "object",
            "properties": {
                "lon": {"type": "number", "description": "Longitude of center point."},
                "lat": {"type": "number", "description": "Latitude of center point."},
                "distance": {
                    "type": "integer",
                    "description": "Search radius in meters (default 5000).",
                    "default": 5000,
                },
                "amenities": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter stations near these amenity types: park, restaurant, museum, coffee, hotel, shopping, bathroom, supermarket, playground, pharmacy.",
                },
                "connector_type": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by connector standard, e.g. ['IEC_62196_T2_COMBO', 'CHADEMO'].",
                },
                "speed_type": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by speed group: 'slow', 'fast', 'turbo'.",
                },
                "available_only": {
                    "type": "boolean",
                    "description": "Only return stations with at least one available EVSE.",
                    "default": False,
                },
                "size": {
                    "type": "integer",
                    "description": "Max results (default 20).",
                    "default": 20,
                },
            },
            "required": ["lon", "lat"],
        },
    },
    {
        "name": "get_station_details",
        "description": "Get full details for a single charging station by ID, including connectors, power levels, and operator.",
        "input_schema": {
            "type": "object",
            "properties": {
                "station_id": {
                    "type": "string",
                    "description": "Chargetrip station ID.",
                },
            },
            "required": ["station_id"],
        },
    },
    {
        "name": "get_amenities",
        "description": "List points of interest (cafés, restaurants, parks, etc.) near a charging station.",
        "input_schema": {
            "type": "object",
            "properties": {
                "station_id": {
                    "type": "string",
                    "description": "Chargetrip station ID.",
                },
                "amenity_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Filter by amenity type: park, restaurant, museum, coffee, hotel, shopping, bathroom, supermarket, playground, pharmacy.",
                },
                "size": {
                    "type": "integer",
                    "description": "Max results (default 10).",
                    "default": 10,
                },
            },
            "required": ["station_id"],
        },
    },
    {
        "name": "list_operators",
        "description": "List charging network operators, optionally filtered by country or text search.",
        "input_schema": {
            "type": "object",
            "properties": {
                "search": {
                    "type": "string",
                    "description": "Free-text search across operator names.",
                },
                "country": {
                    "type": "string",
                    "description": "ISO 3166-1 alpha-2 country code, e.g. 'SE', 'DE'.",
                },
                "size": {
                    "type": "integer",
                    "description": "Max results (default 20).",
                    "default": 20,
                },
            },
            "required": [],
        },
    },
    {
        "name": "refine_route",
        "description": "Re-plan a route forcing it through a specific waypoint (e.g. a preferred charging station). Use after the user picks an alternative stop.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicle_id": {
                    "type": "string",
                    "description": "Chargetrip vehicle ID.",
                },
                "origin": {
                    "type": "object",
                    "description": "Origin location.",
                    "properties": {
                        "coordinates": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "[longitude, latitude]",
                        },
                        "name": {"type": "string"},
                    },
                    "required": ["coordinates", "name"],
                },
                "destination": {
                    "type": "object",
                    "description": "Destination location.",
                    "properties": {
                        "coordinates": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "[longitude, latitude]",
                        },
                        "name": {"type": "string"},
                    },
                    "required": ["coordinates", "name"],
                },
                "via": {
                    "type": "array",
                    "description": "Waypoints to route through.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "coordinates": {
                                "type": "array",
                                "items": {"type": "number"},
                                "description": "[longitude, latitude]",
                            },
                            "name": {"type": "string"},
                        },
                        "required": ["coordinates", "name"],
                    },
                },
            },
            "required": ["vehicle_id", "origin", "destination", "via"],
        },
    },
    {
        "name": "submit_routes",
        "description": (
            "REQUIRED: Call this tool once you have assembled the three route alternatives (A, B, C). "
            "This is how you return structured route data to the frontend — do NOT put routes in your text message. "
            "Call this exactly once at the end of your planning, after you have gathered all the information needed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "routes": {
                    "type": "array",
                    "description": "Exactly 3 route alternatives: A (fastest), B (personalized/recommended), C (scenic/multi-stop).",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "Route identifier: 'A', 'B', or 'C'.",
                            },
                            "label": {
                                "type": "string",
                                "description": "Short label e.g. 'Fastest', 'Oscar's Pick', 'Scenic'.",
                            },
                            "badge_emoji": {
                                "type": "string",
                                "description": "Emoji badge(s) summarising the route, e.g. '⚡', '☕', '☕🛍️'.",
                            },
                            "recommended": {
                                "type": "boolean",
                                "description": "True for the route best matching user history/preferences.",
                            },
                            "total_duration_min": {
                                "type": "integer",
                                "description": "Total trip duration including driving and charging, in minutes.",
                            },
                            "total_distance_km": {
                                "type": "number",
                                "description": "Total trip distance in kilometres.",
                            },
                            "stops": {
                                "type": "array",
                                "description": "Charging stops along the route.",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {
                                            "type": "string",
                                            "description": "Station or stop name.",
                                        },
                                        "emoji": {
                                            "type": "string",
                                            "description": "Emoji for the stop's primary amenity.",
                                        },
                                        "charge_time_min": {
                                            "type": "integer",
                                            "description": "Estimated charge time at this stop, in minutes.",
                                        },
                                        "power_kw": {
                                            "type": "number",
                                            "description": "Max charger power in kW.",
                                        },
                                        "amenities": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                            "description": "Amenity types available near this stop.",
                                        },
                                        "coordinates": {
                                            "type": "array",
                                            "items": {"type": "number"},
                                            "description": "[longitude, latitude]",
                                        },
                                    },
                                    "required": ["name", "emoji", "charge_time_min", "power_kw", "amenities", "coordinates"],
                                },
                            },
                            "polyline": {
                                "type": "string",
                                "description": "Encoded polyline string for the route (from Chargetrip API). Use empty string if unavailable.",
                            },
                        },
                        "required": ["id", "label", "badge_emoji", "recommended", "total_duration_min", "total_distance_km", "stops", "polyline"],
                    },
                },
            },
            "required": ["routes"],
        },
    },
]

# ---------------------------------------------------------------------------
# Tool executor
# ---------------------------------------------------------------------------


def execute_tool(name: str, inputs: dict) -> str:
    """Dispatch a tool call to the appropriate chargetrip_experiment function.

    Returns a JSON string with the result (or error).
    """
    try:
        result = _dispatch(name, inputs)
        return json.dumps(result, default=str)
    except Exception as exc:
        return json.dumps({"error": str(exc)})


def _dispatch(name: str, inputs: dict):
    if name == "lookup_vehicle":
        return _lookup_vehicle(
            search=inputs["search"],
            size=inputs.get("size", 10),
        )

    if name == "plan_route":
        return routes.create_and_wait(
            vehicle_id=inputs["vehicle_id"],
            origin=inputs["origin"],
            destination=inputs["destination"],
        )

    if name == "find_stations_nearby":
        return stations.station_around(
            lon=inputs["lon"],
            lat=inputs["lat"],
            distance=inputs.get("distance", 5000),
            amenities=inputs.get("amenities"),
            connector_type=inputs.get("connector_type"),
            speed_type=inputs.get("speed_type"),
            available_only=inputs.get("available_only", False),
            size=inputs.get("size", 20),
        )

    if name == "get_station_details":
        return stations.get_station(station_id=inputs["station_id"])

    if name == "get_amenities":
        return stations.amenity_list(
            station_id=inputs["station_id"],
            amenity_types=inputs.get("amenity_types"),
            size=inputs.get("size", 10),
        )

    if name == "list_operators":
        return operators.operator_list(
            search=inputs.get("search"),
            country=inputs.get("country"),
            size=inputs.get("size", 20),
        )

    if name == "refine_route":
        return routes.create_and_wait(
            vehicle_id=inputs["vehicle_id"],
            origin=inputs["origin"],
            destination=inputs["destination"],
            via=inputs.get("via"),
        )

    raise ValueError(f"Unknown tool: {name}")

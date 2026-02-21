"""
Stations API — search by location, fetch by ID, and list nearby amenities.

Key types (from schema introspection):
  stationAround(query: StationAroundQuery, filter: StationAroundFilter, size, page)
    StationAroundQuery:  location (PointInput), distance (Int), power ([Float]), amenities ([String])
    StationAroundFilter: powers ([Float]), power_groups ([StationSpeedType]),
                         connectors ([ConnectorType]), available_only (Boolean)

  station(id: ID)

  amenityList(stationId, filter, page, size)

StationSpeedType enum: slow | fast | turbo
Amenities enum:        park | restaurant | museum | coffee | hotel |
                       shopping | bathroom | supermarket | playground | pharmacy
"""

from .client import gql

# ---------------------------------------------------------------------------
# GraphQL documents
# ---------------------------------------------------------------------------

_STATION_AROUND = """
query stationAround(
  $query: StationAroundQuery
  $filter: StationAroundFilter
  $page: Int
  $size: Int
) {
  stationAround(query: $query, filter: $filter, page: $page, size: $size) {
    id
    name
    address
    city
    country
    coordinates { latitude longitude }
    operator { id name }
    evses {
      uid
      status
      connectors {
        standard
        max_electric_power
        power_type
      }
    }
  }
}
"""

_STATION = """
query station($id: ID) {
  station(id: $id) {
    id
    name
    address
    city
    postal_code
    country
    coordinates { latitude longitude }
    operator { id name }
    facilities
    evses {
      uid
      status
      connectors {
        standard
        max_electric_power
        power_type
        tariff_ids
      }
      capabilities
    }
  }
}
"""

_AMENITY_LIST = """
query amenityList(
  $stationId: ID!
  $amenityTypes: [Amenities!]
  $page: Int
  $size: Int
) {
  amenityList(
    stationId: $stationId
    filter: { type: $amenityTypes }
    page: $page
    size: $size
  ) {
    id
    name
    type
    location { type coordinates }
    address {
      street
      city
      country
    }
    opening_hours {
      twentyfourseven
    }
    contact {
      phone
      website
    }
    rating
  }
}
"""

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def station_around(
    lon: float,
    lat: float,
    distance: int = 5000,
    power: list[float] | None = None,
    amenities: list[str] | None = None,
    connector_type: list[str] | None = None,
    speed_type: list[str] | None = None,
    available_only: bool = False,
    page: int = 0,
    size: int = 20,
) -> list[dict]:
    """
    Find charging stations around a coordinate.

    Args:
        lon, lat:       Center point (longitude, latitude).
        distance:       Search radius in meters (default 5 km).
        power:          Filter by exact power in kW, e.g. [50.0, 150.0].
        amenities:      Filter by amenity strings, e.g. ["restaurant", "hotel"].
        connector_type: Filter by connector standard, e.g. ["IEC_62196_T2_COMBO", "CHADEMO"].
        speed_type:     Filter by speed group — "slow" (<43 kW), "fast" (43–150), "turbo" (>150).
        available_only: Only return stations with at least one available EVSE.
        page, size:     Pagination.

    Returns:
        List of station dicts.
    """
    query_input: dict = {
        "location": {"type": "Point", "coordinates": [lon, lat]},
        "distance": distance,
    }
    if power is not None:
        query_input["power"] = power
    if amenities is not None:
        query_input["amenities"] = amenities

    filter_input: dict = {}
    if connector_type is not None:
        filter_input["connectors"] = connector_type
    if speed_type is not None:
        filter_input["power_groups"] = speed_type
    if available_only:
        filter_input["available_only"] = True

    variables: dict = {"query": query_input, "page": page, "size": size}
    if filter_input:
        variables["filter"] = filter_input

    data = gql(_STATION_AROUND, variables)
    return data["stationAround"]


def get_station(station_id: str) -> dict:
    """Fetch full details for a single station by ID."""
    data = gql(_STATION, {"id": station_id})
    return data["station"]


def amenity_list(
    station_id: str,
    amenity_types: list[str] | None = None,
    page: int = 0,
    size: int = 10,
) -> list[dict]:
    """
    List amenities near a charging station.

    Args:
        station_id:    ID of the charging station.
        amenity_types: Optional list filter — values: restaurant, hotel, supermarket,
                       coffee, bathroom, shopping, park, museum, playground, pharmacy.
        page, size:    Pagination.

    Returns:
        List of amenity dicts.
    """
    variables: dict = {"stationId": station_id, "page": page, "size": size}
    if amenity_types is not None:
        variables["amenityTypes"] = amenity_types

    data = gql(_AMENITY_LIST, variables)
    return data["amenityList"]

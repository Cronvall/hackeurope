"""
Operators API — list charge point operators, optionally filtered.

Key types (from schema introspection):
  operatorList(query: OperatorListQuery, filter: OperatorListFilter, search, size, page)
    OperatorListQuery:  id, external_id, name, country  (exact match / lookup)
    OperatorListFilter: countries ([String]), ranking ([String]),
                        excluded (Boolean), excluded_countries ([String])
"""

from client import gql

# ---------------------------------------------------------------------------
# GraphQL documents
# ---------------------------------------------------------------------------

_OPERATOR_LIST = """
query operatorList($query: OperatorListQuery, $search: String, $page: Int, $size: Int) {
  operatorList(query: $query, search: $search, page: $page, size: $size) {
    id
    name
    country
    contact {
      phone
      website
    }
  }
}
"""

_OPERATOR_LIST_FILTERED = """
query operatorListFiltered($filter: OperatorListFilter!, $page: Int, $size: Int) {
  operatorList(filter: $filter, page: $page, size: $size) {
    id
    name
    country
    contact {
      phone
      website
    }
  }
}
"""

_OPERATOR = """
query operator($id: ID!) {
  operator(id: $id) {
    id
    name
    country
    contact {
      phone
      website
    }
  }
}
"""

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def operator_list(
    search: str | None = None,
    country: str | None = None,
    page: int = 0,
    size: int = 20,
) -> list[dict]:
    """
    Fetch operators, optionally filtered by text search or country.

    Args:
        search:     Free-text search across operator names.
        country:    ISO 3166-1 alpha-2 country code for exact match, e.g. "DE", "NL".
        page, size: Pagination.

    Returns:
        List of operator dicts with id, name, country, contact.
    """
    variables: dict = {"page": page, "size": size}
    if search is not None:
        variables["search"] = search
    if country is not None:
        variables["query"] = {"country": country}

    data = gql(_OPERATOR_LIST, variables)
    return data["operatorList"]


def operator_list_filtered(
    countries: list[str] | None = None,
    excluded: bool | None = None,
    excluded_countries: list[str] | None = None,
    page: int = 0,
    size: int = 20,
) -> list[dict]:
    """
    Fetch operators with OperatorListFilter (used for route operator preferences).

    Args:
        countries:          Restrict to operators in these country codes, e.g. ["DE", "NL"].
        excluded:           If True, return only excluded operators.
        excluded_countries: Return operators NOT in these countries.
        page, size:         Pagination.

    Returns:
        List of operator dicts.
    """
    filter_input: dict = {}
    if countries is not None:
        filter_input["countries"] = countries
    if excluded is not None:
        filter_input["excluded"] = excluded
    if excluded_countries is not None:
        filter_input["excluded_countries"] = excluded_countries

    data = gql(_OPERATOR_LIST_FILTERED, {"filter": filter_input, "page": page, "size": size})
    return data["operatorList"]


def get_operator(operator_id: str) -> dict:
    """Fetch a single operator by ID."""
    data = gql(_OPERATOR, {"id": operator_id})
    return data["operator"]

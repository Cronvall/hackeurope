"""
Chargetrip GraphQL client — base layer used by all other modules.

Reads credentials from .env (or the environment) and exposes two functions:

  gql(query, variables)       Execute any query or mutation. Returns data dict.
  introspect_type(type_name)  Inspect any GraphQL type from the schema.

Environment variables required (copy .env.example → .env and fill in):
  CHARGE_TRIP_PROJECT_ID   Sent as x-client-id. Found on the project overview page.
  CHARGE_TRIP_APP_ID       Sent as x-app-id. Found under the app created in your project.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

URL = "https://api.chargetrip.io/graphql"

HEADERS = {
    "Content-Type": "application/json",
    "x-client-id": os.getenv("CHARGE_TRIP_PROJECT_ID", ""),
    "x-app-id": os.getenv("CHARGE_TRIP_APP_ID", ""),
}


class GraphQLError(Exception):
    def __init__(self, errors: list):
        msgs = [e.get("message", str(e)) for e in errors]
        super().__init__("; ".join(msgs))
        self.errors = errors


def gql(query: str, variables: dict | None = None) -> dict:
    """Execute a GraphQL query or mutation. Returns the `data` dict."""
    payload: dict = {"query": query}
    if variables:
        payload["variables"] = variables

    resp = httpx.post(URL, headers=HEADERS, json=payload, timeout=30)

    # Read body before raise_for_status so GraphQL error details aren't lost on 4xx.
    body = resp.json()
    if "errors" in body:
        raise GraphQLError(body["errors"])

    resp.raise_for_status()
    return body["data"]


def introspect_type(type_name: str) -> dict:
    """Fetch the fields of a named GraphQL type — useful for exploring the schema."""
    query = """
    query IntrospectType($name: String!) {
      __type(name: $name) {
        name
        fields {
          name
          type { name kind ofType { name kind } }
          args { name type { name kind ofType { name kind } } }
        }
        inputFields {
          name
          type { name kind ofType { name kind } }
        }
      }
    }
    """
    return gql(query, {"name": type_name})

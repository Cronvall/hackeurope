"""
Async pre-orchestrator — gathers all Chargetrip data in parallel
before Claude's single synthesis call.

Flow:
  1. plan_route()                   — blocking, must finish first (need stop coordinates)
  2. per charge leg, in parallel:
       - station_around(turbo/fast) — Route A candidates
       - station_around(amenities)  — Route B/C candidates
       - amenity_list(base station) — context for base stop
  3. amenity_list for top alternative candidates — parallel
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging
import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from chargetrip_experiment import routes, stations

log = logging.getLogger("orchestrator")
_executor = ThreadPoolExecutor(max_workers=12)

_CHARGE_LEG_TYPES = {"station", "stationVia", "stationAmenity", "stationFinal"}


async def _run(fn, *args, **kwargs):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, lambda: fn(*args, **kwargs))


def _max_power(station: dict) -> float:
    """Return max connector power (raw units) across all EVSEs — used for sorting only."""
    best = 0.0
    for evse in station.get("evses") or []:
        for conn in evse.get("connectors") or []:
            best = max(best, conn.get("max_electric_power") or 0.0)
    return best


async def gather_trip_data(
    vehicle_id: str,
    origin: dict,
    destination: dict,
    user_amenity_prefs: list[str],
) -> dict:
    """
    Gather everything Claude needs to synthesise 3 route alternatives.

    Returns a dict containing:
      base_route        — full Chargetrip route result
      charge_stops      — list of per-leg dicts with nearby station candidates
      candidate_amenities — {station_id: [amenity, ...]} for top alternatives
    """
    # --- 1. Base route (sequential — need stop coords before step 2) ---
    log.info("[2/3] ORCHESTRATE  step 1/3  planning base route ...")
    t0 = time.perf_counter()
    base_route = await _run(routes.create_and_wait, vehicle_id, origin, destination)
    all_legs = base_route.get("legs") or []
    charge_legs = [leg for leg in all_legs if leg.get("type") in _CHARGE_LEG_TYPES]
    log.info("[2/3] ORCHESTRATE  step 1/3  done (%.1fs)  legs=%d  charge_stops=%d  "
             "distance=%.0fkm  duration=%.0fmin",
             time.perf_counter() - t0,
             len(all_legs),
             len(charge_legs),
             (base_route.get("distance") or 0) / 1000,
             (base_route.get("duration") or 0) / 60)

    # --- 2. Parallel discovery per charge stop ---
    async def discover_stop(i: int, leg: dict) -> dict:
        dest = (leg.get("destination") or {}).get("geometry", {}).get("coordinates")
        stop_name = leg.get("name") or leg.get("operatorName") or f"stop {i+1}"
        if not dest or len(dest) < 2:
            log.warning("[2/3] ORCHESTRATE  stop %d/%d (%s)  no coordinates — skipping",
                        i + 1, len(charge_legs), stop_name)
            return {"leg": leg, "fast_stations": [], "amenity_stations": [], "base_amenities": []}

        lon, lat = dest[0], dest[1]
        station_id = leg.get("stationId")
        log.info("[2/3] ORCHESTRATE  step 2/3  stop %d/%d (%s)  lon=%.4f lat=%.4f  "
                 "firing %d parallel requests ...",
                 i + 1, len(charge_legs), stop_name, lon, lat,
                 3 if station_id else 2)

        t_stop = time.perf_counter()
        gather_tasks: list = [
            # Fast/turbo chargers nearby → Route A
            _run(stations.station_around, lon, lat, 10_000,
                 None, None, None, ["turbo", "fast"], False, 0, 6),
            # Stations near user-preferred amenities → Route B/C
            _run(stations.station_around, lon, lat, 8_000,
                 None, user_amenity_prefs or None, None, None, False, 0, 8),
        ]

        amenity_idx = None
        if station_id:
            amenity_idx = len(gather_tasks)
            gather_tasks.append(_run(stations.amenity_list, station_id, None, 0, 6))

        results = await asyncio.gather(*gather_tasks, return_exceptions=True)

        fast_st = results[0] if isinstance(results[0], list) else []
        amen_st = results[1] if isinstance(results[1], list) else []
        base_am = results[amenity_idx] if (amenity_idx is not None and isinstance(results[amenity_idx], list)) else []

        if isinstance(results[0], Exception):
            log.warning("[2/3] ORCHESTRATE  stop %d fast_stations failed: %s", i + 1, results[0])
        if isinstance(results[1], Exception):
            log.warning("[2/3] ORCHESTRATE  stop %d amenity_stations failed: %s", i + 1, results[1])
        if amenity_idx is not None and isinstance(results[amenity_idx], Exception):
            log.warning("[2/3] ORCHESTRATE  stop %d base_amenities failed: %s", i + 1, results[amenity_idx])

        fast_sorted = sorted(fast_st, key=_max_power, reverse=True)[:4]
        log.info("[2/3] ORCHESTRATE  stop %d/%d done (%.1fs)  "
                 "fast=%d  amenity_nearby=%d  base_amenities=%d",
                 i + 1, len(charge_legs), time.perf_counter() - t_stop,
                 len(fast_sorted), len(amen_st[:5]), len(base_am))

        return {
            "leg": leg,
            "fast_stations": fast_sorted,
            "amenity_stations": amen_st[:5],
            "base_amenities": base_am,
        }

    log.info("[2/3] ORCHESTRATE  step 2/3  discovering stations for %d charge stop(s) in parallel ...",
             len(charge_legs))
    t1 = time.perf_counter()
    stop_data = list(await asyncio.gather(*[discover_stop(i, leg) for i, leg in enumerate(charge_legs)]))
    log.info("[2/3] ORCHESTRATE  step 2/3  done (%.1fs)", time.perf_counter() - t1)

    # --- 3. Amenities for top alternative station candidates ---
    candidate_ids: list[str] = []
    seen: set[str] = set()
    for sd in stop_data:
        for st in sd["amenity_stations"][:3]:
            sid = st.get("id")
            if sid and sid not in seen:
                seen.add(sid)
                candidate_ids.append(sid)

    log.info("[2/3] ORCHESTRATE  step 3/3  fetching amenities for %d candidate station(s) in parallel ...",
             len(candidate_ids))
    t2 = time.perf_counter()
    if candidate_ids:
        amens = await asyncio.gather(
            *[_run(stations.amenity_list, sid, None, 0, 5) for sid in candidate_ids],
            return_exceptions=True,
        )
        candidate_amenities = {
            sid: (a if isinstance(a, list) else [])
            for sid, a in zip(candidate_ids, amens)
        }
        for sid, a in zip(candidate_ids, amens):
            if isinstance(a, Exception):
                log.warning("[2/3] ORCHESTRATE  amenity_list(%s) failed: %s", sid, a)
    else:
        candidate_amenities = {}

    log.info("[2/3] ORCHESTRATE  step 3/3  done (%.1fs)  amenities gathered for %d stations",
             time.perf_counter() - t2, len(candidate_amenities))

    return {
        "base_route": base_route,
        "charge_stops": stop_data,
        "candidate_amenities": candidate_amenities,
    }

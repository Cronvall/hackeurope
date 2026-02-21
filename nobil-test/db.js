const Database = require('better-sqlite3');
const path = require('path');

let db;

// Routes approximate major highways between cities. randomCoord() picks a
// random route and interpolates along it so mock chargers land near roads.
const ROUTES = {
  SWE: [
    [[59.3293, 18.0686], [57.7089, 11.9746]], // Stockholm → Gothenburg (E4/E20)
    [[57.7089, 11.9746], [55.6050, 13.0038]], // Gothenburg → Malmö (E6)
    [[59.3293, 18.0686], [55.6050, 13.0038]], // Stockholm → Malmö (E4)
    [[59.3293, 18.0686], [59.8586, 17.6389]], // Stockholm → Uppsala (E4)
    [[59.3293, 18.0686], [58.5877, 16.1924]], // Stockholm → Norrköping (E4)
    [[58.5877, 16.1924], [58.4108, 15.6214]], // Norrköping → Linköping (E4)
    [[58.4108, 15.6214], [57.7826, 14.1618]], // Linköping → Jönköping (E4)
    [[57.7826, 14.1618], [57.7089, 11.9746]], // Jönköping → Gothenburg (E4)
    [[57.7089, 11.9746], [57.7210, 12.9401]], // Gothenburg → Borås (E20)
    [[59.8586, 17.6389], [60.6749, 17.1413]], // Uppsala → Gävle (E4)
    [[60.6749, 17.1413], [62.3908, 17.3069]], // Gävle → Sundsvall (E4)
    [[62.3908, 17.3069], [63.8258, 20.2630]], // Sundsvall → Umeå (E4)
    [[59.3793, 13.5037], [57.7089, 11.9746]], // Karlstad → Gothenburg (E18)
    [[59.3793, 13.5037], [59.2741, 15.2066]], // Karlstad → Örebro (E18)
    [[59.2741, 15.2066], [59.3293, 18.0686]], // Örebro → Stockholm (E18/E20)
    [[56.0465, 12.6945], [55.6050, 13.0038]], // Helsingborg → Malmö (E6)
    [[56.0465, 12.6945], [57.7089, 11.9746]], // Helsingborg → Gothenburg (E6)
    [[59.6099, 16.5448], [59.3293, 18.0686]], // Västerås → Stockholm (E18)
  ],
  NOR: [
    [[59.9139, 10.7522], [59.7440, 10.2045]], // Oslo → Drammen (E18)
    [[59.9139, 10.7522], [63.4305, 10.3951]], // Oslo → Trondheim (E6)
    [[59.9139, 10.7522], [58.1599,  7.9956]], // Oslo → Kristiansand (E18)
    [[59.9139, 10.7522], [59.2181, 10.9298]], // Oslo → Fredrikstad (E6)
    [[58.1599,  7.9956], [58.9700,  5.7331]], // Kristiansand → Stavanger (E39)
    [[58.9700,  5.7331], [60.3913,  5.3221]], // Stavanger → Bergen (E39)
    [[60.3913,  5.3221], [62.4722,  6.1495]], // Bergen → Ålesund (E39)
    [[62.4722,  6.1495], [63.4305, 10.3951]], // Ålesund → Trondheim (E136/E6)
    [[63.4305, 10.3951], [69.6489, 18.9551]], // Trondheim → Tromsø (E6)
    [[59.7440, 10.2045], [60.3913,  5.3221]], // Drammen → Bergen (E134)
  ],
  FIN: [
    [[60.1699, 24.9384], [60.2052, 24.6522]], // Helsinki → Espoo (E18)
    [[60.1699, 24.9384], [60.4518, 22.2666]], // Helsinki → Turku (E18)
    [[60.1699, 24.9384], [60.9827, 25.6612]], // Helsinki → Lahti (E12)
    [[60.9827, 25.6612], [61.4991, 23.7871]], // Lahti → Tampere (E12)
    [[61.4991, 23.7871], [62.2426, 25.7473]], // Tampere → Jyväskylä (E63)
    [[62.2426, 25.7473], [62.8980, 27.6782]], // Jyväskylä → Kuopio (E63)
    [[62.8980, 27.6782], [65.0121, 25.4651]], // Kuopio → Oulu (E63)
    [[61.4991, 23.7871], [65.0121, 25.4651]], // Tampere → Oulu (E63)
  ],
};

const CPOS_BY_COUNTRY = {
  SWE: ['Vattenfall InCharge', 'IONITY', 'Clever', 'Recharge', 'Circle K', 'Mer', 'Fortum', 'Bee'],
  NOR: ['Recharge', 'Circle K', 'Mer', 'Kempower', 'Fortum', 'IONITY', 'Eviny', 'Easee'],
  FIN: ['Virta', 'K-Lataus', 'Fortum', 'Recharge', 'IONITY', 'ABC-lataus', 'Helen'],
};

function countryFromNobilId(nobilId) {
  if (!nobilId || typeof nobilId !== 'string') return null;
  const prefix = nobilId.split('_')[0];
  if (ROUTES[prefix]) return prefix;
  return null;
}

function randomCoord(country) {
  const routes = ROUTES[country] || ROUTES.SWE;
  const [a, b] = routes[Math.floor(Math.random() * routes.length)];
  const t = Math.random(); // position along the route
  const lat = a[0] + t * (b[0] - a[0]);
  const lng = a[1] + t * (b[1] - a[1]);
  const jitter = () => (Math.random() - 0.5) * 0.006; // ±0.003°, ~300m
  return {
    latitude:  Math.round((lat + jitter()) * 1e6) / 1e6,
    longitude: Math.round((lng + jitter()) * 1e6) / 1e6,
  };
}

function randomCpo(country) {
  const list = CPOS_BY_COUNTRY[country] || CPOS_BY_COUNTRY.SWE;
  return list[Math.floor(Math.random() * list.length)];
}

function initDb() {
  db = new Database(path.join(__dirname, 'evse_enrichment.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS evse_enrichment (
      evse_id                  TEXT PRIMARY KEY,
      nobil_id                 TEXT NOT NULL,
      latitude                 REAL NOT NULL,
      longitude                REAL NOT NULL,
      cpo_party_id             TEXT NOT NULL,
      charging_cluster_id      TEXT NOT NULL,
      charging_cluster_capacity INTEGER NOT NULL
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_cluster ON evse_enrichment(charging_cluster_id)`);

  return db;
}

const stmts = {};
function prepare() {
  if (stmts.ready) return;
  stmts.findByEvse    = db.prepare('SELECT * FROM evse_enrichment WHERE evse_id = ?');
  stmts.findCluster   = db.prepare('SELECT latitude, longitude, cpo_party_id FROM evse_enrichment WHERE charging_cluster_id = ? LIMIT 1');
  stmts.countCluster  = db.prepare('SELECT COUNT(*) AS cnt FROM evse_enrichment WHERE charging_cluster_id = ?');
  stmts.insert        = db.prepare(`
    INSERT INTO evse_enrichment (evse_id, nobil_id, latitude, longitude, cpo_party_id, charging_cluster_id, charging_cluster_capacity)
    VALUES (@evse_id, @nobil_id, @latitude, @longitude, @cpo_party_id, @charging_cluster_id, @charging_cluster_capacity)
  `);
  stmts.updateCap     = db.prepare('UPDATE evse_enrichment SET charging_cluster_capacity = ? WHERE charging_cluster_id = ?');
  stmts.all           = db.prepare('SELECT * FROM evse_enrichment');
  stmts.ready = true;
}

function getOrCreateCluster(nobilId) {
  prepare();
  const existing = stmts.findCluster.get(nobilId);
  if (existing) return existing;

  const country = countryFromNobilId(nobilId) || 'SWE';
  const coord = randomCoord(country);
  return { latitude: coord.latitude, longitude: coord.longitude, cpo_party_id: randomCpo(country) };
}

const ensureEvseTransaction = () => db.transaction((evseUId, nobilId) => {
  prepare();

  const existing = stmts.findByEvse.get(evseUId);
  if (existing) return existing;

  const clusterId = nobilId;
  const cluster = getOrCreateCluster(nobilId);

  const { cnt } = stmts.countCluster.get(clusterId);
  const newCapacity = cnt + 1;

  stmts.insert.run({
    evse_id: evseUId,
    nobil_id: nobilId,
    latitude: cluster.latitude,
    longitude: cluster.longitude,
    cpo_party_id: cluster.cpo_party_id,
    charging_cluster_id: clusterId,
    charging_cluster_capacity: newCapacity,
  });

  if (cnt > 0) {
    stmts.updateCap.run(newCapacity, clusterId);
  }

  return stmts.findByEvse.get(evseUId);
});

let _ensureEvse;

const EXCLUDED_COUNTRIES = new Set(['DAN']);

function ensureEvse(evseUId, nobilId) {
  if (!evseUId || !nobilId) return null;
  const prefix = nobilId.split('_')[0];
  if (EXCLUDED_COUNTRIES.has(prefix)) return null;
  if (!_ensureEvse) _ensureEvse = ensureEvseTransaction();
  return _ensureEvse(evseUId, nobilId);
}

function getEnrichedData() {
  prepare();
  return stmts.all.all();
}

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Re-populate charging_cluster_id / charging_cluster_capacity ───────────────
// Groups stations belonging to the same CPO that are within radiusKm of each
// other into a single cluster. Writes results back into the existing columns —
// no schema changes needed.
function computeCpoClusters(radiusKm = 150) {
  prepare();

  // One row per station: average coordinates + total EVSE count
  const stations = db.prepare(`
    SELECT nobil_id, cpo_party_id,
           AVG(latitude)  AS lat,
           AVG(longitude) AS lng,
           COUNT(*)       AS evse_count
    FROM evse_enrichment
    GROUP BY nobil_id
  `).all();

  // Group stations by CPO
  const byCpo = new Map();
  for (const s of stations) {
    if (!byCpo.has(s.cpo_party_id)) byCpo.set(s.cpo_party_id, []);
    byCpo.get(s.cpo_party_id).push({ ...s, assigned: false });
  }

  const updateStmt = db.prepare(
    'UPDATE evse_enrichment SET charging_cluster_id = ?, charging_cluster_capacity = ? WHERE nobil_id = ?'
  );

  let totalClusters = 0;

  db.transaction(() => {
    for (const [cpo, stationList] of byCpo) {
      // Sanitise CPO name for use as an ID component
      const slug = cpo.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/, '');
      let n = 0;

      for (let i = 0; i < stationList.length; i++) {
        if (stationList[i].assigned) continue;

        n++;
        const clusterId = `${slug}_${n}`;
        const seed = stationList[i];

        // Greedy sweep: assign all unassigned stations within radius of seed
        const members = [];
        for (const s of stationList) {
          if (!s.assigned && haversineKm(seed.lat, seed.lng, s.lat, s.lng) <= radiusKm) {
            s.assigned = true;
            members.push(s);
          }
        }

        const totalEvses = members.reduce((sum, s) => sum + s.evse_count, 0);

        for (const s of members) {
          updateStmt.run(clusterId, totalEvses, s.nobil_id);
        }

        totalClusters++;
      }
    }
  })();

  console.log(`computeCpoClusters: ${stations.length} stations → ${totalClusters} CPO clusters (radius=${radiusKm} km)`);
}

module.exports = { initDb, ensureEvse, getEnrichedData, computeCpoClusters };

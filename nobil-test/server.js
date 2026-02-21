require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fetch = require('node-fetch');
const path = require('path');
const { initDb, ensureEvse, getEnrichedData, computeCpoClusters } = require('./db');

const API_KEY = process.env.NOBIL_API_KEY;
const PORT = parseInt(process.env.PORT || '3000', 10);
const WS_PORT = 3001;

if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.error('ERROR: Set NOBIL_API_KEY in your .env file');
  process.exit(1);
}

initDb();
computeCpoClusters();

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/enriched', (_req, res) => {
  res.json(getEnrichedData());
});

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`HTTP server running at http://localhost:${PORT}`);
});

// ── Local WebSocket (re-broadcasts NOBIL stream to browser clients) ──────────
const wss = new WebSocketServer({ port: WS_PORT });
console.log(`Local WebSocket server on ws://localhost:${WS_PORT}`);

const evseStatus = new Map();
let messageCount = 0;

function broadcast(data) {
  const msg = typeof data === 'string' ? data : JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  console.log('Browser client connected');
  ws.send(JSON.stringify({
    type: 'snapshot',
    data: Object.fromEntries(evseStatus),
    messageCount,
  }));
});

// ── NOBIL real-time stream ───────────────────────────────────────────────────
let nobilWs = null;
let reconnectTimer = null;

async function getNobilWssUrl() {
  const res = await fetch('https://api.data.enova.no/nobil/real-time/v1/Realtime', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'Content-Length': '0' },
  });
  if (!res.ok) throw new Error(`Failed to get WSS URL: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.accessToken;
}

async function connectNobil() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  let wssUrl;
  try {
    console.log('Fetching NOBIL WebSocket URL...');
    wssUrl = await getNobilWssUrl();
    console.log('Got WSS URL, connecting...');
  } catch (err) {
    console.error('Could not get NOBIL WSS URL:', err.message);
    scheduleReconnect();
    return;
  }

  nobilWs = new WebSocket(wssUrl);

  nobilWs.on('open', () => {
    console.log('Connected to NOBIL real-time stream');
    broadcast({ type: 'connection', status: 'connected' });
  });

  nobilWs.on('message', (raw) => {
    const text = raw.toString();
    let msg;
    try { msg = JSON.parse(text); } catch { return; }

    messageCount++;

    const { nobilId, evseUId, status } = msg;
    if (evseUId && status) {
      evseStatus.set(evseUId, { nobilId, status, timestamp: Date.now() });
      ensureEvse(evseUId, nobilId);
    }

    broadcast({ type: 'update', raw: msg, messageCount });

    if (messageCount % 50 === 0) {
      console.log(`${messageCount} messages received, ${evseStatus.size} unique EVSEs tracked`);
    }
  });

  nobilWs.on('close', (code, reason) => {
    console.log(`NOBIL stream closed (${code}): ${reason}`);
    broadcast({ type: 'connection', status: 'disconnected' });
    scheduleReconnect();
  });

  nobilWs.on('error', (err) => {
    console.error('NOBIL WebSocket error:', err.message);
  });
}

function scheduleReconnect(delay = 5000) {
  console.log(`Reconnecting in ${delay / 1000}s...`);
  reconnectTimer = setTimeout(connectNobil, delay);
}

connectNobil();

// localStorage wrappers replacing v2's window.storage API

const STORAGE_KEY = "ev-community-submissions";
const VOTES_KEY = "ev-community-votes";
const USERS_KEY = "ev-community-users";
const SESSION_KEY = "ev-community-session";
const EV_SETTINGS_KEY = "ev-settings";

function getItem(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

function setItem(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("Storage error:", e); }
}

export async function loadUsers() { return getItem(USERS_KEY) || {}; }
export async function saveUsers(users) { setItem(USERS_KEY, users); }

export async function loadSession() { return getItem(SESSION_KEY); }
export async function saveSession(session) { setItem(SESSION_KEY, session); }
export async function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch {} }

export async function loadSubmissions() { return getItem(STORAGE_KEY) || []; }
export async function saveSubmissions(submissions) { setItem(STORAGE_KEY, submissions); }

export async function loadVotes() { return getItem(VOTES_KEY) || {}; }
export async function saveVotes(votes) { setItem(VOTES_KEY, votes); }

export function loadEvSettings() { return getItem(EV_SETTINGS_KEY); }
export function saveEvSettings(settings) { setItem(EV_SETTINGS_KEY, settings); }

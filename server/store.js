// Tiny single-user JSON-file persistence layer.
// This app has one user (personal use), so state is a single blob on disk.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const SUBS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureDir();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function getState() {
  return readJSON(STATE_FILE, null);
}

function setState(state) {
  writeJSON(STATE_FILE, state);
}

function getSubscriptions() {
  return readJSON(SUBS_FILE, []);
}

function addSubscription(sub) {
  const subs = getSubscriptions();
  if (!subs.find((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    writeJSON(SUBS_FILE, subs);
  }
}

function removeSubscription(endpoint) {
  const subs = getSubscriptions().filter((s) => s.endpoint !== endpoint);
  writeJSON(SUBS_FILE, subs);
}

module.exports = {
  DATA_DIR,
  getState,
  setState,
  getSubscriptions,
  addSubscription,
  removeSubscription,
};

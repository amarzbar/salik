const express = require('express');
const path = require('path');
const store = require('./store');
const push = require('./push');
const scheduler = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3011;
const DIST_DIR = path.join(__dirname, '..', 'dist');

app.use(express.json({ limit: '2mb' }));

// ── State sync (single-user: whole AppState blob) ──────────────────
app.get('/api/state', (req, res) => {
  const state = store.getState();
  res.json({ state });
});

app.put('/api/state', (req, res) => {
  const { state } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'missing state' });
  }
  store.setState(state);
  res.json({ ok: true });
});

// ── Push notifications ──────────────────────────────────────────────
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: push.vapidKeys.publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub?.endpoint) return res.status(400).json({ error: 'invalid subscription' });
  store.addSubscription(sub);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) store.removeSubscription(endpoint);
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  await push.sendToAll({ title: 'Murid Day Journal', body: 'Test notification 🔔', url: '/' });
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Static frontend ─────────────────────────────────────────────────
app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Murid Day Journal server listening on :${PORT}`);
  scheduler.start();
});

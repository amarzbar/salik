const express = require('express');
const fs = require('fs');
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

// ── Dhikr texts (PDFs from shaykhfaisal.com, cached on first open) ──
// Kept out of the repo: fetched from the Shaykh's site once, then served
// from the data volume so they still open when the site is slow or down.
const TEXT_SOURCES = {
  wirdul_aam: 'https://shaykhfaisal.com/wp-content/uploads/2021/01/AL-WIRDUL-AAM-DHIKR.pdf',
  salat_taziyyah: 'https://shaykhfaisal.com/wp-content/uploads/2021/01/AL-SALAT-AL-TAAZIYYAH-DHIKR.pdf',
  hasbunallah: 'https://shaykhfaisal.com/wp-content/uploads/2021/01/HASBUNALLAH-DHIKR.pdf',
  hizbul_bahr: 'https://shaykhfaisal.com/wp-content/uploads/2021/03/HIZBUL-BAHR-DHIKR.pdf',
  latifiyyah: 'https://shaykhfaisal.com/wp-content/uploads/2021/01/AL-LATIFIYYAH-DHIKR.pdf',
  mashishiyyah: 'https://shaykhfaisal.com/wp-content/uploads/2021/03/SALAWAAT-05-AL-SALAT-AL-MASHISHIYYAH-06-Text-Arabic-English-Transliteration.pdf',
};
const TEXTS_DIR = path.join(store.DATA_DIR, 'texts');

app.get('/api/texts/:id.pdf', async (req, res) => {
  const src = TEXT_SOURCES[req.params.id];
  if (!src) return res.status(404).end();
  const file = path.join(TEXTS_DIR, `${req.params.id}.pdf`);
  try {
    if (!fs.existsSync(file)) {
      const r = await fetch(src);
      if (!r.ok) return res.status(502).json({ error: `source returned ${r.status}` });
      fs.mkdirSync(TEXTS_DIR, { recursive: true });
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    }
    res.type('application/pdf').sendFile(file);
  } catch (err) {
    res.status(502).json({ error: 'could not fetch text' });
  }
});

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

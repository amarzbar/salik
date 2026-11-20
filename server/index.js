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
  await push.sendToAll({ title: 'Salik', body: 'Test notification', url: '/' });
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
// Texts that aren't on the Shaykh's site ship with the app in server/texts/.
const BUNDLED_TEXTS = new Set(['dua_after_dhikr']);

app.get('/api/texts/:id.pdf', async (req, res) => {
  if (BUNDLED_TEXTS.has(req.params.id)) {
    return res.type('application/pdf').sendFile(path.join(__dirname, 'texts', `${req.params.id}.pdf`));
  }
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

// ── Dhikr audio (recitations from shaykhfaisal.com, cached on first play) ──
// Same pattern as the texts: fetched from the Shaykh's site once, then served from the data
// volume. Serving it from our own origin is what lets the app save a copy on the device for
// offline listening (the site doesn't allow cross-origin downloads). sendFile handles Range
// requests, so the player can still stream and seek before the copy is saved.
const AUDIO_SOURCES = {
  wirdul_aam: 'https://shaykhfaisal.com/wp-content/uploads/custom/AL-WIRDUL-AAM.mp3',
  salat_taziyyah: 'https://shaykhfaisal.com/wp-content/uploads/2020/11/AL-SALAT-AL-TAAZIYYAH-DHIKR.mp3',
  hasbunallah: 'https://shaykhfaisal.com/wp-content/uploads/custom/HASBUNALLAH.mp3',
  hizbul_bahr: 'https://shaykhfaisal.com/wp-content/uploads/custom/HizbulBahar.mp3',
  latifiyyah: 'https://shaykhfaisal.com/wp-content/uploads/custom/AL-LATIFIYYAH.mp3',
  mashishiyyah: 'https://shaykhfaisal.com/wp-content/uploads/2021/01/AL-SALAT-AL-MASHISHIYYAH-03.mp3',
};
const AUDIO_DIR = path.join(store.DATA_DIR, 'audio');
const audioDownloads = new Map(); // id -> in-flight download, so parallel requests share one fetch

app.get('/api/audio/:id.mp3', async (req, res) => {
  const src = AUDIO_SOURCES[req.params.id];
  if (!src) return res.status(404).end();
  const file = path.join(AUDIO_DIR, `${req.params.id}.mp3`);
  try {
    if (!fs.existsSync(file)) {
      if (!audioDownloads.has(req.params.id)) {
        audioDownloads.set(req.params.id, (async () => {
          const r = await fetch(src);
          if (!r.ok) throw new Error(`source returned ${r.status}`);
          fs.mkdirSync(AUDIO_DIR, { recursive: true });
          const tmp = `${file}.part`;
          fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
          fs.renameSync(tmp, file); // atomic: never serve a half-written file
        })().finally(() => audioDownloads.delete(req.params.id)));
      }
      await audioDownloads.get(req.params.id);
    }
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.type('audio/mpeg').sendFile(file);
  } catch (err) {
    res.status(502).json({ error: 'could not fetch audio' });
  }
});

// ── Voice notes: speech-to-text via the local Whisper service ───────
// The browser records with MediaRecorder (audio/mp4 on iOS, audio/webm
// elsewhere) and posts the raw bytes here; we forward them to the
// `whisper` container (speaches, OpenAI-compatible API, CPU) on the
// compose network. Audio never leaves mavis.
const WHISPER_URL = process.env.WHISPER_URL || 'http://whisper:8000';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'Systran/faster-whisper-small';
// Nudges Whisper towards the spellings used in the app.
const WHISPER_PROMPT =
  'Journal note. Salah, Fajr, Dhuhr, Asr, Maghrib, Isha, dhikr, Wirdul Aam, Hizbul Bahr, ' +
  "Salawat, Shaykh, Sayyid, Sidi, Tariqah, halaqah, du'a, InshaAllah, Alhamdulillah, SubhanAllah, MashaAllah.";

async function whisperTranscribe(buf, type) {
  const ext = type.includes('mp4') || type.includes('m4a') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('file', new Blob([buf], { type }), `note.${ext}`);
  form.append('model', WHISPER_MODEL);
  form.append('prompt', WHISPER_PROMPT);
  form.append('response_format', 'json');
  return fetch(`${WHISPER_URL}/v1/audio/transcriptions`, { method: 'POST', body: form });
}

app.post('/api/transcribe', express.raw({ type: 'audio/*', limit: '25mb' }), async (req, res) => {
  if (!req.body?.length) return res.status(400).json({ error: 'no audio' });
  const type = req.get('content-type') || 'audio/webm';
  try {
    let r = await whisperTranscribe(req.body, type);
    if (r.status === 404) {
      // First use: the model isn't downloaded yet. Fetch it, then retry once.
      await fetch(`${WHISPER_URL}/v1/models/${WHISPER_MODEL}`, { method: 'POST' });
      r = await whisperTranscribe(req.body, type);
    }
    if (!r.ok) {
      console.error('[transcribe] whisper', r.status, (await r.text()).slice(0, 300));
      return res.status(502).json({ error: 'transcription failed' });
    }
    const { text } = await r.json();
    res.json({ text: (text || '').trim() });
  } catch (err) {
    console.error('[transcribe]', err.message);
    res.status(502).json({ error: 'transcription service unavailable' });
  }
});

// ── Static frontend ─────────────────────────────────────────────────
app.use(express.static(DIST_DIR));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Salik server listening on :${PORT}`);
  scheduler.start();
});

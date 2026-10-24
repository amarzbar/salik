// Minute-tick reminder scheduler: prayer times, dhikr times, and Islamic-date
// action-item reminders. Single-user app — reads the one saved AppState.

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const store = require('./store');
const push = require('./push');
const { calcPrayerTimes, resolveLocation } = require('./prayerTimes');
const { gregorianToHijri } = require('./hijri');
const { ISLAMIC_EVENTS } = require('./islamicEvents');

const SENT_LOG_FILE = path.join(store.DATA_DIR, 'sent-log.json');
const QUEUE_STATE_FILE = path.join(store.DATA_DIR, 'notif-queue-state.json');

const DHIKR_DEFS = [
  { id: 'wirdul_aam_fajr',    name: 'Wirdul Aam',          prayer: 'fajr' },
  { id: 'hasbunallah_dhuhr',  name: 'Hasbunallah',         prayer: 'dhuhr' },
  { id: 'hizbul_bahr_asr',    name: 'Hizbul Bahr',         prayer: 'asr' },
  { id: 'wirdul_aam_maghrib', name: 'Wirdul Aam',          prayer: 'maghrib' },
  { id: 'salatut_taaziyah',   name: "Salatut Ta'ziyah",   prayer: 'all' },
];

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYER_LABELS = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

// Rotating bank of short, well-known, authentically-sourced hadith on the
// virtue of Salah — deterministic rotation (by day-of-year), not repeats.
const SALAH_HADITH = [
  { text: "The first matter that the slave will be brought to account for on the Day of Judgment is the prayer. If it is sound, the rest of his deeds will be sound.", source: "Al-Tabarani" },
  { text: "The five daily prayers are an expiation for the sins committed in between them, so long as major sins are avoided.", source: "Sahih Muslim" },
  { text: "Whoever guards the five prayers — perfecting their bowing, their humility, and their timing — will meet Allah with a covenant to enter Paradise.", source: "Musnad Ahmad" },
  { text: "Prayer is light.", source: "Sahih Muslim" },
  { text: "The coolness of my eyes has been placed in prayer.", source: "Musnad Ahmad" },
  { text: "Between a person and disbelief is the abandonment of prayer.", source: "Sahih Muslim" },
  { text: "Whoever prays Fajr is under the protection of Allah.", source: "Sahih Muslim" },
  { text: "The servant is closest to his Lord while prostrating, so increase your supplication then.", source: "Sahih Muslim" },
  { text: "Whoever prays the two cool prayers — Fajr and Asr — will enter Paradise.", source: "Sahih al-Bukhari & Muslim" },
  { text: "If there was a river at the door of one of you in which he bathed five times a day, would any dirt remain on him? That is the likeness of the five prayers — Allah erases sins by them.", source: "Sahih al-Bukhari & Muslim" },
];

// ── Anti-stacking outbound queue ────────────────────────────────────────────
// Non-prayer notifications (dhikr, reflection, events, end-of-day) go through
// here instead of being sent directly — a minimum gap is enforced between
// them so a user never gets a burst of simultaneous/near-simultaneous
// lock-screen alerts. Prayer-time reminders are exempt (see sendImmediate) —
// those are time-critical and must never be delayed — but a prayer send
// still bumps lastSentAt, so a queued item doesn't immediately follow it.
const MIN_GAP_MS = 3 * 60 * 60 * 1000; // 3 hours between any two non-prayer notifications
let _queue = [];

function loadQueueState() {
  try { return JSON.parse(fs.readFileSync(QUEUE_STATE_FILE, 'utf8')); } catch { return { lastSentAt: 0 }; }
}
function saveQueueState(s) {
  if (!fs.existsSync(store.DATA_DIR)) fs.mkdirSync(store.DATA_DIR, { recursive: true });
  fs.writeFileSync(QUEUE_STATE_FILE, JSON.stringify(s));
}

function enqueue(payload) {
  _queue.push(payload);
}

// Prayer-time reminders bypass the queue/gap entirely — always sent the
// moment they're due, never held back. Still records the send time so the
// 3-hour gap for other categories is measured from the most recent
// notification of any kind, not just non-prayer ones.
function sendImmediate(payload) {
  push.sendToAll(payload);
  const qs = loadQueueState();
  qs.lastSentAt = Date.now();
  saveQueueState(qs);
}

function drainQueue() {
  if (_queue.length === 0) return;
  const qs = loadQueueState();
  const now = Date.now();
  // Send at most one per tick beyond the gap check, keeping order stable —
  // the cron tick (every 60s) naturally paces the rest out.
  if (now - qs.lastSentAt >= MIN_GAP_MS) {
    const next = _queue.shift();
    push.sendToAll(next);
    qs.lastSentAt = now;
    saveQueueState(qs);
  }
}

function loadSentLog() {
  try {
    return JSON.parse(fs.readFileSync(SENT_LOG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveSentLog(log) {
  if (!fs.existsSync(store.DATA_DIR)) fs.mkdirSync(store.DATA_DIR, { recursive: true });
  fs.writeFileSync(SENT_LOG_FILE, JSON.stringify(log));
}

function todayKeyLocal(tzOffsetHours) {
  const d = new Date(Date.now() + tzOffsetHours * 3600 * 1000);
  return d.toISOString().split('T')[0];
}

// Prune entries not from today/yesterday so the log doesn't grow forever.
function pruneLog(log, dateKey) {
  const keep = {};
  for (const k of Object.keys(log)) {
    if (k.startsWith(dateKey)) keep[k] = log[k];
  }
  return keep;
}

// Consecutive-day streak of all-5-prayers-complete, walking backward from
// (but not including) dateKey itself — mirrors the client's prayerStreak(),
// used only to decide whether to mention "don't lose your streak" tonight.
function computeStreak(state, dateKey) {
  let streak = 0;
  const d = new Date(dateKey + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    d.setDate(d.getDate() - 1);
    const key = d.toISOString().split('T')[0];
    const dayPrayers = state.prayers?.[key] || {};
    const done = PRAYERS.every((p) => ['ontime', 'late', 'qada'].includes(dayPrayers[p]));
    if (!done) break;
    streak++;
  }
  return streak;
}

function tick() {
  const state = store.getState();
  if (!state || !state.settings?.notifications) return;

  const s = state.settings;
  const loc = resolveLocation(s);
  const now = new Date();
  const dateKey = todayKeyLocal(loc.tz);
  let log = loadSentLog();
  log = pruneLog(log, dateKey);

  const times = calcPrayerTimes(now, loc.lat, loc.lng, loc.tz, {
    asrMethod: s.asrMethod,
    angleMethod: s.angleMethod,
  });
  const nowLocalHours =
    ((now.getUTCHours() + loc.tz + now.getUTCMinutes() / 60) % 24 + 24) % 24;

  const prayerHours = {
    fajr: times.fajrH, dhuhr: times.dhuhrH, asr: times.asrH,
    maghrib: times.maghribH, isha: times.ishaH,
  };

  const within = (target, mins = 0) => {
    // true once per day when "now" first crosses (target - mins)
    const diff = nowLocalHours - (target - mins / 60);
    return diff >= 0 && diff < 1 / 60 * 2; // ~2-minute tick tolerance
  };

  // ── Prayer reminders ──────────────────────────────────────────────
  if (s.prayerNotifs) {
    for (const [prayer, hour] of Object.entries(prayerHours)) {
      const key = `${dateKey}_prayer_${prayer}`;
      if (!log[key] && within(hour, s.notifLeadMin)) {
        log[key] = true;
        sendImmediate({
          title: `${PRAYER_LABELS[prayer]} in ${s.notifLeadMin} min`,
          body: `Time to prepare for ${PRAYER_LABELS[prayer]}.`,
          tag: `prayer-${prayer}`,
          url: '/',
        });
      }
    }
  }

  // ── Dhikr reminders (fire at the associated prayer time) ─────────
  if (s.dhikrNotifs) {
    for (const d of DHIKR_DEFS) {
      if (d.prayer === 'all') continue; // Salatut Ta'ziyah — reminded via each prayer's own dhikr slot
      const hour = prayerHours[d.prayer];
      const key = `${dateKey}_dhikr_${d.id}`;
      if (!log[key] && within(hour, -2)) { // ~2 min after prayer time
        log[key] = true;
        enqueue({
          title: d.name,
          body: `Time for ${d.name} — after ${PRAYER_LABELS[d.prayer]}.`,
          tag: `dhikr-${d.id}`,
          url: '/',
        });
      }
    }
  }

  // ── Islamic-date / fasting reminders (once/day, 7am local) ────────
  if (s.eventNotifs && Math.abs(nowLocalHours - 7) < 1 / 30) {
    const key = `${dateKey}_events`;
    if (!log[key]) {
      const h = gregorianToHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const active = ISLAMIC_EVENTS.filter((e) => {
        const end = e.hijriDayEnd ?? e.hijriDay;
        return e.hijriMonth === h.month && h.day >= e.hijriDay && h.day <= end;
      });
      if (active.length) {
        log[key] = true;
        for (const e of active) {
          enqueue({
            title: e.title,
            body: `Today's action items are waiting — tap to check them off.`,
            tag: `event-${e.id}`,
            url: '/',
          });
        }
      }
    }
  }

  // ── Daily reflection: rotating hadith on the virtue of Salah ─────
  // Once/day, mid-morning (9am local) — separate from the actionable prayer
  // reminders above, so it stays inspirational content, not clutter on top
  // of the time-sensitive nudges.
  if (s.reflectionNotifs !== false && Math.abs(nowLocalHours - 9) < 1 / 30) {
    const key = `${dateKey}_reflection`;
    if (!log[key]) {
      log[key] = true;
      const dayOfYear = Math.floor(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000
      );
      const h = SALAH_HADITH[dayOfYear % SALAH_HADITH.length];
      enqueue({
        title: 'On the virtue of Salah',
        body: `"${h.text}" — ${h.source}`,
        tag: 'reflection',
        url: '/',
      });
    }
  }

  // ── End-of-day: nudge for any of the 5 prayers still unmarked ────
  // Fires once, late evening (9:30pm local) — specific about which prayers
  // are still open (specificity + a real streak on the line converts far
  // better than a generic "don't forget to pray" ping), and still sends a
  // short positive note when the day's already complete rather than nothing.
  if (s.eodNudgeNotifs !== false && Math.abs(nowLocalHours - 21.5) < 1 / 30) {
    const key = `${dateKey}_eod`;
    if (!log[key]) {
      log[key] = true;
      const dayPrayers = state.prayers?.[dateKey] || {};
      const done = PRAYERS.filter((p) => ['ontime', 'late', 'qada'].includes(dayPrayers[p]));
      const remaining = PRAYERS.filter((p) => !done.includes(p));
      if (remaining.length === 0) {
        enqueue({
          title: 'Alhamdulillah — all 5 prayers complete',
          body: "Every Salah marked for today. May Allah accept it from you.",
          tag: 'eod-complete',
          url: '/',
        });
      } else {
        const streak = computeStreak(state, dateKey);
        const names = remaining.map((p) => PRAYER_LABELS[p]).join(', ');
        const streakNote = streak > 0
          ? ` Your ${streak}-day streak is still open tonight — don't let it slip.`
          : '';
        enqueue({
          title: remaining.length === 1 ? `1 prayer left today: ${names}` : `${remaining.length} prayers left today`,
          body: `${names} still unmarked.${streakNote}`,
          tag: 'eod-remaining',
          url: '/',
        });
      }
    }
  }

  saveSentLog(log);
  drainQueue();
}

function start() {
  cron.schedule('* * * * *', tick);
  console.log('[scheduler] reminder scheduler started (every minute)');
}

module.exports = { start, tick };

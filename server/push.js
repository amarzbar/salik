const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const store = require('./store');

const VAPID_FILE = path.join(store.DATA_DIR, 'vapid.json');

function loadOrCreateVapidKeys() {
  if (fs.existsSync(VAPID_FILE)) {
    return JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  }
  const keys = webpush.generateVAPIDKeys();
  if (!fs.existsSync(store.DATA_DIR)) fs.mkdirSync(store.DATA_DIR, { recursive: true });
  fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  return keys;
}

const vapidKeys = loadOrCreateVapidKeys();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// ttlSec: how long the push service may hold the message for an unreachable
// device. Defaults to 6h; callers pass a short TTL for time-bound reminders
// so they're dropped rather than delivered after the moment has passed (the
// library default is 4 weeks).
async function sendToAll(payload, { ttlSec = 6 * 60 * 60 } = {}) {
  const subs = store.getSubscriptions();
  const body = JSON.stringify(payload);
  // 'high' is the strongest priority hint the Web Push protocol exposes —
  // it doesn't grant the "time-sensitive" interruption-level native apps
  // get (no API for that on iOS web push), so it won't break through Focus
  // modes by itself, but it's a legitimate priority signal to the push
  // service regardless.
  const options = { urgency: 'high', TTL: ttlSec };
  await Promise.all(
    subs.map((sub) =>
      webpush.sendNotification(sub, body, options).catch((err) => {
        // 404/410 = subscription expired or unsubscribed on the client
        if (err.statusCode === 404 || err.statusCode === 410) {
          store.removeSubscription(sub.endpoint);
        } else {
          console.error('[push] send failed:', err.statusCode, err.message);
        }
      })
    )
  );
}

module.exports = { vapidKeys, sendToAll };

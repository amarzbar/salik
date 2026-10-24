// Web Push subscription helper. Works on Android Chrome and installed iOS
// PWAs (Safari 16.4+) — both require the service worker to already be
// registered, which main.tsx does on load.

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

export async function subscribeToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  try {
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const res = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await res.json();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });

    await tryRegisterBackgroundSync(reg);
    return true;
  } catch (err) {
    console.warn('[push] subscribe failed', err);
    return false;
  }
}

// Best-effort: Periodic Background Sync lets the service worker wake up on
// its own to refresh Adhan reminders without a live connection. It's Chrome
// on Android only (unsupported on iOS Safari and desktop), and even there
// requires the browser's site-engagement heuristics to allow it — so this is
// a bonus layer, not the primary delivery path. Push notifications (above)
// already work everywhere the PWA is installed and cover the real need; if
// periodic sync isn't available we just skip it silently.
async function tryRegisterBackgroundSync(reg: ServiceWorkerRegistration): Promise<void> {
  try {
    const anyReg = reg as ServiceWorkerRegistration & {
      periodicSync?: { register(tag: string, opts: { minInterval: number }): Promise<void> };
    };
    if (!anyReg.periodicSync) return; // unsupported on this platform — skip
    await anyReg.periodicSync.register('adhan-refresh', { minInterval: 60 * 60 * 1000 });
  } catch {
    // Permission not granted (low engagement) or API present but denied — skip.
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch (err) {
    console.warn('[push] unsubscribe failed', err);
  }
}

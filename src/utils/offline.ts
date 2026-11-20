// On-device copies of dhikr texts (PDFs) and recitations (MP3s), so a dhikr that has been
// opened or played once can be read and listened to offline, without reaching the server.
// Stored in Cache Storage under its own name, apart from the service worker's app-shell
// cache, so app updates never clear it.

const STORE = 'salik-offline-v1';

const supported = () => typeof caches !== 'undefined';

/** Ask the browser to keep our storage instead of evicting it under pressure (best effort). */
let persistAsked = false;
export function requestPersistence(): void {
  if (persistAsked) return;
  persistAsked = true;
  try { navigator.storage?.persist?.(); } catch { /* not supported */ }
}

/** The saved copy, if this URL has been stored on the device. */
export async function getStored(url: string): Promise<Blob | null> {
  if (!supported()) return null;
  try {
    const hit = await (await caches.open(STORE)).match(url);
    return hit ? await hit.blob() : null;
  } catch { return null; }
}

export async function isStored(url: string): Promise<boolean> {
  if (!supported()) return false;
  try { return !!(await (await caches.open(STORE)).match(url)); } catch { return false; }
}

// One download per URL at a time, shared by everyone asking for it.
const inFlight = new Map<string, Promise<Blob>>();

/**
 * Download the whole file and keep a copy on the device. Reports progress (0–1) when the
 * size is known. Resolves with the file; rejects if the network fails (nothing is stored).
 */
export function fetchAndStore(url: string, onProgress?: (p: number) => void): Promise<Blob> {
  const running = inFlight.get(url);
  if (running) return running;
  const job = (async () => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const type = res.headers.get('content-type') || 'application/octet-stream';
    const reader = res.body.getReader();
    const parts: BlobPart[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value as Uint8Array<ArrayBuffer>);
      got += value.length;
      if (total && onProgress) onProgress(Math.min(1, got / total));
    }
    if (total && got < total) throw new Error('incomplete download');
    const blob = new Blob(parts, { type });
    if (supported()) {
      requestPersistence();
      const cache = await caches.open(STORE);
      await cache.put(url, new Response(blob, { headers: { 'Content-Type': type, 'Content-Length': String(blob.size) } }));
    }
    return blob;
  })().finally(() => inFlight.delete(url));
  inFlight.set(url, job);
  return job;
}

/** The stored copy if there is one, otherwise download it now (and store it). */
export async function getOrFetch(url: string, onProgress?: (p: number) => void): Promise<{ blob: Blob; fromDevice: boolean }> {
  const stored = await getStored(url);
  if (stored) return { blob: stored, fromDevice: true };
  return { blob: await fetchAndStore(url, onProgress), fromDevice: false };
}

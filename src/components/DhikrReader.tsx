// Full-screen reader for a dhikr's text (the Tariqah's PDF, rendered page by
// page with pdf.js so it works inside the installed iOS PWA, where an
// <iframe> PDF only ever shows the first page). Loaded lazily from
// DhikrScreen so pdf.js isn't in the main bundle.

import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { pdfUrl, textById, DUA_AFTER_DHIKR, type DhikrTextId } from '../data/dhikrTexts';
import { getOrFetch, getStored, fetchAndStore } from '../utils/offline';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  textId: DhikrTextId;
  onClose: () => void;
  onOpenText: (id: DhikrTextId) => void;
}

const ZOOMS = [1, 1.5, 2];

export default function DhikrReader({ textId, onClose, onOpenText }: Props) {
  const text = textById(textId);
  const dua = textById(DUA_AFTER_DHIKR);
  const [pagesDrawn, setPagesDrawn] = useState(false);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // The text comes from the copy saved on this device when there is one; otherwise it's
  // downloaded once and saved, so it opens offline from then on.
  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof pdfjs.getDocument> | null = null;
    setDoc(null); setError(false);
    getOrFetch(pdfUrl(textId))
      .then(async ({ blob }) => {
        if (cancelled) return;
        task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        task.promise.then(d => { if (!cancelled) setDoc(d); }, () => { if (!cancelled) setError(true); });
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; task?.destroy(); };
  }, [textId]);

  // Draw every page to a canvas at the reader's width (times the zoom), at
  // device pixel ratio so the Arabic stays crisp on a retina screen.
  useEffect(() => {
    const host = pagesRef.current;
    if (!doc || !host) return;
    let cancelled = false;
    host.replaceChildren();
    setPagesDrawn(false);
    const cssWidth = host.clientWidth * ZOOMS[zoomIdx];
    const dpr = window.devicePixelRatio || 1;

    (async () => {
      for (let n = 1; n <= doc.numPages && !cancelled; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${cssWidth}px`;
        canvas.className = 'block bg-white rounded-lg shadow-sm mb-3';
        host.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      }
      if (!cancelled) setPagesDrawn(true);
    })();
    return () => { cancelled = true; };
  }, [doc, zoomIdx]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        className="flex items-center gap-2 px-2 bg-background border-b border-border"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 8px) + var(--edge-ramp))', paddingBottom: '8px' }}
      >
        <button
          onClick={onClose}
          className="w-11 h-11 flex items-center justify-center rounded-full text-primary active:bg-muted"
          aria-label="Close"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-foreground truncate">{text.title}</p>
          <p className="font-arabic text-[13px] text-muted-fg truncate" style={{ textAlign: "left" }}>{text.titleAr}</p>
        </div>
        <button
          onClick={() => setZoomIdx(i => (i + 1) % ZOOMS.length)}
          className="h-9 px-3 rounded-full bg-secondary text-primary text-[13px] font-semibold tabular-nums"
          aria-label="Change text size"
        >
          {ZOOMS[zoomIdx]}×
        </button>
      </header>

      <div className={`flex-1 overflow-auto px-3 pt-3 ${text.audio ? 'pb-3' : 'pb-safe'}`}>
        {error ? (
          <div className="text-center text-muted-fg text-[14px] py-16 px-6">
            {navigator.onLine
              ? <>Couldn&apos;t load this text. Check your connection and try again.</>
              : <>You&apos;re offline, and this text hasn&apos;t been saved on this device yet. Open it once while online and it will be.</>}
          </div>
        ) : !doc ? (
          <div className="text-center text-muted-fg text-[14px] py-16">Loading…</div>
        ) : null}
        <div ref={pagesRef} />

        {/* Every dhikr ends with the du'ā', so offer it once the last page is drawn */}
        {pagesDrawn && textId !== DUA_AFTER_DHIKR && (
          <button
            onClick={() => onOpenText(DUA_AFTER_DHIKR)}
            className="w-full flex items-center gap-3 px-4 py-3.5 mt-1 mb-3 bg-card rounded-2xl border border-border transition active:bg-muted text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg">Next</p>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[15px] font-semibold text-foreground">{dua.title}</p>
                <p className="font-arabic text-[14px] text-muted-fg flex-shrink-0">{dua.titleAr}</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg flex-shrink-0">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        )}
      </div>

      {text.audio && <MiniPlayer src={text.audio} title={text.title} />}
    </div>
  );
}

function fmtTime(sec: number): string {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Compact "now playing" bar pinned to the bottom of the reader, in the style
// of a music app's mini player: a thin seekable progress line along the top
// edge, the track name and time, and one round play/pause button. Nothing
// loads until play is pressed.
function MiniPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Offline: play the copy saved on this device when there is one. Otherwise the first play
  // streams from the server while the whole file downloads and is saved in the background.
  const [playSrc, setPlaySrc] = useState(src);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState<number | null>(null); // 0–1 while saving
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getStored(src).then(blob => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setPlaySrc(url); setSaved(true);
    });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [src]);

  function saveInBackground() {
    if (saved || saving !== null) return;
    setSaving(0);
    fetchAndStore(src, p => setSaving(p))
      .then(() => { setSaved(true); setSaving(null); })
      .catch(() => setSaving(null)); // try again on the next play
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      setFailed(false); setLoading(true);
      a.play().catch(() => setLoading(false));
      saveInBackground();
    } else a.pause();
  }

  function seek(e: React.PointerEvent<HTMLDivElement>) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration;
  }

  function skip(by: number) {
    const a = audioRef.current;
    if (a) a.currentTime = Math.max(0, a.currentTime + by);
  }

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="bg-card border-t border-border" style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) - 18px), 4px)' }}>
      <audio
        ref={audioRef}
        src={playSrc}
        preload="none"
        onPlaying={() => { setPlaying(true); setLoading(false); }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onError={() => { setLoading(false); setPlaying(false); if (!saved) setFailed(true); }}
      />
      {/* Progress line: tall invisible hit area, 3px visible track */}
      <div className="relative h-4 -mt-2 cursor-pointer touch-none" onPointerDown={seek} aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-3 px-4 pb-2 -mt-1">
        <div className="w-10 h-10 rounded-lg bg-secondary text-primary flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-foreground truncate">{title}</p>
          <p className="text-[12px] text-muted-fg tabular-nums truncate">
            {failed
              ? (navigator.onLine ? "Couldn't load the recitation" : 'Not saved for offline yet')
              : duration ? `${fmtTime(time)} / ${fmtTime(duration)}` : loading ? 'Loading…' : 'Recitation'}
            {!failed && (saved
              ? <span className="text-primary"> · Saved for offline</span>
              : saving !== null ? <span> · Saving for offline… {Math.round(saving * 100)}%</span> : null)}
          </p>
        </div>
        <button
          onClick={() => skip(-15)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-muted-fg active:bg-muted"
          aria-label="Back 15 seconds"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
        <button
          onClick={toggle}
          className="w-11 h-11 flex items-center justify-center rounded-full bg-primary text-white active:scale-95 transition flex-shrink-0"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}

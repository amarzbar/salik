// Full-screen reader for a dhikr's text (the Tariqah's PDF, rendered page by
// page with pdf.js so it works inside the installed iOS PWA, where an
// <iframe> PDF only ever shows the first page). Loaded lazily from
// DhikrScreen so pdf.js isn't in the main bundle.

import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { pdfUrl, textById, type DhikrTextId } from '../data/dhikrTexts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  textId: DhikrTextId;
  onClose: () => void;
}

const ZOOMS = [1, 1.5, 2];

export default function DhikrReader({ textId, onClose }: Props) {
  const text = textById(textId);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [error, setError] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const task = pdfjs.getDocument(pdfUrl(textId));
    task.promise.then(setDoc, () => setError(true));
    return () => { task.destroy(); };
  }, [textId]);

  // Draw every page to a canvas at the reader's width (times the zoom), at
  // device pixel ratio so the Arabic stays crisp on a retina screen.
  useEffect(() => {
    const host = pagesRef.current;
    if (!doc || !host) return;
    let cancelled = false;
    host.replaceChildren();
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
    })();
    return () => { cancelled = true; };
  }, [doc, zoomIdx]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        className="flex items-center gap-2 px-2 bg-background border-b border-border"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)', paddingBottom: '8px' }}
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
          <p className="font-arabic text-[13px] text-muted-fg truncate">{text.titleAr}</p>
        </div>
        <button
          onClick={() => setZoomIdx(i => (i + 1) % ZOOMS.length)}
          className="h-9 px-3 rounded-full bg-secondary text-primary text-[13px] font-semibold tabular-nums"
          aria-label="Change text size"
        >
          {ZOOMS[zoomIdx]}×
        </button>
      </header>

      {text.audio && (
        <div className="px-4 py-2 border-b border-border bg-card">
          <audio controls preload="none" src={text.audio} className="w-full h-10" />
        </div>
      )}

      <div className="flex-1 overflow-auto px-3 pt-3 pb-safe">
        {error ? (
          <div className="text-center text-muted-fg text-[14px] py-16 px-6">
            Couldn&apos;t load this text. Check your connection and try again.
          </div>
        ) : !doc ? (
          <div className="text-center text-muted-fg text-[14px] py-16">Loading…</div>
        ) : null}
        <div ref={pagesRef} />
      </div>
    </div>
  );
}

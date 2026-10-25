// Mic button for journal notes: records with MediaRecorder, sends the audio to
// /api/transcribe (Whisper running on the server) and hands back the text.
// Tap to start, tap again to stop; the transcript is appended by the caller.

import { useEffect, useRef, useState } from 'react';

interface Props {
  onText: (text: string) => void;
}

type Phase = 'idle' | 'recording' | 'transcribing';

// iOS Safari records AAC in an MP4 container; Chrome/Firefox record WebM/Opus.
function pickMimeType(): string {
  const options = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
  return options.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? '';
}

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function VoiceNoteButton({ onText }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null;

  async function start() {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access was denied.');
      return;
    }
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      upload(new Blob(chunksRef.current, { type: rec.mimeType || mimeType || 'audio/webm' }));
    };
    rec.start();
    recRef.current = rec;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    setPhase('recording');
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
    setPhase('transcribing');
  }

  async function upload(blob: Blob) {
    try {
      const r = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': blob.type.split(';')[0] },
        body: blob,
      });
      if (!r.ok) throw new Error(String(r.status));
      const { text } = await r.json();
      if (text) onText(text);
      else setError("Didn't catch anything. Try again a little closer to the mic.");
    } catch {
      setError("Couldn't transcribe that. Check your connection and try again.");
    } finally {
      setPhase('idle');
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={phase === 'idle' ? start : phase === 'recording' ? stop : undefined}
        disabled={phase === 'transcribing'}
        className={[
          'h-9 rounded-full flex items-center gap-2 px-3.5 text-[13px] font-semibold transition active:scale-95',
          phase === 'recording' ? 'bg-red-500 text-white' : 'bg-secondary text-primary',
          phase === 'transcribing' ? 'opacity-70' : '',
        ].join(' ')}
        aria-label={phase === 'recording' ? 'Stop recording' : 'Record a voice note'}
      >
        {phase === 'recording' ? (
          <>
            <span className="w-2.5 h-2.5 rounded-sm bg-white" />
            <span className="tabular-nums">{fmt(seconds)}</span>
          </>
        ) : phase === 'transcribing' ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Transcribing…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="12" rx="3"/>
              <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/>
            </svg>
            Voice note
          </>
        )}
      </button>
      {error && <span className="text-[12px] text-red-400">{error}</span>}
    </div>
  );
}

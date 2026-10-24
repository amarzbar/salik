// Shared bottom-sheet chrome: backdrop, drag handle, Escape-to-close, and a
// real swipe-down-to-dismiss gesture (the sheet tracks your finger and either
// snaps closed past a threshold or springs back — not just a static panel
// with a decorative handle bar).

import { useRef, useState, useEffect, type ReactNode } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
}

const DISMISS_THRESHOLD_PX = 120;

export default function BottomSheet({ onClose, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function onTouchStart(e: React.TouchEvent) {
    // Only start a drag if this touch begins while the sheet's own content
    // is scrolled to the top — otherwise a downward swipe should scroll the
    // sheet's content instead of dragging the whole sheet.
    const el = sheetRef.current;
    if (el && el.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta); // only allow dragging downward
  }

  function onTouchEnd() {
    if (dragY > DISMISS_THRESHOLD_PX) {
      onClose();
    } else {
      setDragY(0); // spring back
    }
    dragStartY.current = null;
    setDragging(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={sheetRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative z-10 w-full max-h-[90dvh] bg-card rounded-t-3xl overflow-y-auto"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}

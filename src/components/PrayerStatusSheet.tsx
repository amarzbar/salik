// Tapping an unmarked prayer still marks it in one tap, using the status
// worked out from the clock (on time / late / qada'). Tapping a prayer that is
// already marked opens this sheet instead, so the guess can be corrected: e.g.
// you prayed on time but only logged it after the window closed.

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore, PRAYER_LABELS, type PrayerName, type PrayerStatus } from '../store';
import BottomSheet from './BottomSheet';

const OPTIONS: { status: PrayerStatus; label: string; hint: string; dot: string }[] = [
  { status: 'ontime',  label: 'On time', hint: 'Prayed within its time',          dot: 'bg-primary' },
  { status: 'late',    label: 'Late',    hint: 'Prayed after its preferred time', dot: 'bg-amber-400' },
  { status: 'qada',    label: "Qada'",   hint: 'Made up after its time ended',    dot: 'bg-purple-500' },
  { status: 'missed',  label: 'Missed',  hint: 'Not prayed',                      dot: 'bg-red-400' },
];

interface Target { dateKey: string; prayer: PrayerName }

export function usePrayerTap(): { onTap: (dateKey: string, prayer: PrayerName) => void; sheet: ReactNode } {
  const { state, cyclePrayerStatus } = useAppStore();
  const [target, setTarget] = useState<Target | null>(null);

  const onTap = (dateKey: string, prayer: PrayerName) => {
    const cur = state.prayers[dateKey]?.[prayer] ?? 'pending';
    if (cur === 'pending') cyclePrayerStatus(dateKey, prayer);
    else setTarget({ dateKey, prayer });
  };

  // Portalled to <body>: the list can itself sit inside a bottom sheet (past
  // days, from History), whose transform would otherwise trap this one.
  const sheet = target
    ? createPortal(<PrayerStatusSheet {...target} onClose={() => setTarget(null)} />, document.body)
    : null;
  return { onTap, sheet };
}

export default function PrayerStatusSheet({ dateKey, prayer, onClose }: Target & { onClose: () => void }) {
  const { state, setPrayerStatus } = useAppStore();
  const current = state.prayers[dateKey]?.[prayer] ?? 'pending';

  const pick = (status: PrayerStatus) => { setPrayerStatus(dateKey, prayer, status); onClose(); };

  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 pb-4">
        <h2 className="text-xl font-bold text-foreground mb-3">{PRAYER_LABELS[prayer]}</h2>
        <div className="bg-background rounded-2xl border border-border overflow-hidden">
          {OPTIONS.map((o, idx) => (
            <div key={o.status}>
              {idx > 0 && <div className="h-px bg-border mx-4" />}
              <button
                onClick={() => pick(o.status)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition active:bg-muted"
              >
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${o.dot}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{o.label}</span>
                  <span className="block text-[12px] text-muted-fg">{o.hint}</span>
                </span>
                {current === o.status && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => pick('pending')}
          className="w-full mt-3 py-3 rounded-xl text-[14px] font-semibold text-muted-fg active:bg-muted"
        >
          Clear
        </button>
      </div>
    </BottomSheet>
  );
}

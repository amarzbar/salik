// Shared prayer checklist — same row style as the Today screen's "Prayers
// Today" card, but parameterized by an arbitrary dateKey so it can also
// retroactively edit past days (used by the Prayers > History tab).

import { useMemo } from 'react';
import { calcPrayerTimes, resolveLocation } from '../utils/prayerTimes';
import { useAppStore, PRAYERS, PRAYER_LABELS, dateFromKey, type PrayerStatus } from '../store';

const STATUS_CONFIG: Record<PrayerStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Tap',     bg: 'bg-muted',       text: 'text-muted-fg' },
  ontime:  { label: 'On time', bg: 'bg-primary',     text: 'text-primary-fg' },
  late:    { label: 'Late',    bg: 'bg-amber-400',   text: 'text-white' },
  qada:    { label: "Qada'",   bg: 'bg-purple-500',  text: 'text-white' },
  missed:  { label: 'Missed',  bg: 'bg-red-400',     text: 'text-white' },
};

interface Props {
  dateKey: string;
}

export default function PrayerChecklist({ dateKey }: Props) {
  const { state, cyclePrayerStatus } = useAppStore();
  const loc = resolveLocation(state.settings);
  const times = useMemo(
    () => calcPrayerTimes(dateFromKey(dateKey), loc.lat, loc.lng, loc.tz, {
      asrMethod: state.settings.asrMethod,
      angleMethod: state.settings.angleMethod,
    }),
    [dateKey, loc.lat, loc.lng, loc.tz, state.settings.asrMethod, state.settings.angleMethod]
  );
  const prayerTimeMap: Record<string, string> = {
    fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha,
  };
  const completed = PRAYERS.filter(p => {
    const s = state.prayers[dateKey]?.[p];
    return s === 'ontime' || s === 'late' || s === 'qada';
  }).length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Prayers</h3>
        <span className={`text-[12px] font-semibold tabular-nums ${completed === 5 ? 'text-primary' : 'text-muted-fg'}`}>
          {completed}/5
        </span>
      </div>
      <div className="divide-y divide-border">
        {PRAYERS.map(prayer => {
          const status = state.prayers[dateKey]?.[prayer] ?? 'pending';
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={prayer}
              onClick={() => cyclePrayerStatus(dateKey, prayer)}
              className="w-full flex items-center justify-between px-4 py-3 transition active:bg-muted"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status === 'pending' ? 'bg-border' : cfg.bg}`} />
                <span className="text-[15px] font-medium text-foreground">{PRAYER_LABELS[prayer]}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-muted-fg">{prayerTimeMap[prayer]}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="px-4 py-2.5 text-[11px] text-muted-fg border-t border-border">
        Tap a prayer to mark it — on time/late/qada&apos; is detected automatically, tap again for missed, once more to reset.
      </p>
    </div>
  );
}

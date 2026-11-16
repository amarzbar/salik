// Shared prayer checklist — same row style as the Today screen's "Prayers
// Today" card, but parameterized by an arbitrary dateKey so it can also
// retroactively edit past days (used by the Prayers > History tab).

import { useMemo } from 'react';
import { calcPrayerTimes, resolveLocation } from '../utils/prayerTimes';
import { useAppStore, PRAYERS, PRAYER_LABELS, dateFromKey, hasPrayerStarted, type PrayerStatus } from '../store';
import { usePrayerTap } from './PrayerStatusSheet';
import { heatSchemeOf, statusBg, statusText, statusDot } from '../utils/dayScore';

// Labels only: colors come from the chosen scheme (utils/dayScore statusBg/statusText/statusDot).
const STATUS_CONFIG: Record<PrayerStatus, { label: string }> = {
  pending: { label: 'Tap' },
  ontime: { label: 'On time' },
  late: { label: 'Late' },
  qada: { label: "Qada'" },
  missed: { label: 'Missed' },
};

interface Props {
  dateKey: string;
}

export default function PrayerChecklist({ dateKey }: Props) {
  const { state } = useAppStore();
  const scheme = heatSchemeOf(state.settings); // badges follow the chosen color scheme
  const prayerTap = usePrayerTap();
  const loc = resolveLocation(state.settings, dateFromKey(dateKey));
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
      {prayerTap.sheet}
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
          const notYet = status === 'pending' && !hasPrayerStarted(dateKey, prayer);
          return (
            <button
              key={prayer}
              onClick={() => prayerTap.onTap(dateKey, prayer)}
              disabled={notYet}
              className="w-full flex items-center justify-between px-4 py-3 transition active:bg-muted disabled:opacity-50 disabled:active:bg-transparent"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${statusDot(status, scheme)}`} />
                <span className="text-[15px] font-medium text-foreground">{PRAYER_LABELS[prayer]}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-muted-fg">{prayerTimeMap[prayer]}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBg(status, scheme)} ${statusText(status, scheme)}`}>
                  {notYet ? 'Not yet' : cfg.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="px-4 py-2.5 text-[11px] text-muted-fg border-t border-border">
        Tap a prayer to mark it (on time/late/qada&apos; is worked out automatically). Tap a marked prayer to change it.
      </p>
    </div>
  );
}

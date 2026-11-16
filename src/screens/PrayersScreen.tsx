import { useMemo, useState } from 'react';
import { useAppStore, PRAYERS, PRAYER_LABELS, todayKey, activeDate, toDateKey, type PrayerStatus } from '../store';
import { usePrayerTap } from '../components/PrayerStatusSheet';
import { gregorianToHijri, HIJRI_MONTHS } from '../utils/hijri';
import DayPrayerModal from '../components/DayPrayerModal';
import { heatColor, heatText, heatSchemeOf, statusBg, statusText, statusDot } from '../utils/dayScore';


// Labels only: colors come from the chosen scheme (utils/dayScore statusBg/statusText/statusDot).
const STATUS_CONFIG: Record<PrayerStatus, { label: string }> = {
  pending: { label: 'Pending' },
  ontime: { label: 'On time' },
  late: { label: 'Late' },
  qada: { label: "Qada'" },
  missed: { label: 'Missed' },
};


// Heatmap colors live in utils/dayScore so the Calendar shades days identically.

export default function PrayersScreen() {
  const { state, prayerStreak } = useAppStore();
  const prayerTap = usePrayerTap();
  const scheme = heatSchemeOf(state.settings);
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null);
  const todayK = todayKey();
  const today = activeDate();
  const streak = prayerStreak();

  // Heatmap: whole Sunday-to-Saturday weeks covering about the past month, from
  // the Sunday four weeks before this week's up to today (29–35 days), so the
  // grid always starts under the S column.
  const heatmapDays = useMemo(() => {
    const count = 29 + today.getDay();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (count - 1 - i));
      const key = toDateKey(d);
      const dayPrayers = state.prayers[key] ?? {};
      const completed = PRAYERS.filter(p => {
        const s = dayPrayers[p];
        return s === 'ontime' || s === 'late' || s === 'qada';
      }).length;
      return { key, d, completed, rate: completed / 5 };
    });
  }, [state.prayers]);



  // Last 30 days, today included (rolling, so it doesn't reset on the 1st)
  const monthStats = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    let total = 0, completed = 0;
    while (d <= today) {
      const key = toDateKey(d);
      const dayP = state.prayers[key] ?? {};
      PRAYERS.forEach(p => {
        total++;
        const s = dayP[p];
        if (s === 'ontime' || s === 'late' || s === 'qada') completed++;
      });
      d.setDate(d.getDate() + 1);
    }
    return { total, completed, pct: total > 0 ? Math.round(completed / total * 100) : 0 };
  }, [state.prayers]);

  return (
    <div className="flex flex-col h-full">
      {prayerTap.sheet}
      {/* The Prayers tab is stats and history; today's prayers are marked on the Today screen. */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl border border-border p-4 text-center">
                <p className="text-[28px] font-bold text-foreground">{streak}</p>
                <p className="text-[12px] text-muted-fg uppercase tracking-wide">Day streak</p>
                <p className="text-[11px] text-muted-fg mt-0.5">All 5 prayers</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 text-center">
                <p className="text-[28px] font-bold text-foreground">{monthStats.pct}%</p>
                <p className="text-[12px] text-muted-fg uppercase tracking-wide">Last 30 days</p>
                <p className="text-[11px] text-muted-fg mt-0.5">{monthStats.completed}/{monthStats.total} prayers</p>
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-4">Past Month · Prayers only</h3>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-muted-fg font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {heatmapDays.map(({ key, d, rate }) => {
                  const isToday = todayK === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedHistoryDay(key)}
                      title={`${d.toLocaleDateString()} — ${Math.round(rate * 5)}/5 prayers — tap to edit`}
                      className={[
                        'aspect-square rounded-md flex items-center justify-center text-[9px] font-medium transition-colors active:scale-90',
                        heatColor(rate, heatSchemeOf(state.settings)),
                        isToday ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : '',
                        rate === 0 ? 'text-muted-fg' : heatText(rate, heatSchemeOf(state.settings)),
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
                {/* The rest of this week, still to come */}
                {Array.from({ length: 6 - today.getDay() }, (_, i) => (
                  <div key={`future-${i}`} className="aspect-square rounded-md border border-dashed border-border" />
                ))}
              </div>

              {/* Color legend */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-[11px] text-muted-fg">Less</span>
                {[0, 0.2, 0.6, 0.9, 1].map(r => (
                  <div key={r} className={`w-4 h-4 rounded-sm ${heatColor(r, heatSchemeOf(state.settings))}`} />
                ))}
                <span className="text-[11px] text-muted-fg">More</span>
              </div>
            </div>

            {/* Recent days list */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Recent Days</h3>
              </div>
              {[...heatmapDays].reverse().slice(0, 7).map(({ key, d, completed }) => {
                const hDate = gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedHistoryDay(key)}
                    className="w-full flex items-center justify-between px-4 py-3 border-t border-border transition active:bg-muted text-left"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-foreground">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-[12px] text-muted-fg">{hDate.day} {HIJRI_MONTHS[hDate.month - 1]}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {PRAYERS.map(p => {
                        const s = state.prayers[key]?.[p] ?? 'pending';
                        return (
                          <div key={p} className={`w-2 h-2 rounded-full ${statusDot(s, scheme)}`} title={`${PRAYER_LABELS[p]}: ${s}`} />
                        );
                      })}
                      <span className="text-[12px] text-muted-fg ml-1 tabular-nums">{completed}/5</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status legend */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Statuses</h3>
              <div className="flex flex-wrap gap-2">
                {(['ontime', 'late', 'qada', 'missed', 'pending'] as PrayerStatus[]).map(s => (
                  <span key={s} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBg(s, scheme)} ${statusText(s, scheme)}`}>
                    {STATUS_CONFIG[s].label}
                  </span>
                ))}
              </div>
              <p className="text-[12px] text-muted-fg mt-2">
                Tap a prayer to mark it done: on time, late or qada&apos; is worked out from the clock and
                this prayer&apos;s window. Tap a marked prayer to change it, e.g. to on time if you prayed
                on time but logged it later.
              </p>
            </div>
          </div>
      </div>

      {selectedHistoryDay && (
        <DayPrayerModal dateKey={selectedHistoryDay} onClose={() => setSelectedHistoryDay(null)} />
      )}
    </div>
  );
}

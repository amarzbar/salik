import { useMemo, useState } from 'react';
import { calcPrayerTimes, resolveLocation } from '../utils/prayerTimes';
import { useAppStore, PRAYERS, PRAYER_LABELS, todayKey, activeDate, toDateKey, type PrayerStatus } from '../store';
import { usePrayerTap } from '../components/PrayerStatusSheet';
import { todayHijri, gregorianToHijri, HIJRI_MONTHS } from '../utils/hijri';
import DayPrayerModal from '../components/DayPrayerModal';

type View = 'today' | 'history';

const STATUS_CONFIG: Record<PrayerStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pending',  bg: 'bg-muted',      text: 'text-muted-fg',    dot: 'bg-border' },
  ontime:  { label: 'On time',  bg: 'bg-primary',    text: 'text-primary-fg',  dot: 'bg-primary' },
  late:    { label: 'Late',     bg: 'bg-amber-400',  text: 'text-white',       dot: 'bg-amber-400' },
  qada:    { label: "Qada'",    bg: 'bg-purple-500', text: 'text-white',       dot: 'bg-purple-500' },
  missed:  { label: 'Missed',   bg: 'bg-red-400',    text: 'text-white',       dot: 'bg-red-400' },
};

const CYCLE_ORDER: PrayerStatus[] = ['pending', 'ontime', 'late', 'qada', 'missed'];

function statusColor(rate: number): string {
  if (rate === 0) return 'bg-muted';
  if (rate < 0.4) return 'bg-red-300 dark:bg-red-800';
  if (rate < 0.8) return 'bg-amber-300 dark:bg-amber-700';
  if (rate < 1) return 'bg-primary/50';
  return 'bg-primary';
}

export default function PrayersScreen() {
  const { state, prayerStreak } = useAppStore();
  const prayerTap = usePrayerTap();
  const [view, setView] = useState<View>('today');
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null);
  const todayK = todayKey();
  const today = activeDate();
  const loc = resolveLocation(state.settings);
  const times = useMemo(
    () => calcPrayerTimes(today, loc.lat, loc.lng, loc.tz, {
      asrMethod: state.settings.asrMethod,
      angleMethod: state.settings.angleMethod,
    }),
    [loc.lat, loc.lng, loc.tz, state.settings.asrMethod, state.settings.angleMethod]
  );
  const hijri = useMemo(() => todayHijri(activeDate()), []);
  const streak = prayerStreak();

  // Last 28 days for heatmap
  const heatmapDays = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (27 - i));
      const key = toDateKey(d);
      const dayPrayers = state.prayers[key] ?? {};
      const completed = PRAYERS.filter(p => {
        const s = dayPrayers[p];
        return s === 'ontime' || s === 'late' || s === 'qada';
      }).length;
      return { key, d, completed, rate: completed / 5 };
    });
  }, [state.prayers]);

  const prayerTimeMap: Record<string, string> = {
    fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha,
  };

  const completedToday = PRAYERS.filter(p => {
    const s = state.prayers[todayK]?.[p];
    return s === 'ontime' || s === 'late' || s === 'qada';
  }).length;

  // Monthly stats
  const monthStats = useMemo(() => {
    const d = new Date(today);
    d.setDate(1);
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
      {/* Tab switcher */}
      <div className="flex mx-4 mt-4 mb-3 bg-muted rounded-xl p-1 gap-1">
        {(['today', 'history'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={[
              'flex-1 py-2 rounded-lg text-[13px] font-semibold capitalize transition-colors',
              view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-fg',
            ].join(' ')}
          >
            {v === 'today' ? "Today's Prayers" : 'History'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {view === 'today' ? (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-2xl border border-border p-3 text-center">
                <p className="text-[22px] font-bold text-foreground">{completedToday}/5</p>
                <p className="text-[11px] text-muted-fg uppercase tracking-wide mt-0.5">Today</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-3 text-center">
                <p className="text-[22px] font-bold text-foreground">{streak}</p>
                <p className="text-[11px] text-muted-fg uppercase tracking-wide mt-0.5">Day streak</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-3 text-center">
                <p className="text-[22px] font-bold text-foreground">{monthStats.pct}%</p>
                <p className="text-[11px] text-muted-fg uppercase tracking-wide mt-0.5">This month</p>
              </div>
            </div>

            {/* Date */}
            <div className="px-1">
              <h3 className="text-[18px] font-bold text-foreground">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <p className="text-[13px] text-muted-fg">{hijri.day} {HIJRI_MONTHS[hijri.month - 1]} {hijri.year} AH</p>
            </div>

            {/* Prayer list */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {PRAYERS.map((prayer, idx) => {
                const status = state.prayers[todayK]?.[prayer] ?? 'pending';
                const cfg = STATUS_CONFIG[status];
                return (
                  <div key={prayer}>
                    {idx > 0 && <div className="h-px bg-border mx-4" />}
                    <button
                      onClick={() => prayerTap.onTap(todayK, prayer)}
                      className="w-full flex items-center gap-4 px-4 py-4 transition active:bg-muted"
                    >
                      {/* Status indicator */}
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />

                      {/* Prayer name */}
                      <div className="flex-1 text-left">
                        <p className="text-[16px] font-semibold text-foreground">{PRAYER_LABELS[prayer]}</p>
                        <p className="text-[13px] text-muted-fg">{prayerTimeMap[prayer]}</p>
                      </div>

                      {/* Status badge */}
                      <span className={`text-[12px] font-semibold px-3 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Status legend */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Statuses</h3>
              <div className="flex flex-wrap gap-2">
                {CYCLE_ORDER.map(s => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <span key={s} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
                      {c.label}
                    </span>
                  );
                })}
              </div>
              <p className="text-[12px] text-muted-fg mt-2">
                Tap a prayer to mark it done: on time, late or qada&apos; is worked out from the clock and
                this prayer&apos;s window. Tap a marked prayer to change it, e.g. to on time if you prayed
                on time but logged it later.
              </p>
            </div>
          </div>
        ) : (
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
                <p className="text-[12px] text-muted-fg uppercase tracking-wide">This month</p>
                <p className="text-[11px] text-muted-fg mt-0.5">{monthStats.completed}/{monthStats.total} prayers</p>
              </div>
            </div>

            {/* Heatmap */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-4">Last 4 Weeks</h3>
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
                        statusColor(rate),
                        isToday ? 'ring-2 ring-primary ring-offset-1' : '',
                        rate > 0.5 ? 'text-white' : 'text-muted-fg',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Color legend */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <span className="text-[11px] text-muted-fg">Less</span>
                {[0, 0.2, 0.6, 0.9, 1].map(r => (
                  <div key={r} className={`w-4 h-4 rounded-sm ${statusColor(r)}`} />
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
                          <div key={p} className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} title={`${PRAYER_LABELS[p]}: ${s}`} />
                        );
                      })}
                      <span className="text-[12px] text-muted-fg ml-1 tabular-nums">{completed}/5</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedHistoryDay && (
        <DayPrayerModal dateKey={selectedHistoryDay} onClose={() => setSelectedHistoryDay(null)} />
      )}
    </div>
  );
}

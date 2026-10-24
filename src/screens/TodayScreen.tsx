import { useMemo, useState } from 'react';
import { todayHijri, HIJRI_MONTHS, formatHijriDate } from '../utils/hijri';
import { calcPrayerTimes, resolveLocation } from '../utils/prayerTimes';
import { nextUpcomingEvent, eventsForDay, EVENT_COLOR_CLASSES } from '../data/islamicEvents';
import { useAppStore, PRAYERS, PRAYER_LABELS, DHIKR_DEFS, todayKey, activeDate, type PrayerStatus } from '../store';
import EventDetailModal from '../components/EventDetailModal';
import type { IslamicEvent } from '../data/islamicEvents';
import type { TabId } from '../App';

const STATUS_CONFIG: Record<PrayerStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Tap',     bg: 'bg-muted',       text: 'text-muted-fg' },
  ontime:  { label: 'On time', bg: 'bg-primary',     text: 'text-primary-fg' },
  late:    { label: 'Late',    bg: 'bg-amber-400',   text: 'text-white' },
  qada:    { label: "Qada'",   bg: 'bg-purple-500',  text: 'text-white' },
  missed:  { label: 'Missed',  bg: 'bg-red-400',     text: 'text-white' },
};

function ProgressRing({ value, max, size = 88 }: { value: number; max: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(value / max, 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="7"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${offset}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

interface Props { onNavigate: (tab: TabId) => void; }

export default function TodayScreen({ onNavigate }: Props) {
  const { state, cyclePrayerStatus, setDhikr, toggleDhikrSub, incSalawat, resetSalawat } = useAppStore();
  const todayK = todayKey();
  const today = activeDate();
  const hijri = useMemo(() => todayHijri(activeDate()), []);
  const loc = resolveLocation(state.settings);
  const times = useMemo(
    () => calcPrayerTimes(today, loc.lat, loc.lng, loc.tz, {
      asrMethod: state.settings.asrMethod,
      angleMethod: state.settings.angleMethod,
    }),
    [loc.lat, loc.lng, loc.tz, state.settings.asrMethod, state.settings.angleMethod]
  );
  const activeEvents = eventsForDay(hijri.month, hijri.day);
  const nextEvent = nextUpcomingEvent(hijri.month, hijri.day);
  const salawatCount = state.salawat[todayK] ?? 0;
  const [selectedEvent, setSelectedEvent] = useState<IslamicEvent | null>(null);
  const [journalText, setJournalText] = useState(state.journal[todayK]?.text ?? '');
  const { setJournal } = useAppStore();

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const gregDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prayerTimeMap: Record<string, string> = {
    fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha,
  };

  const completedPrayers = PRAYERS.filter(p => {
    const s = state.prayers[todayK]?.[p];
    return s === 'ontime' || s === 'late' || s === 'qada';
  }).length;

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      {/* Date header */}
      <div className="px-1">
        <p className="text-[13px] font-medium text-muted-fg uppercase tracking-widest mb-0.5">{dayName}</p>
        <h2 className="text-[26px] font-bold text-foreground leading-tight tracking-tight">
          {hijri.day} {HIJRI_MONTHS[hijri.month - 1]}
        </h2>
        <p className="text-[14px] text-muted-fg">{hijri.year} AH &middot; {gregDate}</p>
      </div>

      {/* Active event banner */}
      {activeEvents.length > 0 && (
        <button
          onClick={() => setSelectedEvent(activeEvents[0])}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition active:scale-[0.99] ${
            activeEvents[0].color === 'gold' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40' :
            activeEvents[0].color === 'teal' ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700/40' :
            activeEvents[0].color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40' :
            'bg-secondary border-primary/20'
          }`}
        >
          <span className="text-2xl">
            {activeEvents[0].category === 'fasting' ? '🌙' : activeEvents[0].category === 'celebration' ? '🎉' : '✨'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-foreground truncate">{activeEvents[0].title}</p>
            <p className="text-[13px] text-muted-fg truncate">{activeEvents[0].description}</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg flex-shrink-0">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}

      {/* Next event teaser (if no active event) */}
      {activeEvents.length === 0 && nextEvent && (
        <button
          onClick={() => setSelectedEvent(nextEvent)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border text-left transition active:scale-[0.99]"
        >
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-primary">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-muted-fg uppercase tracking-widest font-medium">Upcoming</p>
            <p className="text-[14px] font-semibold text-foreground truncate">{nextEvent.title}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg flex-shrink-0">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}

      {/* Prayers card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Prayers Today</h3>
          <span className={`text-[12px] font-semibold tabular-nums ${completedPrayers === 5 ? 'text-primary' : 'text-muted-fg'}`}>
            {completedPrayers}/5
          </span>
        </div>
        <div className="divide-y divide-border">
          {PRAYERS.map(prayer => {
            const status = state.prayers[todayK]?.[prayer] ?? 'pending';
            const cfg = STATUS_CONFIG[status];
            return (
              <button
                key={prayer}
                onClick={() => cyclePrayerStatus(todayK, prayer)}
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
        <button
          onClick={() => onNavigate('prayers')}
          className="w-full flex items-center justify-center gap-1 py-3 text-[13px] text-primary font-medium border-t border-border"
        >
          View prayer history
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Salawat counter */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-0.5">Salawat</h3>
            <p className="text-[13px] text-muted-fg font-arabic">الصلاة على النبي ﷺ</p>
          </div>
          <div className="relative flex items-center justify-center">
            <ProgressRing value={salawatCount} max={state.salawatGoal} />
            <div className="absolute text-center">
              <p className="text-[18px] font-bold text-foreground leading-none">{salawatCount}</p>
              <p className="text-[10px] text-muted-fg">/{state.salawatGoal}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => incSalawat(todayK)}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-fg font-semibold text-[15px] transition active:scale-[0.97]"
          >
            + 1
          </button>
          <button
            onClick={() => incSalawat(todayK, 10)}
            className="flex-1 py-3 rounded-xl bg-secondary text-primary font-semibold text-[15px] transition active:scale-[0.97]"
          >
            + 10
          </button>
          <button
            onClick={() => incSalawat(todayK, 100)}
            className="flex-1 py-3 rounded-xl bg-secondary text-primary font-semibold text-[15px] transition active:scale-[0.97]"
          >
            + 100
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={() => incSalawat(todayK, -1)}
            disabled={salawatCount <= 0}
            className="text-[12px] text-muted-fg disabled:opacity-40"
          >
            − 1 (undo)
          </button>
          <span className="text-muted-fg/40">·</span>
          <button
            onClick={() => { if (salawatCount > 0 && window.confirm(`Reset today's Salawat count from ${salawatCount} to 0?`)) resetSalawat(todayK); }}
            disabled={salawatCount <= 0}
            className="text-[12px] text-muted-fg disabled:opacity-40"
          >
            Reset count
          </button>
        </div>
      </div>

      {/* Dhikr quick view */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Dhikr Today</h3>
        </div>
        <div className="divide-y divide-border">
          {DHIKR_DEFS.slice(0, 4).map(def => {
            const val = state.dhikr[todayK]?.[def.id];
            let done: boolean;
            if (def.subItems && Array.isArray(val)) {
              done = (val as boolean[]).every(Boolean);
            } else {
              done = val === true;
            }
            return (
              <button
                key={def.id}
                onClick={() => {
                  if (def.subItems) {
                    // Can't toggle sub-items from quick view — navigate instead
                    onNavigate('dhikr');
                    return;
                  }
                  setDhikr(todayK, def.id, !done);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 transition active:bg-muted"
              >
                <span className={[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  done ? 'bg-primary border-primary' : 'border-border',
                ].join(' ')}>
                  {done && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-[14px] font-medium ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>
                    {def.name}
                  </p>
                  <p className="text-[12px] text-muted-fg capitalize">{def.prayerTime === 'all' ? 'After each prayer' : `After ${def.prayerTime}`}</p>
                </div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onNavigate('dhikr')}
          className="w-full flex items-center justify-center gap-1 py-3 text-[13px] text-primary font-medium border-t border-border"
        >
          View all dhikr
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Journal quick entry */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Today's Journal</h3>
        <textarea
          value={journalText}
          onChange={e => setJournalText(e.target.value)}
          onBlur={() => { if (journalText.trim()) setJournal(todayK, journalText); }}
          placeholder="Write something to remember today…"
          rows={3}
          className="w-full resize-none bg-muted rounded-xl p-3 text-[16px] text-foreground placeholder:text-muted-fg border-none outline-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => { if (journalText.trim()) { setJournal(todayK, journalText); onNavigate('journal'); } else onNavigate('journal'); }}
            className="text-[13px] text-primary font-medium"
          >
            {journalText.trim() ? 'Save & view journal →' : 'Open journal →'}
          </button>
        </div>
      </div>

      {/* Event modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          hijriYear={hijri.year}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

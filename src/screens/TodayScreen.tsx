import { useMemo, useState } from 'react';
import { todayHijri, HIJRI_MONTHS } from '../utils/hijri';
import { calcPrayerTimes, resolveLocation } from '../utils/prayerTimes';
import { eventsForDay } from '../data/islamicEvents';
import { reminderForDay } from '../data/reminders';
import { computeBadges, longestRun } from '../data/badges';
import { useAppStore, PRAYERS, PRAYER_LABELS, DHIKR_DEFS, todayKey, activeDate, type PrayerStatus } from '../store';
import ProgressRing from '../components/ProgressRing';
import VoiceNoteButton from '../components/VoiceNoteButton';
import { usePrayerTap } from '../components/PrayerStatusSheet';
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

const KEPT: PrayerStatus[] = ['ontime', 'late', 'qada'];
const isKept = (s: PrayerStatus | undefined) => !!s && KEPT.includes(s);

interface Props { onNavigate: (tab: TabId) => void; }

export default function TodayScreen({ onNavigate }: Props) {
  const prayerTap = usePrayerTap();
  const { state, setDhikr, setJournal, prayerStreak } = useAppStore();
  const todayK = todayKey();
  const today = activeDate();
  const hijri = useMemo(() => todayHijri(activeDate()), []);
  const loc = resolveLocation(state.settings, today);
  const times = useMemo(
    () => calcPrayerTimes(today, loc.lat, loc.lng, loc.tz, {
      asrMethod: state.settings.asrMethod,
      angleMethod: state.settings.angleMethod,
    }),
    [loc.lat, loc.lng, loc.tz, state.settings.asrMethod, state.settings.angleMethod]
  );
  const activeEvents = eventsForDay(hijri.month, hijri.day);
  const reminder = useMemo(() => reminderForDay(today), [todayK]);
  const [selectedEvent, setSelectedEvent] = useState<IslamicEvent | null>(null);
  const [journalOpen, setJournalOpen] = useState<boolean>(!!state.journal[todayK]?.text);
  const [journalText, setJournalText] = useState(state.journal[todayK]?.text ?? '');

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const gregDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prayerTimeMap: Record<string, string> = {
    fajr: times.fajr, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha,
  };

  const completedPrayers = PRAYERS.filter(p => isKept(state.prayers[todayK]?.[p])).length;

  const { currentStreak, bestStreak, badges, nextMilestone } = useMemo(() => {
    const completeDayKeys = Object.keys(state.prayers).filter(k => PRAYERS.every(p => isKept(state.prayers[k]?.[p])));
    const lifetimeSalawat = Object.values(state.salawat).reduce((a, b) => a + (b || 0), 0);
    const totalPrayers = Object.values(state.prayers).reduce(
      (a, day) => a + PRAYERS.filter(p => isKept(day?.[p])).length, 0
    );
    const cs = prayerStreak();
    const { earned, next } = computeBadges({ currentStreak: cs, completeDayKeys, lifetimeSalawat, totalPrayers });
    return { currentStreak: cs, bestStreak: Math.max(cs, longestRun(completeDayKeys)), badges: earned, nextMilestone: next };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.prayers, state.salawat]);

  return (
    <div className="px-4 pt-3 pb-6 space-y-4">
      {prayerTap.sheet}

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
          <Chevron />
        </button>
      )}

      {/* Streak hero */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary to-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[40px] leading-none">{currentStreak > 0 ? '🔥' : '🌱'}</span>
            <div>
              <p className="text-[34px] font-bold leading-none text-foreground tabular-nums">{currentStreak}</p>
              <p className="text-[13px] text-muted-fg mt-1">day prayer streak</p>
            </div>
          </div>
          <ProgressRing value={completedPrayers} max={5} size={76}>
            <p className="text-[17px] font-bold text-foreground leading-none tabular-nums">{completedPrayers}<span className="text-[12px] text-muted-fg">/5</span></p>
            <p className="text-[9px] text-muted-fg uppercase tracking-wider mt-0.5">today</p>
          </ProgressRing>
        </div>
        {/* Next milestone progress */}
        {nextMilestone && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-muted-fg">Next: {nextMilestone.emoji} {nextMilestone.label}</span>
              <span className="text-muted-fg tabular-nums">{Math.min(nextMilestone.current, nextMilestone.target)}/{nextMilestone.target}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (nextMilestone.current / nextMilestone.target) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {bestStreak > currentStreak && (
          <p className="text-[12px] text-muted-fg mt-3">Best streak: <span className="font-semibold text-foreground">{bestStreak} days</span></p>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <span key={b.id} className="inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-full bg-secondary border border-primary/15 text-[12px] font-medium text-foreground">
                <span className="text-[14px] leading-none">{b.emoji}</span>{b.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reminder of the day */}
      <div className="rounded-2xl border border-accent/25 bg-accent/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-accent mb-2">
          {reminder.kind === 'quran' ? "Qur'an · Reflection" : 'Hadith · Reflection'}
        </p>
        <p className="text-[15px] leading-relaxed text-foreground">“{reminder.text}”</p>
        <p className="text-[12px] text-muted-fg mt-2">— {reminder.source}</p>
      </div>

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
                onClick={() => prayerTap.onTap(todayK, prayer)}
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
          View prayer history <Chevron small />
        </button>
      </div>

      {/* Dhikr quick view */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Dhikr Today</h3>
        </div>
        <div className="divide-y divide-border">
          {DHIKR_DEFS.slice(0, 4).map(def => {
            const val = state.dhikr[todayK]?.[def.id];
            const done = def.subItems && Array.isArray(val) ? (val as boolean[]).every(Boolean) : val === true;
            return (
              <button
                key={def.id}
                onClick={() => {
                  if (def.subItems) { onNavigate('dhikr'); return; }
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
                  <p className={`text-[14px] font-medium ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>{def.name}</p>
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
          View all dhikr &amp; salawat <Chevron small />
        </button>
      </div>

      {/* Slim journal */}
      {!journalOpen ? (
        <button
          onClick={() => setJournalOpen(true)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition active:scale-[0.99]"
        >
          <span className="text-[18px]">✍️</span>
          <span className="flex-1 text-[14px] font-medium text-muted-fg">
            {state.journal[todayK]?.text ? 'Edit today’s reflection' : 'Add a reflection'}
          </span>
          <Chevron small />
        </button>
      ) : (
        <div className="bg-card rounded-2xl border border-border p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Today's Journal</h3>
          <textarea
            value={journalText}
            onChange={e => setJournalText(e.target.value)}
            onBlur={() => { if (journalText.trim()) setJournal(todayK, journalText); }}
            placeholder="Write something to remember today…"
            rows={3}
            autoFocus
            className="w-full resize-none bg-muted rounded-xl p-3 text-[16px] text-foreground placeholder:text-muted-fg border-none outline-none"
          />
          <div className="flex items-center justify-between gap-2 mt-2">
            <VoiceNoteButton
              onText={t => {
                const next = journalText.trim() ? `${journalText.trimEnd()}\n${t}` : t;
                setJournalText(next);
                setJournal(todayK, next);
              }}
            />
            <button
              onClick={() => { if (journalText.trim()) { setJournal(todayK, journalText); onNavigate('journal'); } else onNavigate('journal'); }}
              className="text-[13px] text-primary font-medium"
            >
              {journalText.trim() ? 'Save & view journal →' : 'Open journal →'}
            </button>
          </div>
        </div>
      )}

      {/* Event modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} hijriYear={hijri.year} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

function Chevron({ small }: { small?: boolean }) {
  const n = small ? 12 : 16;
  return (
    <svg width={n} height={n} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-muted-fg flex-shrink-0">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

// Today's call-to-action cards: instead of full prayer and dhikr lists on the Today screen,
// each card names the ONE next thing to do (the prayer that has entered, a prayer still
// waiting, the dhikr that's due) with a single-tap button, and changes as the day moves on.
// "See all" opens a shelf: today's stats, the full editable list, and, once today is done,
// "Review earlier days".

import { useState } from 'react';
import { LuBellRing, LuCircleCheck, LuHourglass, LuSparkles } from 'react-icons/lu';
import {
  useAppStore, PRAYERS, PRAYER_LABELS, DHIKR_DEFS, todayKey, hasPrayerStarted, canMarkDhikr, dateFromKey, toDateKey,
  type DhikrId, type PrayerStatus,
} from '../store';
import type { PrayerName } from '../store';
import DayPrayerModal from './DayPrayerModal';
import DhikrChecklist from './DhikrChecklist';
import PrayerChecklist from './PrayerChecklist';
import BottomSheet from './BottomSheet';

const KEPT: PrayerStatus[] = ['ontime', 'late', 'qada'];
const isKept = (s: PrayerStatus | undefined) => !!s && KEPT.includes(s);
const list = (names: string[]) => names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

type Tone = 'call' | 'waiting' | 'clear' | 'done';

function Card({ tone, eyebrow, title, body, action, onAction, footer, children }: {
  tone: Tone; eyebrow: string; title: string; body: string;
  action?: string; onAction?: () => void; footer: React.ReactNode; children?: React.ReactNode;
}) {
  const Icon = tone === 'call' ? LuBellRing : tone === 'waiting' ? LuHourglass : tone === 'done' ? LuSparkles : LuCircleCheck;
  return (
    <div className={[
      'rounded-2xl border p-4',
      tone === 'call' || tone === 'waiting' ? 'border-primary/40 bg-gradient-to-br from-secondary to-card' : 'border-border bg-card',
    ].join(' ')}>
      <div className="flex items-start gap-3">
        <span className={['w-9 h-9 rounded-full flex items-center justify-center shrink-0', tone === 'call' || tone === 'waiting' ? 'bg-primary text-primary-fg' : 'bg-secondary text-primary'].join(' ')}>
          <Icon className="text-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg">{eyebrow}</p>
          <p className="text-[17px] font-bold text-foreground leading-snug mt-0.5">{title}</p>
          <p className="text-[13px] text-muted-fg mt-1 leading-relaxed">{body}</p>
        </div>
      </div>
      {children}
      {action && onAction && (
        <button
          onClick={onAction}
          className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-fg font-semibold text-[15px] transition active:scale-[0.99]"
        >
          {action}
        </button>
      )}
      <div className="mt-3 flex justify-center">{footer}</div>
    </div>
  );
}

const LOOKBACK_DAYS = 30;
function earlierDays(firstLogged: string | undefined): string[] {
  const out: string[] = [];
  if (!firstLogged) return out;
  const d = dateFromKey(todayKey());
  for (let i = 1; i <= LOOKBACK_DAYS; i++) {
    d.setDate(d.getDate() - 1);
    const k = toDateKey(d);
    if (k < firstLogged) break;
    out.push(k); // most recent first
  }
  return out;
}

// The pop-up shelf behind "See all": today's stats, today's full (editable) list, and, only
// once everything today is done, a single "Review earlier days" button that opens the most
// recent earlier day still holding something to make up.
function TodayShelf({ title, stats, children, showReview, onReview, onClose }: {
  title: string;
  stats: { value: string; label: string; sub?: string }[];
  children: React.ReactNode;
  showReview: boolean;
  onReview: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 pb-5">
        <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-2xl border border-border p-3 text-center">
              <p className="text-[24px] font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[11px] text-muted-fg uppercase tracking-wide mt-0.5">{s.label}</p>
              {s.sub && <p className="text-[11px] text-muted-fg mt-0.5">{s.sub}</p>}
            </div>
          ))}
        </div>
        {children}
        {showReview && (
          <button onClick={onReview} className="w-full mt-4 py-3 rounded-xl bg-primary text-primary-fg font-semibold text-[15px] transition active:scale-[0.99]">
            Review earlier days
          </button>
        )}
        <button onClick={onClose} className="w-full mt-3 py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px]">Done</button>
      </div>
    </BottomSheet>
  );
}
const SeeAll = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button onClick={onClick} className="text-[13px] font-medium text-primary py-1.5 px-2">{label} ›</button>
);

// ─── Prayer ────────────────────────────────────────────────────────────────

export function PrayerCallCard({ times, streak, onTap }: {
  times: Record<PrayerName, string>;
  streak: number;
  onTap: (dateKey: string, prayer: PrayerName) => void; // one tap on an unlogged prayer logs it
}) {
  const { state } = useAppStore();
  const todayK = todayKey();
  const [showAll, setShowAll] = useState(false);
  const day = state.prayers[todayK] ?? {};

  const started = PRAYERS.filter(p => hasPrayerStarted(todayK, p));
  const current = started[started.length - 1];                    // the prayer whose time we're in
  const waiting = started.filter(p => !isKept(day[p]));            // entered but not logged
  const earlier = waiting.filter(p => p !== current);
  const next = PRAYERS.find(p => !hasPrayerStarted(todayK, p));
  const keptCount = PRAYERS.filter(p => isKept(day[p])).length;
  const footer = <SeeAll label="See all prayers" onClick={() => setShowAll(true)} />;
  const L = (p: PrayerName) => PRAYER_LABELS[p];
  const [lookBackDay, setLookBackDay] = useState<string | null>(null);
  // Earlier days with a prayer not yet kept (unmarked or marked missed), most recent first.
  const firstLogged = Object.keys(state.prayers).filter(k => Object.keys(state.prayers[k] ?? {}).length).sort()[0];
  const pWindow = earlierDays(firstLogged);
  const prayerGaps = pWindow.filter(k => PRAYERS.some(p => !isKept(state.prayers[k]?.[p])));
  // Last 30 days (today included, never before the first logged day): prayers kept / possible.
  const days30 = [todayK, ...pWindow].slice(0, LOOKBACK_DAYS);
  const kept30 = days30.reduce((a, k) => a + PRAYERS.filter(p => isKept(state.prayers[k]?.[p])).length, 0);
  const pct30 = days30.length ? Math.round((kept30 / (days30.length * PRAYERS.length)) * 100) : 0;

  let card: React.ReactNode;
  if (current && !isKept(day[current])) {
    card = (
      <Card tone="call" eyebrow={`Now · ${times[current]}`}
        title={`${L(current)} has entered`}
        body={`Ḥayya ʿalaṣ-ṣalāh, ḥayya ʿalal-falāḥ: come to prayer, hasten to success. Answer the call, then mark it here.${earlier.length ? " There's more you can add to your day after." : ''}`}
        action={`I've prayed ${L(current)}`} onAction={() => onTap(todayK, current)} footer={footer} />
    );
  } else if (earlier.length) {
    const first = earlier[0];
    card = (
      <Card tone="waiting" eyebrow="Draw nearer"
        title="Increase in prayer"
        body={`There's still room in your day for ${list(earlier.map(L))}. Make ${earlier.length > 1 ? 'them' : 'it'} up while the day is yours.`}
        action={`Add ${L(first)}`} onAction={() => onTap(todayK, first)} footer={footer} />
    );
  } else if (keptCount === PRAYERS.length) {
    card = (
      <Card tone="done" eyebrow="Prayers"
        title="All five kept today"
        body={`Alhamdulillah. May Allah accept them from you.${streak > 1 ? ` That's ${streak} days in a row.` : ''}`}
        footer={footer} />
    );
  } else {
    card = (
      <Card tone="clear" eyebrow="Prayers"
        title={started.length ? "You're up to date" : 'Your day begins with Fajr'}
        body={next
          ? `${L(next)} comes in at ${times[next]}.${streak > 0 ? ` Keep your ${streak}-day streak alive.` : ' Be ready for it.'}`
          : 'Keep going.'}
        footer={footer} />
    );
  }

  return (
    <>
      {card}
      {showAll && (
        <TodayShelf
          title="Today's prayers"
          stats={[
            { value: String(streak), label: 'Day streak', sub: 'All 5 prayers' },
            { value: `${pct30}%`, label: 'Last 30 days', sub: `${kept30}/${days30.length * PRAYERS.length} prayers` },
          ]}
          showReview={keptCount === PRAYERS.length && prayerGaps.length > 0}
          onReview={() => { setShowAll(false); setLookBackDay(prayerGaps[0]); }}
          onClose={() => setShowAll(false)}
        >
          <PrayerChecklist dateKey={todayK} />
        </TodayShelf>
      )}
      {lookBackDay && <DayPrayerModal dateKey={lookBackDay} onClose={() => setLookBackDay(null)} />}
    </>
  );
}

// ─── Dhikr ─────────────────────────────────────────────────────────────────

// Reminders of the virtue of dhikr, one per day. The Quran lines are Sahih International,
// checked against quran.com mirrors (2:152, 13:28); the others are unattributed on purpose.
const DHIKR_VIRTUES = [
  '“So remember Me; I will remember you.” (Quran 2:152)',
  '“Unquestionably, by the remembrance of Allah hearts are assured.” (Quran 13:28)',
  'Find serenity in remembrance; it is a cure for the heart.',
  'Every remembrance draws you nearer.',
];
const virtueOfTheDay = (dateKey: string) =>
  DHIKR_VIRTUES[dateKey.split('-').reduce((a, n) => a + Number(n), 0) % DHIKR_VIRTUES.length];

interface DhikrTask { id: DhikrId; name: string; after: PrayerName; subIdx?: number; done: boolean; available: boolean }

// Every dhikr of the day in time order: each prayer's own litany, then that prayer's part of
// Salatut Ta'ziyah (which follows each of the five prayers).
function dhikrTasks(dhikr: Partial<Record<DhikrId, boolean | boolean[]>>, dateKey: string): DhikrTask[] {
  const tasks: DhikrTask[] = [];
  PRAYERS.forEach((p, idx) => {
    for (const def of DHIKR_DEFS) {
      if (def.prayerTime === p) {
        tasks.push({ id: def.id, name: def.name, after: p, done: dhikr[def.id] === true, available: canMarkDhikr(dateKey, def.id) });
      } else if (def.prayerTime === 'all') {
        const v = dhikr[def.id];
        tasks.push({ id: def.id, name: def.name, after: p, subIdx: idx, done: Array.isArray(v) ? !!v[idx] : v === true, available: canMarkDhikr(dateKey, def.id, idx) });
      }
    }
  });
  return tasks;
}

export function DhikrCallCard() {
  const { state, setDhikr, toggleDhikrSub } = useAppStore();
  const todayK = todayKey();
  const [dhikrDay, setDhikrDay] = useState<string | null>(null); // the day shown in the dhikr sheet
  const setShowAll = (on: boolean) => setDhikrDay(on ? todayK : null);
  const tasks = dhikrTasks(state.dhikr[todayK] ?? {}, todayK);
  // Earlier days whose dhikr isn't complete, most recent first.
  const firstDhikr = Object.keys(state.dhikr).filter(k => Object.keys(state.dhikr[k] ?? {}).length).sort()[0];
  const dWindow = earlierDays(firstDhikr);
  const dhikrGaps = dWindow.filter(k => dhikrTasks(state.dhikr[k] ?? {}, k).some(x => !x.done));
  const dayDone = (k: string) => dhikrTasks(state.dhikr[k] ?? {}, k).every(x => x.done);
  // Streak of days with every dhikr complete (today counts once it's complete).
  let dStreak = dayDone(todayK) ? 1 : 0;
  for (const k of dWindow) { if (dayDone(k)) dStreak++; else break; }
  // Last 30 days: share of all dhikr steps completed.
  const dDays30 = [todayK, ...dWindow].slice(0, LOOKBACK_DAYS);
  const steps = dDays30.map(k => dhikrTasks(state.dhikr[k] ?? {}, k));
  const doneSteps = steps.reduce((a, ts) => a + ts.filter(x => x.done).length, 0);
  const allSteps = steps.reduce((a, ts) => a + ts.length, 0);
  const dPct30 = allSteps ? Math.round((doneSteps / allSteps) * 100) : 0;
  const allDoneToday = dayDone(todayK);
  const open = tasks.filter(t => t.available && !t.done);
  const latestAfter = [...tasks].reverse().find(t => t.available)?.after;
  const nextLater = tasks.find(t => !t.available && !t.done);
  const footer = <SeeAll label="See all dhikr" onClick={() => setShowAll(true)} />;

  const mark = (t: DhikrTask) => {
    if (t.subIdx !== undefined) {
      const def = DHIKR_DEFS.find(d => d.id === t.id);
      toggleDhikrSub(todayK, t.id, t.subIdx, def?.subItems?.length ?? PRAYERS.length);
    } else setDhikr(todayK, t.id, true);
  };

  let card: React.ReactNode;
  if (open.length) {
    // Prefer what's due right now (after the latest prayer); otherwise the oldest one left open.
    const t = open.find(x => x.after === latestAfter) ?? open[0];
    const isNow = t.after === latestAfter;
    card = (
      <Card tone={isNow ? 'call' : 'waiting'}
        eyebrow={`After ${PRAYER_LABELS[t.after]}`}
        title={isNow ? `${t.name} is ready` : `Return to ${t.name}`}
        body={virtueOfTheDay(todayK)}
        action="I've recited it" onAction={() => mark(t)} footer={footer} />
    );
  } else if (!nextLater) {
    card = (
      <Card tone="done" eyebrow="Dhikr" title="Every dhikr complete today" body={`May Allah accept your remembrance. ${virtueOfTheDay(todayK)}`} footer={footer} />
    );
  } else {
    card = (
      <Card tone="clear" eyebrow="Dhikr"
        title={latestAfter ? 'Your dhikr is up to date' : 'Your dhikr begins after Fajr'}
        body={`Next: ${nextLater.name} after ${PRAYER_LABELS[nextLater.after]}. ${virtueOfTheDay(todayK)}`}
        footer={footer} />
    );
  }

  return (
    <>
      {card}
      {dhikrDay === todayK && (
        <TodayShelf
          title="Today's dhikr"
          stats={[
            { value: String(dStreak), label: 'Day streak', sub: 'All dhikr' },
            { value: `${dPct30}%`, label: 'Last 30 days', sub: 'of dhikr completed' },
          ]}
          showReview={allDoneToday && dhikrGaps.length > 0}
          onReview={() => setDhikrDay(dhikrGaps[0])}
          onClose={() => setDhikrDay(null)}
        >
          <DhikrChecklist dateKey={todayK} />
        </TodayShelf>
      )}
      {dhikrDay && dhikrDay !== todayK && (
        <BottomSheet onClose={() => setDhikrDay(null)}>
          <div className="px-5 pb-5">
            <h2 className="text-xl font-bold text-foreground mb-0.5">
              {dateFromKey(dhikrDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-[13px] text-muted-fg mb-4">Fill in what you recited that day.</p>
            <DhikrChecklist dateKey={dhikrDay} />
            <button onClick={() => setDhikrDay(null)} className="w-full mt-4 py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px]">Done</button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

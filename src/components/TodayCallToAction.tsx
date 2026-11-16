// Today's call-to-action cards: instead of full prayer and dhikr lists on the Today screen,
// each card names the ONE next thing to do (the prayer that has entered, a prayer still
// waiting, the dhikr that's due) with a single-tap button, and changes as the day moves on.
// "See all" opens the full list in a sheet for changing or fixing anything.

import { useState } from 'react';
import { LuBellRing, LuCircleCheck, LuHourglass, LuSparkles } from 'react-icons/lu';
import {
  useAppStore, PRAYERS, PRAYER_LABELS, DHIKR_DEFS, todayKey, hasPrayerStarted, canMarkDhikr, dateFromKey, toDateKey,
  type DhikrId, type PrayerStatus,
} from '../store';
import type { PrayerName } from '../store';
import DayPrayerModal from './DayPrayerModal';
import DhikrChecklist from './DhikrChecklist';
import BottomSheet from './BottomSheet';
import { heatSchemeOf, statusBg, statusText, type StatusKey } from '../utils/dayScore';

const KEPT: PrayerStatus[] = ['ontime', 'late', 'qada'];
const STATUS_LABEL: Record<StatusKey, string> = { pending: 'Not marked', ontime: 'On time', late: 'Late', qada: "Qada'", missed: 'Missed' };
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

// "Look back" call to action under a completed day: opens the most recent earlier day that
// still has something to make up; the count falls as days are filled in.
function LookBack({ count, unit, onOpen }: { count: number; unit: string; onOpen: () => void }) {
  if (count === 0) {
    return <p className="mt-4 text-center text-[12px] text-muted-fg">Nothing left to make up in the last {LOOKBACK_DAYS} days. Alhamdulillah.</p>;
  }
  return (
    <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
      <p className="text-[13px] text-foreground">
        <span className="font-semibold">{count} earlier {count === 1 ? 'day has' : 'days have'}</span> room for more {unit}.
      </p>
      <button onClick={onOpen} className="w-full mt-2.5 py-2.5 rounded-lg bg-primary text-primary-fg font-semibold text-[14px] transition active:scale-[0.99]">
        Review earlier days
      </button>
    </div>
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
  const scheme = heatSchemeOf(state.settings);
  const [lookBackDay, setLookBackDay] = useState<string | null>(null);
  // Earlier days with a prayer not yet kept (unmarked or marked missed), most recent first.
  const firstLogged = Object.keys(state.prayers).filter(k => Object.keys(state.prayers[k] ?? {}).length).sort()[0];
  const prayerGaps = earlierDays(firstLogged).filter(k => PRAYERS.some(p => !isKept(state.prayers[k]?.[p])));

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
        footer={footer}>
        {/* The completed set: tap one to change its status */}
        <div className="mt-3 divide-y divide-border rounded-xl border border-border overflow-hidden">
          {PRAYERS.map(p => {
            const s = (day[p] ?? 'pending') as StatusKey;
            return (
              <button key={p} onClick={() => onTap(todayK, p)} className="w-full flex items-center justify-between px-3 py-2 text-left transition active:bg-muted">
                <span className="text-[14px] font-medium text-foreground">{L(p)}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-fg">{times[p]}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBg(s, scheme)} ${statusText(s, scheme)}`}>{STATUS_LABEL[s]}</span>
                </span>
              </button>
            );
          })}
        </div>
        <LookBack count={prayerGaps.length} unit="prayer" onOpen={() => setLookBackDay(prayerGaps[0])} />
      </Card>
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
      {showAll && <DayPrayerModal dateKey={todayK} onClose={() => setShowAll(false)} />}
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
  const dhikrGaps = earlierDays(firstDhikr).filter(k => dhikrTasks(state.dhikr[k] ?? {}, k).some(x => !x.done));
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
      <Card tone="done" eyebrow="Dhikr" title="Every dhikr complete today" body={`May Allah accept your remembrance. ${virtueOfTheDay(todayK)}`} footer={footer}>
        {/* The completed set */}
        <div className="mt-3 divide-y divide-border rounded-xl border border-border overflow-hidden">
          {DHIKR_DEFS.map(def => {
            const v = (state.dhikr[todayK] ?? {})[def.id];
            const n = def.subItems?.length;
            return (
              <div key={def.id} className="flex items-center justify-between px-3 py-2">
                <span className="text-[14px] font-medium text-foreground">{def.name}<span className="text-[12px] text-muted-fg font-normal"> · {def.prayerTime === 'all' ? 'after each prayer' : `after ${PRAYER_LABELS[def.prayerTime]}`}</span></span>
                <span className="flex items-center gap-1 text-[12px] font-semibold text-primary">
                  {n ? `${Array.isArray(v) ? v.filter(Boolean).length : v === true ? n : 0}/${n}` : ''}<LuCircleCheck className="text-[16px]" />
                </span>
              </div>
            );
          })}
        </div>
        <LookBack count={dhikrGaps.length} unit="dhikr" onOpen={() => setDhikrDay(dhikrGaps[0])} />
      </Card>
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
      {dhikrDay && (
        <BottomSheet onClose={() => setDhikrDay(null)}>
          <div className="px-5 pb-5">
            <h2 className="text-xl font-bold text-foreground mb-0.5">
              {dhikrDay === todayK ? "Today's dhikr" : dateFromKey(dhikrDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-[13px] text-muted-fg mb-4">{dhikrDay === todayK ? 'Tick off what you have recited.' : 'Fill in what you recited that day.'}</p>
            <DhikrChecklist dateKey={dhikrDay} />
            <button onClick={() => setDhikrDay(null)} className="w-full mt-4 py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px]">Done</button>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

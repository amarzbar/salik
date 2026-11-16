import { useState, useMemo } from 'react';
import { todayHijri, gregorianToHijri, hijriToGregorian, hijriMonthDays, hijriMonthStartDow, HIJRI_MONTHS, HIJRI_MONTHS_AR } from '../utils/hijri';
import { eventsForDay, hasEventOnDay, ISLAMIC_EVENTS, type IslamicEvent } from '../data/islamicEvents';
import EventDetailModal from '../components/EventDetailModal';
import DhikrChecklist from '../components/DhikrChecklist';
import { useAppStore, todayKey, activeDate, toDateKey, type CommunityEvent } from '../store';
import { observanceIcon, CAL_CATEGORY_ICON } from '../components/categoryIcons';
import { prayerRate, dhikrRate, heatColor } from '../utils/dayScore';

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];


export default function CalendarScreen() {
  const { state, removeCommunityEvent } = useAppStore();
  const todayH = useMemo(() => todayHijri(activeDate()), []);
  const [viewYear, setViewYear] = useState(todayH.year);
  const [viewMonth, setViewMonth] = useState(todayH.month);
  const [selectedDay, setSelectedDay] = useState<number | null>(todayH.day);
  const [modalEvent, setModalEvent] = useState<IslamicEvent | null>(null);

  const daysInMonth = hijriMonthDays(viewYear, viewMonth);
  const startDow = hijriMonthStartDow(viewYear, viewMonth);

  const today = activeDate();
  const todayGreg = { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
  const todayK = todayKey();

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function isToday(hDay: number): boolean {
    return viewYear === todayH.year && viewMonth === todayH.month && hDay === todayH.day;
  }

  const selectedEvents = selectedDay ? eventsForDay(viewMonth, selectedDay) : [];
  const selectedGreg = selectedDay ? hijriToGregorian(viewYear, viewMonth, selectedDay) : null;
  const selectedDateKey = selectedGreg ? toDateKey(new Date(selectedGreg.year, selectedGreg.month - 1, selectedGreg.day)) : null;
  const isFutureDay = selectedDateKey !== null && selectedDateKey > todayKey();

  // Events this month
  const monthEvents = ISLAMIC_EVENTS.filter(ev => ev.hijriMonth === viewMonth);

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto pb-6">
        {/* Month header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={prevMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <div className="text-center">
              <h2 className="text-[20px] font-bold text-foreground">{HIJRI_MONTHS[viewMonth - 1]}</h2>
              <p className="font-arabic text-[15px] text-muted-fg">{HIJRI_MONTHS_AR[viewMonth - 1]}</p>
              <p className="text-[13px] text-muted-fg">{viewYear} AH</p>
            </div>

            <button
              onClick={nextMonth}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {/* Jump to today */}
          {(viewYear !== todayH.year || viewMonth !== todayH.month) && (
            <button
              onClick={() => { setViewYear(todayH.year); setViewMonth(todayH.month); setSelectedDay(todayH.day); }}
              className="block mx-auto mt-1 text-[12px] text-primary font-medium"
            >
              Jump to today
            </button>
          )}
        </div>

        {/* Day of week header */}
        <div className="grid grid-cols-7 px-4 mb-1">
          {DOW.map(d => (
            <div key={d} className={`text-center text-[11px] font-semibold uppercase tracking-wide py-1 ${d === 'Fr' ? 'text-primary' : 'text-muted-fg'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 px-4 gap-y-1">
          {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const hDay = i + 1;
            const greg = hijriToGregorian(viewYear, viewMonth, hDay);
            const hasEvent = hasEventOnDay(viewMonth, hDay);
            const isSelected = selectedDay === hDay;
            const isTod = isToday(hDay);
            const gDate = new Date(greg.year, greg.month - 1, greg.day);
            const isFriday = gDate.getDay() === 5;
            // Past days and today are shaded like the Prayer History heatmap (fill = prayers kept),
            // with a gold bar along the top whose width is the share of the day's dhikr completed.
            const dKey = toDateKey(gDate);
            const tracked = dKey <= todayK;
            const pRate = tracked ? prayerRate(state.prayers[dKey]) : 0;
            const dRate = tracked ? dhikrRate(state.dhikr[dKey]) : 0;
            const filled = pRate > 0.5; // dark enough fill that text switches to white
            const complete = pRate === 1 && dRate === 1;

            return (
              <button
                key={hDay}
                onClick={() => setSelectedDay(hDay === selectedDay ? null : hDay)}
                aria-label={`${hDay} ${HIJRI_MONTHS[viewMonth - 1]}${tracked ? `, ${Math.round(pRate * 5)} of 5 prayers, ${Math.round(dRate * 100)}% dhikr${complete ? ', complete day' : ''}` : ''}`}
                className={[
                  'relative flex flex-col items-center justify-center rounded-xl transition-all py-1.5 min-h-[52px] overflow-hidden',
                  tracked ? heatColor(pRate) : 'hover:bg-muted',
                  isSelected ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background z-10' : isTod ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : '',
                ].join(' ')}
              >
                {/* Dhikr bar */}
                {tracked && dRate > 0 && (
                  <span className="absolute top-0 left-0 h-[4px] bg-accent rounded-r-full" style={{ width: `${Math.round(dRate * 100)}%` }} />
                )}
                {/* Hijri day */}
                <span className={[
                  'text-[16px] font-semibold leading-none mb-0.5',
                  filled ? 'text-white' : isTod || isFriday ? 'text-primary' : 'text-foreground',
                ].join(' ')}>
                  {hDay}
                </span>
                {/* Gregorian day */}
                <span className={[
                  'text-[10px] leading-none',
                  filled ? 'text-white/75' : 'text-muted-fg',
                ].join(' ')}>
                  {greg.day}
                </span>
                {/* Event dot */}
                {hasEvent && (
                  <span className={[
                    'absolute bottom-1 w-1 h-1 rounded-full',
                    filled ? 'bg-white/80' : 'bg-accent',
                  ].join(' ')} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend: fill = prayers, gold bar = dhikr */}
        <div className="flex items-center justify-center gap-4 px-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-fg">Prayers</span>
            {[0, 0.2, 0.6, 0.9, 1].map(r => (
              <span key={r} className={`w-3.5 h-3.5 rounded-sm ${heatColor(r)}`} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-fg">Dhikr</span>
            <span className="relative w-7 h-3.5 rounded-sm bg-muted overflow-hidden">
              <span className="absolute top-0 left-0 h-[4px] w-full bg-accent" />
            </span>
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDay && selectedGreg && (
          <div className="mx-4 mt-4 p-4 bg-card rounded-2xl border border-border">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[20px] font-bold text-foreground">{selectedDay} {HIJRI_MONTHS[viewMonth - 1]}</span>
              <span className="text-[13px] text-muted-fg">{viewYear} AH</span>
            </div>
            <p className="text-[13px] text-muted-fg mb-3">
              {new Date(selectedGreg.year, selectedGreg.month - 1, selectedGreg.day).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </p>
            {selectedEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedEvents.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => setModalEvent(ev)}
                    className={[
                      'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition active:scale-[0.99]',
                      ev.color === 'gold' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/40' :
                      ev.color === 'teal' ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-700/40' :
                      ev.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40' :
                      'bg-secondary border-primary/20',
                    ].join(' ')}
                  >
                    {(() => { const Icon = observanceIcon(ev.category); return <Icon className="text-[18px] text-foreground flex-shrink-0 mt-0.5" />; })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{ev.title}</p>
                      <p className="text-[12px] text-muted-fg truncate">{ev.description}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-muted-fg italic">No special observances today.</p>
            )}
          </div>
        )}

        {/* Dhikr for the selected day — retroactively editable, same component as elsewhere.
            Only for today or a past day; there's nothing to mark for a day that hasn't happened yet. */}
        {selectedDay && selectedDateKey && !isFutureDay && (
          <div className="mx-4 mt-4">
            <DhikrChecklist dateKey={selectedDateKey} />
          </div>
        )}

        {/* Month events legend */}
        {monthEvents.length > 0 && (
          <div className="mx-4 mt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-2 px-1">
              This Month
            </h3>
            <div className="space-y-2">
              {monthEvents.map(ev => {
                const dayRange = ev.hijriDayEnd && ev.hijriDayEnd !== ev.hijriDay
                  ? `${ev.hijriDay}–${ev.hijriDayEnd}`
                  : `${ev.hijriDay}`;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setModalEvent(ev)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border text-left transition active:scale-[0.99]"
                  >
                    <div className={`w-2 h-8 rounded-full flex-shrink-0 ${
                      ev.color === 'gold' ? 'bg-accent' :
                      ev.color === 'teal' ? 'bg-cyan-500' :
                      ev.color === 'purple' ? 'bg-purple-500' :
                      'bg-primary'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground">{ev.title}</p>
                      <p className="text-[12px] text-muted-fg">{dayRange} {HIJRI_MONTHS[viewMonth - 1]}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Community & Halaqah notes */}
        {state.communityEvents.length > 0 && (
          <div className="mx-4 mt-4 mb-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg mb-2 px-1">
              Community &amp; Halaqah Notes
            </h3>
            <div className="space-y-2">
              {sortedCommunityEvents(state.communityEvents).map(ev => (
                <div key={ev.id} className="p-3.5 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-3">
                    {(() => { const Icon = CAL_CATEGORY_ICON[ev.category] ?? CAL_CATEGORY_ICON.other; return <Icon className="text-[16px] text-muted-fg mt-0.5 flex-shrink-0" />; })()}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-foreground">{ev.title}</p>
                        {ev.tentative && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            Tentative
                          </span>
                        )}
                      </div>
                      {(ev.dateLabel || ev.dateKey) && (
                        <p className="text-[12px] text-primary font-medium mt-0.5">
                          {ev.dateLabel ?? new Date(ev.dateKey! + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                      {ev.notes && <p className="text-[13px] text-muted-fg mt-1 whitespace-pre-line">{ev.notes}</p>}
                      {ev.source && <p className="text-[11px] text-muted-fg/70 mt-1 italic">{ev.source}</p>}
                    </div>
                    <button
                      onClick={() => removeCommunityEvent(ev.id)}
                      className="text-muted-fg/60 hover:text-red-500 transition-colors flex-shrink-0"
                      aria-label="Remove"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modalEvent && (
        <EventDetailModal
          event={modalEvent}
          hijriYear={viewYear}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}

// Dated entries first (soonest first, today prioritized), then undated/tentative-label entries by creation order.
function sortedCommunityEvents(events: CommunityEvent[]): CommunityEvent[] {
  const today = todayKey();
  return [...events].sort((a, b) => {
    const aKey = a.dateKey ?? '9999-99-99';
    const bKey = b.dateKey ?? '9999-99-99';
    if (aKey !== bKey) return aKey < today && bKey >= today ? 1 : bKey < today && aKey >= today ? -1 : aKey.localeCompare(bKey);
    return a.createdAt - b.createdAt;
  });
}

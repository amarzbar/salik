import { lazy, Suspense, useMemo, useState } from 'react';
import { useAppStore, DHIKR_DEFS, PRAYER_LABELS, todayKey, activeDate, type DhikrId } from '../store';
import { todayHijri, HIJRI_MONTHS } from '../utils/hijri';
import { DHIKR_TEXTS, TEXT_FOR_DHIKR, type DhikrTextId } from '../data/dhikrTexts';

const DhikrReader = lazy(() => import('../components/DhikrReader'));

function ReadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-11 h-11 flex items-center justify-center rounded-full text-primary active:bg-muted flex-shrink-0"
      aria-label={`Read ${label}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/>
        <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>
      </svg>
    </button>
  );
}

export default function DhikrScreen() {
  const { state, setDhikr, toggleDhikrSub, dhikrStreak } = useAppStore();
  const todayK = todayKey();
  const today = activeDate();
  const hijri = useMemo(() => todayHijri(activeDate()), []);
  const [reading, setReading] = useState<DhikrTextId | null>(null);

  // Group by prayer time
  const byTime = useMemo(() => {
    const groups: Record<string, typeof DHIKR_DEFS> = {
      fajr: [], dhuhr: [], asr: [], maghrib: [], all: [],
    };
    DHIKR_DEFS.forEach(d => {
      groups[d.prayerTime]?.push(d);
    });
    return groups;
  }, []);

  const TIME_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'all'] as const;
  const TIME_LABEL: Record<string, string> = {
    fajr: 'After Fajr', dhuhr: 'After Dhuhr', asr: 'After Asr',
    maghrib: 'After Maghrib', all: 'After Each Prayer',
  };

  const totalDhikr = DHIKR_DEFS.length;
  const doneDhikr = DHIKR_DEFS.filter(def => {
    const val = state.dhikr[todayK]?.[def.id];
    if (def.subItems) {
      return Array.isArray(val) && (val as boolean[]).every(Boolean);
    }
    return val === true;
  }).length;

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto pb-6">
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-[22px] font-bold text-foreground tracking-tight">Dhikr</h2>
          <p className="text-[14px] text-muted-fg">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' · '}{hijri.day} {HIJRI_MONTHS[hijri.month - 1]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-4 mb-4 p-4 bg-card rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-foreground">Today's completion</span>
            <span className="text-[13px] font-semibold text-primary tabular-nums">{doneDhikr}/{totalDhikr}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(doneDhikr / totalDhikr) * 100}%` }}
            />
          </div>
        </div>

        {/* Dhikr groups */}
        {TIME_ORDER.map(time => {
          const defs = byTime[time];
          if (!defs?.length) return null;
          return (
            <div key={time} className="mx-4 mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2 px-1">
                {TIME_LABEL[time]}
              </p>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {defs.map((def, idx) => {
                  const val = state.dhikr[todayK]?.[def.id];
                  const streak = dhikrStreak(def.id, def.subItems?.length);

                  if (def.subItems) {
                    const subs = Array.isArray(val)
                      ? (val as boolean[])
                      : Array(def.subItems.length).fill(false);
                    const subDone = subs.filter(Boolean).length;
                    const allDone = subDone === def.subItems.length;

                    return (
                      <div key={def.id}>
                        {idx > 0 && <div className="h-px bg-border mx-4" />}
                        <div className="px-4 py-3">
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allDone ? 'bg-primary' : 'bg-border'}`} />
                                <p className={`text-[15px] font-semibold ${allDone ? 'text-muted-fg line-through' : 'text-foreground'}`}>
                                  {def.name}
                                </p>
                              </div>
                              <p className="font-arabic text-[16px] text-muted-fg pl-4">{def.nameAr}</p>
                            </div>
                            <div className="text-right ml-2">
                              <p className={`text-[13px] font-semibold tabular-nums ${allDone ? 'text-primary' : 'text-muted-fg'}`}>
                                {subDone}/{def.subItems.length}
                              </p>
                              {streak > 0 && (
                                <p className="text-[11px] text-accent font-medium">{streak}d 🔥</p>
                              )}
                            </div>
                            <ReadButton onClick={() => setReading(TEXT_FOR_DHIKR[def.id])} label={def.name} />
                          </div>

                          {/* Sub-items */}
                          <div className="space-y-1.5 pl-4">
                            {def.subItems.map((sub, subIdx) => {
                              const done = subs[subIdx] ?? false;
                              return (
                                <button
                                  key={subIdx}
                                  onClick={() => toggleDhikrSub(todayK, def.id, subIdx, def.subItems!.length)}
                                  className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl transition active:bg-muted text-left"
                                >
                                  <span className={[
                                    'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                                    done ? 'bg-primary border-primary' : 'border-border',
                                  ].join(' ')}>
                                    {done && (
                                      <svg width="7" height="6" viewBox="0 0 7 6" fill="none">
                                        <path d="M1 3L3 5L6 1" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </span>
                                  <span className={`text-[13px] ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>
                                    {sub}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const done = val === true;
                  return (
                    <div key={def.id}>
                      {idx > 0 && <div className="h-px bg-border mx-4" />}
                      <div className="flex items-center pr-2">
                      <button
                        onClick={() => setDhikr(todayK, def.id, !done)}
                        className="flex-1 min-w-0 flex items-center gap-3 px-4 py-4 transition active:bg-muted text-left"
                      >
                        <span className={[
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                          done ? 'bg-primary border-primary' : 'border-border',
                        ].join(' ')}>
                          {done && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[15px] font-semibold ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>
                            {def.name}
                          </p>
                          <p className="font-arabic text-[14px] text-muted-fg">{def.nameAr}</p>
                          <p className="text-[12px] text-muted-fg mt-0.5">{def.description}</p>
                        </div>
                        {streak > 0 && (
                          <div className="text-right">
                            <p className="text-[12px] font-semibold text-accent">{streak}d</p>
                            <p className="text-[10px] text-muted-fg">streak</p>
                          </div>
                        )}
                      </button>
                      <ReadButton onClick={() => setReading(TEXT_FOR_DHIKR[def.id])} label={def.name} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Completion celebration */}
        {doneDhikr === totalDhikr && (
          <div className="mx-4 p-4 bg-secondary rounded-2xl border border-primary/20 text-center">
            <p className="text-2xl mb-1">🌟</p>
            <p className="font-semibold text-primary text-[15px]">All adhkar complete!</p>
            <p className="text-[13px] text-muted-fg mt-0.5">Alhamdulillah — may Allah accept.</p>
          </div>
        )}

        {/* Texts: every dhikr from shaykhfaisal.com, to read or listen to */}
        <div className="mx-4 mt-4 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2 px-1">
            Texts
          </p>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {DHIKR_TEXTS.map((t, idx) => (
              <div key={t.id}>
                {idx > 0 && <div className="h-px bg-border mx-4" />}
                <button
                  onClick={() => setReading(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 transition active:bg-muted text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-foreground">{t.title}</p>
                    <p className="font-arabic text-[14px] text-muted-fg">{t.titleAr}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg flex-shrink-0">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted-fg mt-2 px-1">From shaykhfaisal.com · Arabic, transliteration and English, with audio.</p>
        </div>
      </div>

      {reading && (
        <Suspense fallback={null}>
          <DhikrReader textId={reading} onClose={() => setReading(null)} />
        </Suspense>
      )}
    </div>
  );
}

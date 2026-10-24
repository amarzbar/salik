// Shared dhikr checklist — same interaction model as the Dhikr tab, but
// parameterized by an arbitrary dateKey so it can also retroactively edit
// past days (used by the Calendar view when a previous day is selected).

import { useMemo } from 'react';
import { useAppStore, DHIKR_DEFS } from '../store';

interface Props {
  dateKey: string;
}

export default function DhikrChecklist({ dateKey }: Props) {
  const { state, setDhikr, toggleDhikrSub } = useAppStore();

  const totalDhikr = DHIKR_DEFS.length;
  const doneDhikr = useMemo(() => DHIKR_DEFS.filter(def => {
    const val = state.dhikr[dateKey]?.[def.id];
    if (def.subItems) return Array.isArray(val) && (val as boolean[]).every(Boolean);
    return val === true;
  }).length, [state.dhikr, dateKey]);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg">Dhikr</h3>
        <span className={`text-[12px] font-semibold tabular-nums ${doneDhikr === totalDhikr ? 'text-primary' : 'text-muted-fg'}`}>
          {doneDhikr}/{totalDhikr}
        </span>
      </div>
      <div className="divide-y divide-border">
        {DHIKR_DEFS.map(def => {
          const val = state.dhikr[dateKey]?.[def.id];

          if (def.subItems) {
            const subs = Array.isArray(val) ? (val as boolean[]) : Array(def.subItems.length).fill(false);
            const subDone = subs.filter(Boolean).length;
            const allDone = subDone === def.subItems.length;
            return (
              <div key={def.id} className="px-4 py-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${allDone ? 'bg-primary' : 'bg-border'}`} />
                      <p className={`text-[14px] font-semibold ${allDone ? 'text-muted-fg line-through' : 'text-foreground'}`}>
                        {def.name}
                      </p>
                    </div>
                    <p className="font-arabic text-[14px] text-muted-fg pl-4">{def.nameAr}</p>
                  </div>
                  <p className={`text-[12px] font-semibold tabular-nums ${allDone ? 'text-primary' : 'text-muted-fg'}`}>
                    {subDone}/{def.subItems.length}
                  </p>
                </div>
                <div className="space-y-1 pl-4">
                  {def.subItems.map((sub, subIdx) => {
                    const done = subs[subIdx] ?? false;
                    return (
                      <button
                        key={subIdx}
                        onClick={() => toggleDhikrSub(dateKey, def.id, subIdx, def.subItems!.length)}
                        className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition active:bg-muted text-left"
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
                        <span className={`text-[13px] ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          const done = val === true;
          return (
            <button
              key={def.id}
              onClick={() => setDhikr(dateKey, def.id, !done)}
              className="w-full flex items-center gap-3 px-4 py-3 transition active:bg-muted text-left"
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
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-medium ${done ? 'text-muted-fg line-through' : 'text-foreground'}`}>{def.name}</p>
                <p className="text-[12px] text-muted-fg">{def.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

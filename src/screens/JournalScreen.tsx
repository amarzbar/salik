import { useState, useMemo } from 'react';
import { useAppStore, todayKey, activeDate, toDateKey, dateFromKey } from '../store';
import VoiceNoteButton from '../components/VoiceNoteButton';
import { gregorianToHijri, HIJRI_MONTHS } from '../utils/hijri';
import { PRAYERS, type PrayerStatus } from '../store';

const STATUS_DOT: Record<PrayerStatus, string> = {
  pending: 'bg-border',
  ontime:  'bg-primary',
  late:    'bg-amber-400',
  qada:    'bg-purple-500',
  missed:  'bg-red-400',
};

export default function JournalScreen() {
  const { state, setJournal } = useAppStore();
  const todayK = todayKey();
  const [todayText, setTodayText] = useState(state.journal[todayK]?.text ?? '');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  function saveToday() {
    if (todayText.trim()) setJournal(todayK, todayText);
  }

  const entries = useMemo(() => {
    return Object.entries(state.journal)
      .filter(([key]) => key !== todayK)
      .filter(([, v]) => {
        if (!search.trim()) return true;
        return v.text.toLowerCase().includes(search.toLowerCase());
      })
      .sort(([a], [b]) => b.localeCompare(a));
  }, [state.journal, search, todayK]);

  const today = activeDate();
  const todayHijri = gregorianToHijri(today.getFullYear(), today.getMonth() + 1, today.getDate());

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-y-auto pb-6">
        {/* Today's entry */}
        <div className="px-4 pt-4 pb-2">
          <div className="mb-1">
            <h2 className="text-[22px] font-bold text-foreground tracking-tight">
              {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-[13px] text-muted-fg">
              {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
              {' · '}
              {todayHijri.day} {HIJRI_MONTHS[todayHijri.month - 1]} {todayHijri.year} AH
            </p>
          </div>
        </div>

        <div className="mx-4 mb-5 bg-card rounded-2xl border border-border overflow-hidden">
          {/* Prayer snapshot */}
          <div className="px-4 pt-3 pb-2 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">Prayer Snapshot</p>
            <div className="flex gap-2">
              {PRAYERS.map(p => {
                const s = state.prayers[todayK]?.[p] ?? 'pending';
                return (
                  <div key={p} className="flex flex-col items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[s]}`} />
                    <span className="text-[9px] text-muted-fg leading-none">{p[0].toUpperCase()}</span>
                  </div>
                );
              })}
              <div className="flex flex-col items-center gap-1 ml-2">
                <div className="w-2.5 h-2.5 flex items-center justify-center">
                  <span className="text-[10px] leading-none font-semibold text-primary">{state.salawat[todayK] ?? 0}</span>
                </div>
                <span className="text-[9px] text-muted-fg leading-none">ﷺ</span>
              </div>
            </div>
          </div>

          {/* Text area */}
          <div className="p-4">
            <textarea
              value={todayText}
              onChange={e => setTodayText(e.target.value)}
              onBlur={saveToday}
              placeholder={`What would you like to remember about today, ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}?\n\nNiyyah for tomorrow, reflections, gratitude, du'a answered…`}
              rows={6}
              className="w-full resize-none bg-transparent text-[16px] text-foreground placeholder:text-muted-fg border-none outline-none leading-relaxed"
            />
            <div className="mt-2">
              <VoiceNoteButton
                onText={t => {
                  const next = todayText.trim() ? `${todayText.trimEnd()}\n${t}` : t;
                  setTodayText(next);
                  setJournal(todayK, next);
                }}
              />
            </div>
          </div>

          {/* Save indicator */}
          {todayText.trim() && (
            <div className="px-4 pb-3 flex items-center justify-between">
              <p className="text-[12px] text-muted-fg italic">Auto-saved on blur</p>
              <button
                onClick={saveToday}
                className="text-[12px] font-semibold text-primary"
              >
                Save now
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mx-4 mb-4">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-fg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search past entries…"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-[16px] text-foreground placeholder:text-muted-fg outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Past entries */}
        {entries.length > 0 ? (
          <div className="mx-4 space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-widest text-muted-fg px-1">
              Past Entries ({entries.length})
            </h3>
            {entries.map(([key, entry]) => {
              const d = dateFromKey(key);
              const hd = gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
              const isExp = expanded === key;
              const snippet = entry.text.slice(0, 120);
              return (
                <button
                  key={key}
                  onClick={() => setExpanded(isExp ? null : key)}
                  className="w-full bg-card rounded-2xl border border-border p-4 text-left transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <p className="text-[14px] font-semibold text-foreground">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[12px] text-muted-fg">
                        {hd.day} {HIJRI_MONTHS[hd.month - 1]} {hd.year} AH
                      </p>
                    </div>
                    {/* Prayer dots */}
                    <div className="flex gap-1 mt-0.5">
                      {PRAYERS.map(p => {
                        const s = state.prayers[key]?.[p] ?? 'pending';
                        return <div key={p} className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />;
                      })}
                    </div>
                  </div>
                  <p className={`text-[13px] text-muted-fg leading-relaxed ${isExp ? '' : 'line-clamp-2'}`}>
                    {isExp ? entry.text : snippet + (entry.text.length > 120 ? '…' : '')}
                  </p>
                  {entry.text.length > 120 && (
                    <p className="text-[12px] text-primary font-medium mt-1.5">
                      {isExp ? 'Show less' : 'Read more'}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mx-4 text-center py-10">
            <p className="text-4xl mb-3">📓</p>
            <p className="text-[15px] font-medium text-foreground mb-1">
              {search ? 'No entries match your search' : 'No past entries yet'}
            </p>
            <p className="text-[13px] text-muted-fg">
              {search ? 'Try a different keyword.' : 'Start writing today to build your journal.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

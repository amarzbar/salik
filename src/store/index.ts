import { useState, useEffect, useCallback } from 'react';
import { calcPrayerTimes, resolveLocation, type AsrMethod, type AngleMethodId } from '../utils/prayerTimes';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerStatus = 'pending' | 'ontime' | 'late' | 'missed' | 'qada';
export type DhikrId =
  | 'wirdul_aam_fajr'
  | 'wirdul_aam_maghrib'
  | 'hasbunallah_dhuhr'
  | 'hizbul_bahr_asr'
  | 'salatut_taaziyah';

export const PRAYERS: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS: Record<PrayerName, string> = {
  fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

export interface DhikrDef {
  id: DhikrId;
  name: string;
  nameAr: string;
  description: string;
  prayerTime: PrayerName | 'all';
  subItems?: string[];
}

export const DHIKR_DEFS: DhikrDef[] = [
  {
    id: 'wirdul_aam_fajr',
    name: 'Wirdul Aam',
    nameAr: 'الوِرد العام',
    description: 'Morning litany — after Fajr',
    prayerTime: 'fajr',
  },
  {
    id: 'hasbunallah_dhuhr',
    name: 'Hasbunallah',
    nameAr: 'حَسْبُنَا اللَّهُ وَنِعْمَ الوَكِيل',
    description: 'Hasbunallāh wa niʿmal wakīl — after Dhuhr',
    prayerTime: 'dhuhr',
  },
  {
    id: 'hizbul_bahr_asr',
    name: 'Hizbul Bahr',
    nameAr: 'حِزب البحر',
    description: "The Sea Litany of Imam al-Shadhili — after Asr",
    prayerTime: 'asr',
  },
  {
    id: 'wirdul_aam_maghrib',
    name: 'Wirdul Aam',
    nameAr: 'الوِرد العام',
    description: 'Evening litany — after Maghrib',
    prayerTime: 'maghrib',
  },
  {
    id: 'salatut_taaziyah',
    name: "Salatut Ta'ziyah",
    nameAr: 'صلاة التعزية',
    description: 'Consoling salawat — after each of the 5 prayers',
    prayerTime: 'all',
    subItems: ['After Fajr', 'After Dhuhr', 'After Asr', 'After Maghrib', 'After Isha'],
  },
];

// ─── Community & Halaqah notes ────────────────────────────────────────────
// Announcements from the Shaykh/halaqah that aren't part of the fixed Islamic
// calendar — travel dates, performances, ongoing projects (Salawat/Sunnah/
// Qasidah), visits, etc. Added on request (e.g. after pasting halaqah notes)
// rather than user-entered via a form, so this is intentionally freeform.

export type CommunityEventCategory =
  | 'reminder' | 'project' | 'event' | 'performance' | 'travel' | 'study' | 'other';

export interface CommunityEvent {
  id: string;
  title: string;
  category: CommunityEventCategory;
  dateKey?: string;    // YYYY-MM-DD when a firm date is known
  dateLabel?: string;  // human label for ranges/approximate dates ("End of September")
  tentative: boolean;  // true when the date/detail wasn't confirmed in the notes
  notes?: string;
  source?: string;     // where this came from, e.g. "Halaqah — 1 Rabi al-Awwal 1448 / 14 Aug 2026"
  createdAt: number;
}

export interface AppState {
  prayers:      Record<string, Partial<Record<PrayerName, PrayerStatus>>>;
  dhikr:        Record<string, Partial<Record<DhikrId, boolean | boolean[]>>>;
  salawat:      Record<string, number>;
  salawatGoal:  number;
  eventActions: Record<string, Record<string, boolean>>; // key = eventId_hYear
  journal:      Record<string, { text: string; ts: number }>;
  communityEvents: CommunityEvent[];
  updatedAt: number; // bumped on every local write — lets sync tell recency apart, not just "server always wins"
  settings: {
    city:              string;
    darkMode:          'system' | 'light' | 'dark';
    notifications:     boolean;
    prayerNotifs:      boolean;
    dhikrNotifs:       boolean;
    eventNotifs:       boolean;
    reflectionNotifs:  boolean; // daily hadith on the virtue of Salah
    eodNudgeNotifs:    boolean; // evening nudge for any prayers still unmarked
    notifLeadMin:      number;
    onboardingDone:    boolean;
    iosPromptDismissed:boolean;
    // Prayer calculation methodology (editable — see SettingsScreen)
    asrMethod:         AsrMethod;      // 'hanafi' (default) | 'shafi'
    angleMethod:       AngleMethodId;  // Fajr/Isha angle preset, default 'mwl'
    // Location: device geolocation preferred when available, city preset as fallback
    useGeolocation:    boolean;
    lat?:              number;
    lng?:              number;
    tzOffsetHours?:    number;
  };
}

const DEFAULTS: AppState = {
  prayers: {},
  dhikr: {},
  salawat: {},
  salawatGoal: 100,
  eventActions: {},
  communityEvents: [],
  updatedAt: 0,
  journal: {},
  settings: {
    city: 'london',
    darkMode: 'system',
    notifications: false,
    prayerNotifs: true,
    dhikrNotifs: true,
    eventNotifs: true,
    reflectionNotifs: true,
    eodNudgeNotifs: true,
    notifLeadMin: 10,
    onboardingDone: false,
    iosPromptDismissed: false,
    asrMethod: 'hanafi',
    angleMethod: 'mwl',
    useGeolocation: false,
  },
};

// ─── Date key helpers ─────────────────────────────────────────────────────────

export function toDateKey(d: Date): string {
  // Local calendar date, NOT toISOString() (which is UTC) — using UTC here
  // silently shifted anything done in the evening onto the next day for
  // anyone west of UTC (e.g. after ~8pm in Toronto/EDT, UTC has already
  // rolled over to tomorrow), scattering a day's prayers/dhikr across two
  // different date buckets.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey(): string {
  return toDateKey(new Date());
}
export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Auto status detection ─────────────────────────────────────────────────
// Instead of asking the user to self-classify, work out on-time/late/qada
// from the clock: same-day within the prayer's window = on time, same-day
// but the window has closed = late, marked on any later day = qada.
// 'missed' stays an explicit user choice (see cycle below).
//
// IMPORTANT: each prayer's window does NOT run until the *next* prayer's
// time — Fajr's window closes at sunrise (which can be ~90 min after Fajr),
// nowhere near Dhuhr. Only Dhuhr/Asr/Maghrib genuinely run until the next
// prayer's start; Isha runs to the following Fajr, approximated here as
// midnight (calendar-day rollover already handles "next day = qada").

function computeAutoStatus(settings: AppState['settings'], dateKey: string, prayer: PrayerName): PrayerStatus {
  const today = todayKey();
  if (dateKey < today) return 'qada';
  if (dateKey > today) return 'ontime'; // guard; shouldn't occur in the UI

  const loc = resolveLocation(settings);
  const times = calcPrayerTimes(dateFromKey(dateKey), loc.lat, loc.lng, loc.tz, {
    asrMethod: settings.asrMethod,
    angleMethod: settings.angleMethod,
  });
  const hours: Record<PrayerName, number> = {
    fajr: times.fajrH, dhuhr: times.dhuhrH, asr: times.asrH, maghrib: times.maghribH, isha: times.ishaH,
  };
  const windowEnd: Record<PrayerName, number> = {
    fajr: times.sunriseH,
    dhuhr: hours.asr,
    asr: hours.maghrib,
    maghrib: hours.isha,
    isha: 24,
  };
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  return nowH < windowEnd[prayer] ? 'ontime' : 'late';
}

// ─── Global singleton store ───────────────────────────────────────────────────

function load(): AppState {
  try {
    const raw = localStorage.getItem('murid');
    if (raw) return deepMerge(DEFAULTS, JSON.parse(raw)) as AppState;
  } catch { /* ignore */ }
  return { ...DEFAULTS, settings: { ...DEFAULTS.settings } };
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (typeof base !== 'object' || base === null) return override ?? base;
  if (typeof override !== 'object' || override === null) return base;
  // Arrays replace wholesale rather than merging index-by-index (which would
  // otherwise turn them into plain {0:.., 1:..} objects).
  if (Array.isArray(base) || Array.isArray(override)) return override;
  const result = { ...(base as object) };
  for (const k of Object.keys(override as object)) {
    (result as Record<string, unknown>)[k] = deepMerge(
      (base as Record<string, unknown>)[k],
      (override as Record<string, unknown>)[k]
    );
  }
  return result;
}

let _state = load();
const _listeners = new Set<() => void>();

function getState(): AppState { return _state; }

// ─── Backend sync (best-effort; local write always wins immediately) ─────────
// This app is local-first: every write lands in localStorage synchronously so
// the UI never blocks on the network. The full state is then mirrored to the
// server in the background — on load (server -> local merge) and after every
// change (debounced local -> server push). If the network is unavailable the
// push silently fails and is retried on the next change, so nothing is lost.

let _pushTimer: ReturnType<typeof setTimeout> | null = null;

function pushNow(): void {
  // keepalive lets this survive the page being torn down mid-request (e.g.
  // the tab backgrounding right after a tap) — a plain fetch would otherwise
  // get cancelled and the write would silently never reach the server.
  fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: _state }),
    keepalive: true,
  }).catch(() => { /* offline — will retry on next local change */ });
}

function schedulePush(): void {
  if (typeof window === 'undefined') return;
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => { _pushTimer = null; pushNow(); }, 800);
}

// Flush any pending debounced write immediately when the app is about to be
// backgrounded/suspended — otherwise an in-flight 800ms timer can get killed
// by iOS before it fires, silently dropping the write (see syncFromServer's
// recency check below for why a dropped write used to also get overwritten
// by stale server data on next launch).
function flushPending(): void {
  if (_pushTimer) {
    clearTimeout(_pushTimer);
    _pushTimer = null;
    pushNow();
  }
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
  window.addEventListener('pagehide', flushPending);
}

async function syncFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) return;
    const { state } = await res.json();
    if (!state) return;

    // Recency check, not "server always wins": if this device has local
    // writes newer than what the server has (e.g. a previous push never
    // completed before the tab was backgrounded/killed), adopting the
    // server's older blob would silently discard those writes — which is
    // exactly the "tap a prayer and everything else reverts" bug. Only
    // adopt the server copy when it's actually newer; otherwise push local
    // up so the server catches up instead.
    const serverUpdatedAt = typeof state.updatedAt === 'number' ? state.updatedAt : 0;
    if (serverUpdatedAt > _state.updatedAt) {
      _state = deepMerge(DEFAULTS, state) as AppState;
      try { localStorage.setItem('murid', JSON.stringify(_state)); } catch { /* ignore */ }
      _listeners.forEach(cb => cb());
    } else if (_state.updatedAt > 0) {
      pushNow(); // local is newer (or equal) — make sure the server has it too
    }
  } catch { /* offline on boot — keep local cache, next change will sync up */ }
}

if (typeof window !== 'undefined') {
  syncFromServer();
}

function setState(fn: (s: AppState) => AppState): void {
  _state = { ...fn(_state), updatedAt: Date.now() };
  try { localStorage.setItem('murid', JSON.stringify(_state)); } catch { /* ignore */ }
  _listeners.forEach(cb => cb());
  schedulePush();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore() {
  const [, tick] = useState(0);

  useEffect(() => {
    const cb = () => tick(n => n + 1);
    _listeners.add(cb);
    return () => { _listeners.delete(cb); };
  }, []);

  const state = getState();

  const setPrayerStatus = useCallback((dateKey: string, prayer: PrayerName, status: PrayerStatus) => {
    setState(s => ({
      ...s,
      prayers: { ...s.prayers, [dateKey]: { ...s.prayers[dateKey], [prayer]: status } },
    }));
  }, []);

  // Tap cycle: pending -> auto-detected (ontime/late/qada, computed fresh
  // each tap from the clock) -> missed (explicit) -> back to pending.
  const cyclePrayerStatus = useCallback((dateKey: string, prayer: PrayerName) => {
    const cur = getState().prayers[dateKey]?.[prayer] ?? 'pending';
    const next: PrayerStatus =
      cur === 'pending' ? computeAutoStatus(getState().settings, dateKey, prayer)
      : cur === 'missed' ? 'pending'
      : 'missed';
    setState(s => ({
      ...s,
      prayers: { ...s.prayers, [dateKey]: { ...s.prayers[dateKey], [prayer]: next } },
    }));
  }, []);

  const setDhikr = useCallback((dateKey: string, id: DhikrId, value: boolean | boolean[]) => {
    setState(s => ({
      ...s,
      dhikr: { ...s.dhikr, [dateKey]: { ...s.dhikr[dateKey], [id]: value } },
    }));
  }, []);

  const toggleDhikrSub = useCallback((dateKey: string, id: DhikrId, idx: number, total: number) => {
    setState(s => {
      const cur = (s.dhikr[dateKey]?.[id] as boolean[] | undefined) ?? Array(total).fill(false);
      const next = [...cur];
      next[idx] = !next[idx];
      return { ...s, dhikr: { ...s.dhikr, [dateKey]: { ...s.dhikr[dateKey], [id]: next } } };
    });
  }, []);

  const incSalawat = useCallback((dateKey: string, by = 1) => {
    setState(s => ({
      ...s,
      salawat: { ...s.salawat, [dateKey]: (s.salawat[dateKey] ?? 0) + by },
    }));
  }, []);

  const setSalawatGoal = useCallback((goal: number) => {
    setState(s => ({ ...s, salawatGoal: Math.max(1, goal) }));
  }, []);

  const resetSalawat = useCallback((dateKey: string) => {
    setState(s => ({ ...s, salawat: { ...s.salawat, [dateKey]: 0 } }));
  }, []);

  const setEventAction = useCallback((eventKey: string, actionId: string, done: boolean) => {
    setState(s => ({
      ...s,
      eventActions: {
        ...s.eventActions,
        [eventKey]: { ...s.eventActions[eventKey], [actionId]: done },
      },
    }));
  }, []);

  const setJournal = useCallback((dateKey: string, text: string) => {
    setState(s => ({
      ...s,
      journal: { ...s.journal, [dateKey]: { text, ts: Date.now() } },
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<AppState['settings']>) => {
    setState(s => ({ ...s, settings: { ...s.settings, ...patch } }));
  }, []);

  const addCommunityEvent = useCallback((event: Omit<CommunityEvent, 'id' | 'createdAt'>) => {
    const full: CommunityEvent = { ...event, id: `ce_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now() };
    setState(s => ({ ...s, communityEvents: [...s.communityEvents, full] }));
    return full.id;
  }, []);

  const removeCommunityEvent = useCallback((id: string) => {
    setState(s => ({ ...s, communityEvents: s.communityEvents.filter(e => e.id !== id) }));
  }, []);

  // ── Derived helpers ────────────────────────────────────────────────────────

  const prayerStatusFor = (dateKey: string, prayer: PrayerName): PrayerStatus =>
    state.prayers[dateKey]?.[prayer] ?? 'pending';

  const dhikrDoneFor = (dateKey: string, id: DhikrId): boolean | boolean[] => {
    const v = state.dhikr[dateKey]?.[id];
    return v ?? false;
  };

  const salawatFor = (dateKey: string): number => state.salawat[dateKey] ?? 0;

  const prayerStreak = (): number => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(d);
      const day = state.prayers[key] ?? {};
      const done = PRAYERS.every(p => {
        const s = day[p];
        return s === 'ontime' || s === 'late' || s === 'qada';
      });
      if (!done && i > 0) break;
      if (done) streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  const dhikrStreak = (id: DhikrId, subLen?: number): number => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = toDateKey(d);
      const val = state.dhikr[key]?.[id];
      let done: boolean;
      if (subLen && Array.isArray(val)) done = (val as boolean[]).every(Boolean);
      else done = val === true;
      if (!done && i > 0) break;
      if (done) streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  };

  return {
    state,
    setPrayerStatus,
    cyclePrayerStatus,
    setDhikr,
    toggleDhikrSub,
    incSalawat,
    setSalawatGoal,
    resetSalawat,
    setEventAction,
    setJournal,
    updateSettings,
    addCommunityEvent,
    removeCommunityEvent,
    prayerStatusFor,
    dhikrDoneFor,
    salawatFor,
    prayerStreak,
    dhikrStreak,
  };
}

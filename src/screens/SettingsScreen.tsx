import { useState, useEffect } from 'react';
import { CITIES, ANGLE_METHODS, ASR_METHODS, requestGeolocation, type AngleMethodId, type AsrMethod } from '../utils/prayerTimes';
import { useAppStore, THEMES, type Theme } from '../store';
import { subscribeToPush, unsubscribeFromPush } from '../push';

interface Props { onBack: () => void; }

type DarkMode = 'system' | 'light' | 'dark';
type Page = 'notifications' | 'appearance' | 'location' | 'salawat' | 'about';

const PAGE_TITLES: Record<Page, string> = {
  notifications: 'Notifications',
  appearance: 'Appearance',
  location: 'Location & Calculation',
  salawat: 'Salawat Goal',
  about: 'About',
};

const MENU: { page: Page; icon: string; label: string; sub: string }[] = [
  { page: 'notifications', icon: '🔔', label: 'Notifications', sub: 'Reminders, timing and alerts' },
  { page: 'appearance',    icon: '🎨', label: 'Appearance',    sub: 'Display mode and color theme' },
  { page: 'location',      icon: '📍', label: 'Location & Calculation', sub: 'City, geolocation, prayer method' },
  { page: 'salawat',       icon: '📿', label: 'Salawat Goal',  sub: 'Daily salawat target' },
  { page: 'about',         icon: 'ℹ️', label: 'About',         sub: 'App info and data' },
];

export default function SettingsScreen({ onBack }: Props) {
  const { state, updateSettings, setSalawatGoal } = useAppStore();
  const s = state.settings;
  const [page, setPage] = useState<Page | null>(null);
  const [goalInput, setGoalInput] = useState(String(state.salawatGoal));
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  // Separate from OS permission: whether a push subscription actually made it
  // to the server. Permission can be "granted" while the subscription itself
  // silently failed (e.g. opened as a Safari tab instead of the installed
  // Home Screen app, which iOS requires for Web Push).
  const [pushSubStatus, setPushSubStatus] = useState<'idle' | 'subscribing' | 'ok' | 'failed'>('idle');

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === 'granted') {
      setPushSubStatus('subscribing');
      const ok = await subscribeToPush();
      if (ok) {
        updateSettings({ notifications: true });
        setPushSubStatus('ok');
      } else {
        setPushSubStatus('failed');
      }
    }
  }

  useEffect(() => {
    if (notifStatus !== 'granted' || !('serviceWorker' in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(async sub => {
        if (cancelled) return;
        if (sub) { setPushSubStatus('ok'); return; }
        setPushSubStatus('subscribing');
        const ok = await subscribeToPush();
        if (!cancelled) setPushSubStatus(ok ? 'ok' : 'failed');
      })
      .catch(() => { if (!cancelled) setPushSubStatus('failed'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disableNotifications() {
    updateSettings({ notifications: false });
    await unsubscribeFromPush();
  }

  const [locStatus, setLocStatus] = useState<'idle' | 'locating' | 'unavailable'>('idle');

  async function useMyLocation() {
    setLocStatus('locating');
    const pos = await requestGeolocation();
    if (!pos) {
      setLocStatus('unavailable');
      return;
    }
    let timeZone: string | undefined;
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { timeZone = undefined; }
    updateSettings({
      useGeolocation: true,
      lat: pos.lat,
      lng: pos.lng,
      timeZone,
      tzOffsetHours: -new Date().getTimezoneOffset() / 60,
    });
    setLocStatus('idle');
  }

  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + var(--edge-ramp))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button
          onClick={() => (page ? setPage(null) : onBack())}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-foreground">{page ? PAGE_TITLES[page] : 'Settings'}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Root menu */}
        {page === null && (
          <div className="px-4 pt-4 space-y-2">
            {MENU.map(m => (
              <button
                key={m.page}
                onClick={() => setPage(m.page)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border text-left transition active:scale-[0.99]"
              >
                <span className="text-[22px] w-9 h-9 flex items-center justify-center rounded-xl bg-secondary">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">{m.label}</p>
                  <p className="text-[12px] text-muted-fg truncate">{m.sub}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-fg flex-shrink-0">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))}
          </div>
        )}

        {page !== null && (
          <div key={page} className="settings-subpage">

            {/* ── Notifications ── */}
            {page === 'notifications' && (
              <Section>
                <div className="px-4 pt-2 pb-4 space-y-3">
                  {notifStatus === 'granted' && pushSubStatus === 'ok' ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary border border-primary/20">
                      <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
                          <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15"/>
                          <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[13px] text-primary font-medium">Notifications enabled</span>
                      </div>
                      {s.notifications && (
                        <button onClick={disableNotifications} className="text-[12px] text-muted-fg underline">Turn off</button>
                      )}
                    </div>
                  ) : notifStatus === 'granted' && pushSubStatus === 'subscribing' ? (
                    <div className="p-3 rounded-xl bg-muted border border-border">
                      <p className="text-[13px] text-muted-fg">Setting up push notifications…</p>
                    </div>
                  ) : notifStatus === 'granted' && pushSubStatus === 'failed' ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 space-y-2">
                      <p className="text-[13px] text-red-700 dark:text-red-400">
                        Permission is granted, but the push subscription failed — reminders won't actually arrive.
                        {isIOS && !isInstalled && ' On iOS this usually means the app needs to be opened from the Home Screen icon, not a Safari tab.'}
                      </p>
                      <button onClick={requestNotifications} className="text-[12px] font-semibold text-red-700 dark:text-red-400 underline">Try again</button>
                    </div>
                  ) : notifStatus === 'denied' ? (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40">
                      <p className="text-[13px] text-red-700 dark:text-red-400">Notifications are blocked. Enable them in your device settings.</p>
                    </div>
                  ) : (
                    <button onClick={requestNotifications} className="w-full py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px] border border-primary/20 transition active:scale-[0.98]">
                      Enable Notifications
                    </button>
                  )}

                  {isIOS && !isInstalled && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                      <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-300 mb-1">iOS: Install first</p>
                      <p className="text-[12px] text-amber-800 dark:text-amber-400">
                        Add Salik to your Home Screen via Safari's Share menu to enable push notifications on iOS 16.4+.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {[
                      { key: 'prayerNotifs' as const, label: 'Prayer time reminders', desc: `${s.notifLeadMin} min before each prayer` },
                      { key: 'prayerStartNotifs' as const, label: 'Prayer has entered', desc: 'The moment each prayer time begins' },
                      { key: 'dhikrNotifs' as const, label: 'Dhikr reminders', desc: '15 min after each prayer time' },
                      { key: 'eventNotifs' as const, label: 'Islamic date alerts', desc: 'Upcoming events and fasting' },
                      { key: 'reflectionNotifs' as const, label: 'Daily reflection', desc: 'A rotating hadith on the virtue of Salah, once each morning' },
                      { key: 'eodNudgeNotifs' as const, label: 'End-of-day nudge', desc: 'Evening check-in naming any prayers still unmarked' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between py-3 px-4 bg-card rounded-xl border border-border">
                        <div>
                          <p className="text-[14px] font-medium text-foreground">{item.label}</p>
                          <p className="text-[12px] text-muted-fg">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => updateSettings({ [item.key]: !s[item.key] })}
                          className={['relative w-11 h-6 rounded-full transition-colors', s[item.key] ? 'bg-primary' : 'bg-border'].join(' ')}
                        >
                          <span className={['absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', s[item.key] ? 'translate-x-5' : 'translate-x-0'].join(' ')} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-card rounded-xl border border-border p-4">
                    <p className="text-[14px] font-medium text-foreground mb-1">Notification lead time</p>
                    <p className="text-[12px] text-muted-fg mb-3">How many minutes before prayer time</p>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20, 30].map(min => (
                        <button
                          key={min}
                          onClick={() => updateSettings({ notifLeadMin: min })}
                          className={['flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors', s.notifLeadMin === min ? 'bg-secondary border-primary text-primary' : 'bg-muted border-transparent text-muted-fg'].join(' ')}
                        >
                          {min}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {/* ── Appearance ── */}
            {page === 'appearance' && (
              <Section>
                <div className="px-4 pt-2 pb-4">
                  <p className="text-[13px] text-muted-fg mb-3">Choose your preferred display mode.</p>
                  <div className="flex gap-2">
                    {(['system', 'light', 'dark'] as DarkMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => updateSettings({ darkMode: mode })}
                        className={['flex-1 py-2.5 rounded-xl border text-[13px] font-medium capitalize transition-colors', s.darkMode === mode ? 'bg-secondary border-primary text-primary' : 'bg-card border-border text-foreground'].join(' ')}
                      >
                        {mode === 'system' ? '⚙️ Auto' : mode === 'light' ? '☀️ Light' : '🌙 Dark'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[13px] text-muted-fg mt-5 mb-3">Color theme.</p>
                  <div className="grid grid-cols-5 gap-2">
                    {THEMES.map(t => {
                      const active = (s.theme ?? 'emerald') === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => updateSettings({ theme: t.id as Theme })}
                          aria-label={t.label}
                          className={['flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-colors', active ? 'border-primary bg-secondary' : 'border-border bg-card'].join(' ')}
                        >
                          <span className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: t.swatch }} />
                          <span className={['text-[11px] font-medium', active ? 'text-primary' : 'text-muted-fg'].join(' ')}>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>
            )}

            {/* ── Location & Calculation ── */}
            {page === 'location' && (
              <>
                <SubHeading>Location</SubHeading>
                <Section>
                  <p className="text-[13px] text-muted-fg px-4 pt-2 pb-3">
                    {s.useGeolocation
                      ? 'Using your device location for accurate prayer times.'
                      : 'Prayer times are calculated for your selected city — or use your exact location.'}
                  </p>
                  <div className="px-4 pb-3">
                    <button
                      onClick={useMyLocation}
                      disabled={locStatus === 'locating'}
                      className={['w-full py-2.5 rounded-xl border text-[13px] font-semibold transition-colors', s.useGeolocation ? 'bg-secondary border-primary text-primary' : 'bg-card border-border text-foreground'].join(' ')}
                    >
                      {locStatus === 'locating' ? 'Locating…' : s.useGeolocation ? '📍 Using my location' : '📍 Use my location'}
                    </button>
                    {locStatus === 'unavailable' && (
                      <p className="text-[12px] text-muted-fg mt-2">Location isn't available (unsupported or permission denied) — pick a city below instead.</p>
                    )}
                  </div>
                  <div className="px-4 grid grid-cols-2 gap-2 pb-3">
                    {Object.entries(CITIES).map(([key, c]) => (
                      <button
                        key={key}
                        onClick={() => updateSettings({ city: key, useGeolocation: false })}
                        className={['py-2.5 px-3 rounded-xl border text-left text-[13px] font-medium transition-colors', !s.useGeolocation && s.city === key ? 'bg-secondary border-primary text-primary' : 'bg-card border-border text-foreground'].join(' ')}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </Section>

                <SubHeading>Prayer Calculation</SubHeading>
                <Section>
                  <p className="text-[13px] text-muted-fg px-4 pt-2 pb-3">Asr timing school and the angle method used for Fajr/Isha.</p>
                  <div className="px-4 pb-3">
                    <p className="text-[12px] font-semibold text-muted-fg uppercase tracking-wide mb-2">Asr Method</p>
                    <div className="flex gap-2">
                      {(Object.entries(ASR_METHODS) as [AsrMethod, typeof ASR_METHODS[AsrMethod]][]).map(([key, m]) => (
                        <button
                          key={key}
                          onClick={() => updateSettings({ asrMethod: key })}
                          className={['flex-1 py-2.5 rounded-xl border text-[13px] font-medium transition-colors', s.asrMethod === key ? 'bg-secondary border-primary text-primary' : 'bg-card border-border text-foreground'].join(' ')}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-[12px] font-semibold text-muted-fg uppercase tracking-wide mb-2">Angle Method</p>
                    <div className="grid grid-cols-1 gap-2">
                      {(Object.entries(ANGLE_METHODS) as [AngleMethodId, typeof ANGLE_METHODS[AngleMethodId]][]).map(([key, m]) => (
                        <button
                          key={key}
                          onClick={() => updateSettings({ angleMethod: key })}
                          className={['py-2.5 px-3 rounded-xl border text-left text-[13px] font-medium transition-colors', s.angleMethod === key ? 'bg-secondary border-primary text-primary' : 'bg-card border-border text-foreground'].join(' ')}
                        >
                          {m.name} <span className="text-muted-fg font-normal">({m.fajr}° / {m.isha}°)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>
              </>
            )}

            {/* ── Salawat Goal ── */}
            {page === 'salawat' && (
              <Section>
                <div className="px-4 pt-2 pb-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] text-muted-fg mb-2">Daily salawat target</p>
                    <input
                      type="number"
                      value={goalInput}
                      min="1"
                      max="9999"
                      onChange={e => setGoalInput(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(goalInput);
                        if (!isNaN(n) && n > 0) { setSalawatGoal(n); setGoalInput(String(n)); }
                        else setGoalInput(String(state.salawatGoal));
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-muted border border-border text-[16px] font-semibold text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[28px] font-bold text-primary">{state.salawatGoal}</p>
                    <p className="text-[11px] text-muted-fg">per day</p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── About ── */}
            {page === 'about' && (
              <>
                {!isInstalled && (
                  <>
                    <SubHeading>Install App</SubHeading>
                    <Section>
                      <div className="px-4 pt-2 pb-4">
                        <div className="p-4 rounded-xl bg-secondary border border-primary/20">
                          <p className="text-[14px] font-semibold text-primary mb-1">Add to Home Screen</p>
                          {isIOS ? (
                            <p className="text-[13px] text-muted-fg">Tap the Share button (↑) in Safari → "Add to Home Screen" → Add. Opens as a full-screen app with push notification support.</p>
                          ) : (
                            <p className="text-[13px] text-muted-fg">Tap the browser menu (⋮) → "Add to Home Screen" or "Install App" to install Salik on your device.</p>
                          )}
                        </div>
                      </div>
                    </Section>
                  </>
                )}
                <SubHeading>About</SubHeading>
                <Section>
                  <div className="px-4 pt-2 pb-4 space-y-1">
                    <Row label="App name" value="Salik" />
                    <Row label="Version" value="1.1.0" />
                    <Row label="Calendar" value="Civil/Tabular Islamic Calendar" />
                    <Row label="Prayer method" value="Muslim World League (MWL)" />
                  </div>
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => {
                        if (confirm('This will clear all your prayer, dhikr, salawat, and journal data. Are you sure?')) {
                          localStorage.removeItem('murid');
                          window.location.reload();
                        }
                      }}
                      className="w-full py-3 rounded-xl border border-destructive/40 text-destructive text-[14px] font-medium transition active:scale-[0.98]"
                    >
                      Clear all data
                    </button>
                  </div>
                </Section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-border">{children}</div>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg px-4 pt-5 pb-2">{children}</p>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[14px] text-muted-fg">{label}</span>
      <span className="text-[14px] text-foreground font-medium">{value}</span>
    </div>
  );
}

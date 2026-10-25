import { useState, useEffect } from 'react';
import { CITIES, ANGLE_METHODS, ASR_METHODS, requestGeolocation, type AngleMethodId, type AsrMethod } from '../utils/prayerTimes';
import { useAppStore } from '../store';
import { subscribeToPush, unsubscribeFromPush } from '../push';

interface Props { onBack: () => void; }

type DarkMode = 'system' | 'light' | 'dark';

export default function SettingsScreen({ onBack }: Props) {
  const { state, updateSettings, setSalawatGoal } = useAppStore();
  const s = state.settings;
  const [goalInput, setGoalInput] = useState(String(state.salawatGoal));
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  // Separate from OS permission: whether a push subscription actually made
  // it to the server. Permission can be "granted" while the subscription
  // itself silently failed (e.g. opened as a regular Safari tab instead of
  // the installed Home Screen app, which iOS requires for Web Push) — so
  // the UI needs its own signal instead of just trusting notifStatus.
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
        // Don't claim success — permission was granted but the subscription
        // itself failed, so no reminder will ever actually arrive.
        setPushSubStatus('failed');
      }
    }
  }

  // If permission was already granted in a past session, verify there's
  // still a live push subscription rather than assuming so — this is what
  // actually catches the "enabled but nothing ever arrives" case.
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
      // Geolocation unsupported, denied, or timed out — skip and keep the city preset.
      setLocStatus('unavailable');
      return;
    }
    updateSettings({
      useGeolocation: true,
      lat: pos.lat,
      lng: pos.lng,
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
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <h1 className="text-[18px] font-bold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Location */}
        <Section title="Location">
          <p className="text-[13px] text-muted-fg px-4 pb-3">
            {s.useGeolocation
              ? 'Using your device location for accurate prayer times.'
              : 'Prayer times are calculated for your selected city — or use your exact location.'}
          </p>
          <div className="px-4 pb-3">
            <button
              onClick={useMyLocation}
              disabled={locStatus === 'locating'}
              className={[
                'w-full py-2.5 rounded-xl border text-[13px] font-semibold transition-colors',
                s.useGeolocation
                  ? 'bg-secondary border-primary text-primary'
                  : 'bg-card border-border text-foreground',
              ].join(' ')}
            >
              {locStatus === 'locating' ? 'Locating…' : s.useGeolocation ? '📍 Using my location' : '📍 Use my location'}
            </button>
            {locStatus === 'unavailable' && (
              <p className="text-[12px] text-muted-fg mt-2">
                Location isn't available (unsupported or permission denied) — pick a city below instead.
              </p>
            )}
          </div>
          <div className="px-4 grid grid-cols-2 gap-2 pb-2">
            {Object.entries(CITIES).map(([key, c]) => (
              <button
                key={key}
                onClick={() => updateSettings({ city: key, useGeolocation: false })}
                className={[
                  'py-2.5 px-3 rounded-xl border text-left text-[13px] font-medium transition-colors',
                  !s.useGeolocation && s.city === key
                    ? 'bg-secondary border-primary text-primary'
                    : 'bg-card border-border text-foreground',
                ].join(' ')}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Section>

        {/* Prayer calculation methodology */}
        <Section title="Prayer Calculation">
          <p className="text-[13px] text-muted-fg px-4 pb-3">Asr timing school and the angle method used for Fajr/Isha.</p>
          <div className="px-4 pb-3">
            <p className="text-[12px] font-semibold text-muted-fg uppercase tracking-wide mb-2">Asr Method</p>
            <div className="flex gap-2">
              {(Object.entries(ASR_METHODS) as [AsrMethod, typeof ASR_METHODS[AsrMethod]][]).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => updateSettings({ asrMethod: key })}
                  className={[
                    'flex-1 py-2.5 rounded-xl border text-[13px] font-medium transition-colors',
                    s.asrMethod === key
                      ? 'bg-secondary border-primary text-primary'
                      : 'bg-card border-border text-foreground',
                  ].join(' ')}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pb-2">
            <p className="text-[12px] font-semibold text-muted-fg uppercase tracking-wide mb-2">Angle Method</p>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(ANGLE_METHODS) as [AngleMethodId, typeof ANGLE_METHODS[AngleMethodId]][]).map(([key, m]) => (
                <button
                  key={key}
                  onClick={() => updateSettings({ angleMethod: key })}
                  className={[
                    'py-2.5 px-3 rounded-xl border text-left text-[13px] font-medium transition-colors',
                    s.angleMethod === key
                      ? 'bg-secondary border-primary text-primary'
                      : 'bg-card border-border text-foreground',
                  ].join(' ')}
                >
                  {m.name} <span className="text-muted-fg font-normal">({m.fajr}° / {m.isha}°)</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="px-4 pb-3">
            <p className="text-[13px] text-muted-fg mb-3">Choose your preferred display mode.</p>
            <div className="flex gap-2">
              {(['system', 'light', 'dark'] as DarkMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ darkMode: mode })}
                  className={[
                    'flex-1 py-2.5 rounded-xl border text-[13px] font-medium capitalize transition-colors',
                    s.darkMode === mode
                      ? 'bg-secondary border-primary text-primary'
                      : 'bg-card border-border text-foreground',
                  ].join(' ')}
                >
                  {mode === 'system' ? '⚙️ Auto' : mode === 'light' ? '☀️ Light' : '🌙 Dark'}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Salawat goal */}
        <Section title="Salawat Goal">
          <div className="px-4 pb-3 flex items-center gap-3">
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

        {/* Notifications */}
        <Section title="Notifications">
          <div className="px-4 pb-4 space-y-3">
            {/* Permission + subscription status */}
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
                  <button onClick={disableNotifications} className="text-[12px] text-muted-fg underline">
                    Turn off
                  </button>
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
                <button onClick={requestNotifications} className="text-[12px] font-semibold text-red-700 dark:text-red-400 underline">
                  Try again
                </button>
              </div>
            ) : notifStatus === 'denied' ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40">
                <p className="text-[13px] text-red-700 dark:text-red-400">
                  Notifications are blocked. Enable them in your device settings.
                </p>
              </div>
            ) : (
              <button
                onClick={requestNotifications}
                className="w-full py-3 rounded-xl bg-secondary text-primary font-semibold text-[14px] border border-primary/20 transition active:scale-[0.98]"
              >
                Enable Notifications
              </button>
            )}

            {/* iOS install reminder */}
            {isIOS && !isInstalled && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-300 mb-1">iOS: Install first</p>
                <p className="text-[12px] text-amber-800 dark:text-amber-400">
                  Add Salik to your Home Screen via Safari's Share menu to enable push notifications on iOS 16.4+.
                </p>
              </div>
            )}

            {/* Notification toggles */}
            <div className="space-y-2">
              {[
                { key: 'prayerNotifs' as const, label: 'Prayer time reminders', desc: `${s.notifLeadMin} min before each prayer` },
                { key: 'dhikrNotifs' as const, label: 'Dhikr reminders', desc: 'After prayer time notifications' },
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
                    className={[
                      'relative w-11 h-6 rounded-full transition-colors',
                      s[item.key] ? 'bg-primary' : 'bg-border',
                    ].join(' ')}
                  >
                    <span className={[
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                      s[item.key] ? 'translate-x-5' : 'translate-x-0',
                    ].join(' ')} />
                  </button>
                </div>
              ))}
            </div>

            {/* Lead time */}
            <div className="bg-card rounded-xl border border-border p-4">
              <p className="text-[14px] font-medium text-foreground mb-1">Notification lead time</p>
              <p className="text-[12px] text-muted-fg mb-3">How many minutes before prayer time</p>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 30].map(min => (
                  <button
                    key={min}
                    onClick={() => updateSettings({ notifLeadMin: min })}
                    className={[
                      'flex-1 py-2 rounded-lg text-[13px] font-semibold border transition-colors',
                      s.notifLeadMin === min
                        ? 'bg-secondary border-primary text-primary'
                        : 'bg-muted border-transparent text-muted-fg',
                    ].join(' ')}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* PWA Install */}
        {!isInstalled && (
          <Section title="Install App">
            <div className="px-4 pb-4">
              <div className="p-4 rounded-xl bg-secondary border border-primary/20">
                <p className="text-[14px] font-semibold text-primary mb-1">Add to Home Screen</p>
                {isIOS ? (
                  <p className="text-[13px] text-muted-fg">
                    Tap the Share button (↑) in Safari → "Add to Home Screen" → Add. Opens as a full-screen app with push notification support.
                  </p>
                ) : (
                  <p className="text-[13px] text-muted-fg">
                    Tap the browser menu (⋮) → "Add to Home Screen" or "Install App" to install Salik on your device.
                  </p>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* About */}
        <Section title="About">
          <div className="px-4 pb-4 space-y-1">
            <Row label="App name" value="Salik" />
            <Row label="Version" value="1.0.0" />
            <Row label="Calendar" value="Civil/Tabular Islamic Calendar" />
            <Row label="Prayer method" value="Muslim World League (MWL)" />
            <Row label="Asr method" value="Shafi'i (shadow factor 1)" />
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
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg px-4 mb-2">{title}</p>
      <div className="border-t border-b border-border">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[14px] text-muted-fg">{label}</span>
      <span className="text-[14px] text-foreground font-medium">{value}</span>
    </div>
  );
}

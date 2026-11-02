import { useState, useEffect } from 'react';
import { useAppStore } from './store';
import { subscribeToPush } from './push';
import BottomNav from './components/BottomNav';
import TodayScreen from './screens/TodayScreen';
import CalendarScreen from './screens/CalendarScreen';
import PrayersScreen from './screens/PrayersScreen';
import DhikrScreen from './screens/DhikrScreen';
import JournalScreen from './screens/JournalScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';

export type TabId = 'today' | 'calendar' | 'prayers' | 'dhikr' | 'journal';

const TAB_TITLES: Record<TabId, string> = {
  today: 'Salik',
  calendar: 'Calendar',
  prayers: 'Prayers',
  dhikr: 'Dhikr',
  journal: 'Journal',
};

export default function App() {
  const { state, updateSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [showSettings, setShowSettings] = useState(false);

  // Self-heal push subscriptions: the "Notifications enabled" toggle only
  // reflects OS permission, not whether a subscription actually made it to
  // the server (it can silently fail, or lapse). If notifications are meant
  // to be on and the OS permission is granted, make sure a subscription
  // actually exists every time the app opens — subscribeToPush() is a no-op
  // if a valid one is already registered, so this is safe to call on every boot.
  useEffect(() => {
    if (
      state.settings.notifications &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      subscribeToPush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.notifications]);

  // Apply dark mode + color palette to <html>
  useEffect(() => {
    const root = document.documentElement;
    const { darkMode } = state.settings;
    const palette = state.settings.theme ?? 'emerald';
    root.setAttribute('data-theme', palette);
    // Page-background per palette/mode, kept in sync with the opaque status
    // bar (status-bar-style "default" takes its colour from theme-color).
    const BG: Record<string, { light: string; dark: string }> = {
      emerald:   { light: '#F9F6F2', dark: '#141210' },
      midnight:  { light: '#F4F6FC', dark: '#0C1326' },
      turquoise: { light: '#F2F8F7', dark: '#07201E' },
      violet:    { light: '#F7F5FC', dark: '#130C22' },
      rose:      { light: '#FCF5F5', dark: '#1E1012' },
    };
    const setDark = (dark: boolean) => {
      root.classList.toggle('dark', dark);
      const bg = (BG[palette] ?? BG.emerald)[dark ? 'dark' : 'light'];
      document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg));
    };

    if (darkMode === 'dark') {
      setDark(true);
      return;
    }
    if (darkMode === 'light') {
      setDark(false);
      return;
    }
    // System
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (dark: boolean) => setDark(dark);
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [state.settings.darkMode, state.settings.theme]);

  // One-time backfill: older installs using device geolocation stored only a
  // fixed tzOffsetHours, which can't follow DST. Capture the device's IANA
  // zone so prayer times (and server reminders, once synced) track DST.
  useEffect(() => {
    const s = state.settings;
    if (s.useGeolocation && !s.timeZone) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) updateSettings({ timeZone: tz });
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!state.settings.onboardingDone) {
    return <OnboardingScreen />;
  }

  if (showSettings) {
    return (
      <div className="flex flex-col h-full bg-background">
        <SettingsScreen onBack={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 bg-background border-b border-border"
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 12px) + var(--edge-ramp))', paddingBottom: '10px' }}
      >
        <h1 className="text-[17px] font-bold text-foreground tracking-tight">
          {TAB_TITLES[activeTab]}
        </h1>
        <button
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-fg hover:bg-muted transition-colors"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain">
        {activeTab === 'today'    && <TodayScreen onNavigate={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarScreen />}
        {activeTab === 'prayers'  && <PrayersScreen />}
        {activeTab === 'dhikr'    && <DhikrScreen />}
        {activeTab === 'journal'  && <JournalScreen />}
      </main>

      {/* Bottom navigation */}
      <BottomNav active={activeTab} onSelect={setActiveTab} />
    </div>
  );
}

import { useState } from 'react';
import { CITIES } from '../utils/prayerTimes';
import { useAppStore } from '../store';

const STEP_COUNT = 3;

export default function OnboardingScreen() {
  const { updateSettings } = useAppStore();
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('london');
  const [notifStatus, setNotifStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  async function requestNotifications() {
    setNotifStatus('requesting');
    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm === 'granted' ? 'granted' : 'denied');
      if (perm === 'granted') {
        updateSettings({ notifications: true });
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          try {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: undefined,
            });
            console.log('Push subscription:', sub);
          } catch { /* VAPID key not configured — push requires a backend */ }
        }
      }
    } catch {
      setNotifStatus('denied');
    }
  }

  function finish() {
    updateSettings({ city, onboardingDone: true });
  }

  return (
    <div className="flex flex-col h-full bg-background"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 20px) + var(--edge-ramp))', paddingBottom: 'env(safe-area-inset-bottom, 20px)' }}>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-4">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        {step === 0 && <StepWelcome />}
        {step === 1 && <StepLocation city={city} onChange={setCity} />}
        {step === 2 && <StepNotifications isIOS={isIOS} isInstalled={isInStandaloneMode} status={notifStatus} onRequest={requestNotifications} />}
      </div>

      {/* Footer */}
      <div className="px-6 pb-2 flex flex-col gap-3">
        {step < STEP_COUNT - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="w-full py-4 rounded-2xl bg-primary text-primary-fg font-semibold text-[16px] transition active:scale-[0.98]"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={finish}
            className="w-full py-4 rounded-2xl bg-primary text-primary-fg font-semibold text-[16px] transition active:scale-[0.98]"
          >
            Get Started
          </button>
        )}
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="text-muted-fg text-[14px] py-1">
            Back
          </button>
        )}
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center pt-8 pb-4">
      <div className="w-24 h-24 rounded-[28px] bg-secondary flex items-center justify-center mb-8">
        <svg width="52" height="52" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
          <circle cx="215" cy="260" r="130" fill="var(--primary)" opacity="0.9"/>
          <circle cx="268" cy="212" r="112" fill="var(--secondary)"/>
          <polygon points="348,135 355,155 376,156 359,169 366,189 348,177 330,189 337,169 320,156 341,155" fill="var(--primary)"/>
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
        Salik
      </h1>
      <p className="text-[16px] text-muted-fg leading-relaxed max-w-xs">
        Your personal Islamic calendar and daily worship tracker — prayers, dhikr, fasting, and more.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 w-full text-left">
        {[
          { icon: '🌙', title: 'Hijri Calendar', desc: 'Islamic events & dates' },
          { icon: '🕌', title: 'Prayer Tracker', desc: 'All 5 daily prayers' },
          { icon: '📿', title: 'Dhikr Tracker', desc: 'Named daily adhkar' },
          { icon: '📓', title: 'Daily Journal', desc: 'Personal reflections' },
        ].map(f => (
          <div key={f.title} className="p-3.5 rounded-2xl bg-card border border-border">
            <div className="text-2xl mb-1.5">{f.icon}</div>
            <div className="text-[13px] font-semibold text-foreground">{f.title}</div>
            <div className="text-[12px] text-muted-fg">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepLocation({ city, onChange }: { city: string; onChange: (v: string) => void }) {
  return (
    <div className="pt-6 pb-4">
      <h2 className="text-2xl font-bold text-foreground mb-2">Your location</h2>
      <p className="text-[15px] text-muted-fg mb-6">
        Select your city so we can calculate accurate prayer times.
      </p>
      <div className="space-y-2">
        {Object.entries(CITIES).map(([key, c]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
              city === key
                ? 'border-primary bg-secondary'
                : 'border-border bg-card',
            ].join(' ')}
          >
            <span className={`font-medium text-[15px] ${city === key ? 'text-primary' : 'text-foreground'}`}>
              {c.name}
            </span>
            {city === key && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
                <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15"/>
                <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepNotifications({
  isIOS, isInstalled, status, onRequest,
}: {
  isIOS: boolean; isInstalled: boolean; status: string; onRequest: () => void;
}) {
  return (
    <div className="pt-6 pb-4">
      <h2 className="text-2xl font-bold text-foreground mb-2">Stay on track</h2>
      <p className="text-[15px] text-muted-fg mb-6">
        Enable notifications to receive reminders for prayer times, dhikr, and upcoming Islamic dates.
      </p>

      {/* iOS install notice */}
      {isIOS && !isInstalled && (
        <div className="mb-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">📱</span>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-300 text-[14px] mb-1">
                Install first for iOS notifications
              </p>
              <p className="text-amber-800 dark:text-amber-400 text-[13px] leading-relaxed">
                iOS requires the app to be added to your Home Screen before push notifications work.
              </p>
              <ol className="mt-2 space-y-1 text-[13px] text-amber-800 dark:text-amber-400">
                <li>1. Tap the <strong>Share</strong> button in Safari (↑)</li>
                <li>2. Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>3. Tap <strong>Add</strong>, then open the app from Home Screen</li>
                <li>4. Come back to this step to enable notifications</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Notification button */}
      {status === 'idle' && (
        <button
          onClick={onRequest}
          className="w-full py-4 rounded-2xl bg-secondary text-primary font-semibold text-[16px] border border-primary/20 transition active:scale-[0.98]"
        >
          Enable Notifications
        </button>
      )}
      {status === 'requesting' && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      )}
      {status === 'granted' && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary border border-primary/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary">
            <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15"/>
            <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-primary font-medium">Notifications enabled!</span>
        </div>
      )}
      {status === 'denied' && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40">
          <p className="text-red-700 dark:text-red-400 text-[14px]">
            Notifications were blocked. You can enable them later in Settings.
          </p>
        </div>
      )}

      <p className="text-center text-muted-fg text-[13px] mt-4">
        You can manage notification settings at any time.
      </p>
    </div>
  );
}

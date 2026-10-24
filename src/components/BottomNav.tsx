import type React from 'react';
import type { TabId } from '../App';

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: (active: boolean) => React.ReactElement }[] = [
  {
    id: 'today',
    label: 'Today',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" fill={active ? 'currentColor' : 'none'} strokeWidth={active ? 0 : 1.8}/>
        <line x1="12" y1="2" x2="12" y2="4"/>
        <line x1="12" y1="20" x2="12" y2="22"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="2" y1="12" x2="4" y2="12"/>
        <line x1="20" y1="12" x2="22" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.12 : 0} strokeWidth={active ? 2 : 1.8}/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    id: 'prayers',
    label: 'Prayers',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3C8 3 5 7 5 11c0 6 7 10 7 10s7-4 7-10c0-4-3-8-7-8z"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0}/>
        <circle cx="12" cy="11" r="2.5" fill={active ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth={active ? 0 : 1.6}/>
      </svg>
    ),
  },
  {
    id: 'dhikr',
    label: 'Dhikr',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="12" r="1.5" fill={active ? 'currentColor' : 'none'}/>
        <circle cx="12" cy="12" r="1.5" fill={active ? 'currentColor' : 'none'}/>
        <circle cx="19" cy="12" r="1.5" fill={active ? 'currentColor' : 'none'}/>
        <path d="M12 2a5 5 0 0 1 5 5v10a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}
          stroke="currentColor" strokeWidth={active ? 1.8 : 1.8}/>
      </svg>
    ),
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: active => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeWidth={active ? 2 : 1.8}/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0}/>
        <line x1="9" y1="7" x2="15" y2="7"/>
        <line x1="9" y1="11" x2="15" y2="11"/>
      </svg>
    ),
  },
];

export default function BottomNav({ active, onSelect }: Props) {
  return (
    // 46px of tap area plus only enough of the iPhone's 34px home-indicator
    // inset to keep the labels clear of the indicator (inset - 18px = 16px).
    // The full inset, or even half of it, made the bar feel too tall.
    <nav
      className="flex items-stretch border-t border-border bg-card"
      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) - 18px), 4px)' }}
    >
      {TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={[
              'flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-0.5 transition-colors min-h-[46px]',
              isActive ? 'text-primary' : 'text-muted-fg',
            ].join(' ')}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.icon(isActive)}
            <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-fg'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

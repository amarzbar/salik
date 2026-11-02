// Milestone badges for the home screen. Pure functions over already-computed
// tallies, so there's no coupling to the store's internals.

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  earned: boolean;
}

export const STREAK_MILESTONES = [3, 7, 30, 100, 365];

export interface BadgeTallies {
  currentStreak: number;
  completeDayKeys: string[]; // 'YYYY-MM-DD' for every day all 5 prayers were kept
  lifetimeSalawat: number;
  totalPrayers: number;      // count of prayers ever marked (ontime/late/qada)
}

// Longest run of consecutive calendar days among the given date keys.
export function longestRun(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const days = [...new Set(dateKeys)].sort();
  let best = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + 'T00:00:00');
    const cur = new Date(days[i] + 'T00:00:00');
    const gap = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = gap === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function computeBadges(t: BadgeTallies): {
  earned: Badge[];
  next: { label: string; emoji: string; current: number; target: number } | null;
} {
  const best = Math.max(t.currentStreak, longestRun(t.completeDayKeys));
  const perfectDays = t.completeDayKeys.length;

  const all: Badge[] = [
    { id: 'streak3',   label: '3-Day Streak',  emoji: '🔥', earned: best >= 3 },
    { id: 'streak7',   label: 'Week Strong',   emoji: '🔥', earned: best >= 7 },
    { id: 'streak30',  label: 'Month Devoted', emoji: '🌙', earned: best >= 30 },
    { id: 'streak100', label: '100 Days',      emoji: '💎', earned: best >= 100 },
    { id: 'streak365', label: 'A Full Year',   emoji: '👑', earned: best >= 365 },
    { id: 'perfect1',  label: 'Perfect Day',   emoji: '✅', earned: perfectDays >= 1 },
    { id: 'perfect7',  label: '7 Perfect Days', emoji: '⭐', earned: perfectDays >= 7 },
    { id: 'salawat1k', label: '1,000 Salawat', emoji: '📿', earned: t.lifetimeSalawat >= 1000 },
    { id: 'salawat10k', label: '10,000 Salawat', emoji: '📿', earned: t.lifetimeSalawat >= 10000 },
    { id: 'prayers100', label: '100 Prayers',  emoji: '🕌', earned: t.totalPrayers >= 100 },
    { id: 'prayers1000', label: '1,000 Prayers', emoji: '🕌', earned: t.totalPrayers >= 1000 },
  ];

  const nextTarget = STREAK_MILESTONES.find(m => best < m);
  const next = nextTarget
    ? { label: `${nextTarget}-day streak`, emoji: '🔥', current: t.currentStreak, target: nextTarget }
    : null;

  return { earned: all.filter(b => b.earned), next };
}

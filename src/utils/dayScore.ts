// Per-day completion scores, shared by the Prayer History heatmap and the
// Calendar so both screens color a day the same way.
import { PRAYERS, DHIKR_DEFS, type DhikrId } from '../store';

const KEPT = new Set(['ontime', 'late', 'qada']);

/** Fraction of the five prayers kept (on time, late or made up) on a day: 0–1. */
export function prayerRate(day: Partial<Record<string, string>> | undefined): number {
  if (!day) return 0;
  return PRAYERS.filter(p => KEPT.has(day[p] as string)).length / PRAYERS.length;
}

/** Fraction of the day's dhikr completed: 0–1. Multi-part dhikr count each part. */
export function dhikrRate(day: Partial<Record<DhikrId, boolean | boolean[]>> | undefined): number {
  if (!day) return 0;
  let done = 0;
  for (const def of DHIKR_DEFS) {
    const v = day[def.id];
    if (Array.isArray(v)) done += v.filter(Boolean).length / (def.subItems?.length || v.length || 1);
    else if (v === true) done += 1;
  }
  return done / DHIKR_DEFS.length;
}

/** Heatmap fill for a prayer rate (same scale as the Prayer History grid). */
export function heatColor(rate: number): string {
  if (rate === 0) return 'bg-muted';
  if (rate < 0.4) return 'bg-red-300 dark:bg-red-800';
  if (rate < 0.8) return 'bg-amber-300 dark:bg-amber-700';
  if (rate < 1) return 'bg-primary/50';
  return 'bg-primary';
}

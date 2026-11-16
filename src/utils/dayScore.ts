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

// Calendar day score, counted in "prayer units": each of the five prayers is worth 1, and
// each dhikr is worth a set share of a prayer. Multi-part dhikr (Salatut Ta'ziyah) earn their
// worth proportionally, part by part. The day's score is points earned / points possible,
// placed on the same heatmap scale as Prayer History.
export const PRAYER_POINTS = 1;
export const DHIKR_POINTS: Record<DhikrId, number> = {
  wirdul_aam_fajr: 1,       // Wirdul Aam (morning) = one prayer
  wirdul_aam_maghrib: 1,    // Wirdul Aam (evening) = one prayer
  hasbunallah_dhuhr: 0.5,   // half a prayer
  hizbul_bahr_asr: 0.5,     // half a prayer
  salatut_taaziyah: 0.25,   // a quarter of a prayer, across its five parts
};
export const MAX_DAY_POINTS =
  PRAYERS.length * PRAYER_POINTS + Object.values(DHIKR_POINTS).reduce((a, b) => a + b, 0); // 8.25

/** Points earned on a day, in prayer units (0 – MAX_DAY_POINTS). */
export function dayPoints(
  prayers: Partial<Record<string, string>> | undefined,
  dhikr: Partial<Record<DhikrId, boolean | boolean[]>> | undefined,
): number {
  let pts = PRAYERS.filter(p => KEPT.has(prayers?.[p] as string)).length * PRAYER_POINTS;
  for (const def of DHIKR_DEFS) {
    const v = dhikr?.[def.id];
    const worth = DHIKR_POINTS[def.id] ?? 0;
    if (Array.isArray(v)) pts += worth * (v.filter(Boolean).length / (def.subItems?.length || v.length || 1));
    else if (v === true) pts += worth;
  }
  return pts;
}

/** Weighted day score: 0–1. */
export function dayScore(
  prayers: Partial<Record<string, string>> | undefined,
  dhikr: Partial<Record<DhikrId, boolean | boolean[]>> | undefined,
): number {
  return dayPoints(prayers, dhikr) / MAX_DAY_POINTS;
}

/** Heatmap fill for a prayer rate (same scale as the Prayer History grid). */
export function heatColor(rate: number): string {
  if (rate === 0) return 'bg-muted';
  if (rate < 0.4) return 'bg-red-300 dark:bg-red-800';
  if (rate < 0.8) return 'bg-amber-300 dark:bg-amber-700';
  if (rate < 1) return 'bg-primary/50';
  return 'bg-primary';
}

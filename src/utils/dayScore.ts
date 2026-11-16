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

// Five levels shared by every heatmap: none / low / medium / high / complete.
function level(rate: number): 0 | 1 | 2 | 3 | 4 {
  if (rate === 0) return 0;
  if (rate < 0.4) return 1;
  if (rate < 0.8) return 2;
  if (rate < 1) return 3;
  return 4;
}

// Standard scale: red → amber → green.
const STANDARD_BG = ['bg-muted', 'bg-red-300 dark:bg-red-800', 'bg-amber-300 dark:bg-amber-700', 'bg-primary/50', 'bg-primary'];
const STANDARD_FG = ['text-foreground', 'text-red-950 dark:text-white', 'text-amber-950 dark:text-white', 'text-foreground', 'text-primary-fg'];

// Colorblind-friendly scale (Settings → Appearance): Okabe–Ito colors running orange → blue,
// which stay distinct for red-green (deutan/protan) and blue-yellow (tritan) color blindness,
// and step in brightness too, so the levels separate even in grayscale.
//   low = vermillion, medium = gold, high = sky blue, complete = deep blue
const CB_BG = ['bg-muted', 'bg-[#D55E00]', 'bg-[#E69F00]', 'bg-[#56B4E9]', 'bg-[#0072B2]'];
const CB_FG = ['text-foreground', 'text-white', 'text-[#1A1A1A]', 'text-[#1A1A1A]', 'text-white'];

/** Heatmap fill for a 0–1 rate (same scale on Prayer History and the Calendar). */
export function heatColor(rate: number, colorblind = false): string {
  return (colorblind ? CB_BG : STANDARD_BG)[level(rate)];
}

/** Readable text color to put on top of heatColor(rate). */
export function heatText(rate: number, colorblind = false): string {
  return (colorblind ? CB_FG : STANDARD_FG)[level(rate)];
}

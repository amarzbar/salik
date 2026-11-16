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

// Color schemes for every heatmap (Settings → Appearance → Heatmap colors). Each lists five
// fills for none / low / medium / high / complete, a readable text color for each, and hex
// swatches for the picker. Classes are written out in full so Tailwind generates them.
export type HeatScheme = 'standard' | 'okabe' | 'viridis' | 'cividis' | 'bluered' | 'blues';

export interface HeatSchemeDef {
  label: string;
  description: string;
  bg: string[];       // 5 classes: none, low, medium, high, complete
  fg: string[];       // matching text classes
  swatches: string[]; // low → complete, for the picker
}

export const HEAT_SCHEMES: Record<HeatScheme, HeatSchemeDef> = {
  standard: {
    label: 'Standard',
    description: 'Red to green, in your color theme.',
    bg: ['bg-muted', 'bg-red-300 dark:bg-red-800', 'bg-amber-300 dark:bg-amber-700', 'bg-primary/50', 'bg-primary'],
    fg: ['text-foreground', 'text-red-950 dark:text-white', 'text-amber-950 dark:text-white', 'text-foreground', 'text-primary-fg'],
    swatches: ['#FCA5A5', '#FCD34D', '#8FCBAF', '#1C7A52'],
  },
  // Okabe–Ito: distinct for red-green and blue-yellow color blindness, and steps in brightness.
  okabe: {
    label: 'Orange → Blue',
    description: 'Strong contrast for most kinds of color blindness.',
    bg: ['bg-muted', 'bg-[#D55E00]', 'bg-[#E69F00]', 'bg-[#56B4E9]', 'bg-[#0072B2]'],
    fg: ['text-foreground', 'text-white', 'text-[#1A1A1A]', 'text-[#1A1A1A]', 'text-white'],
    swatches: ['#D55E00', '#E69F00', '#56B4E9', '#0072B2'],
  },
  // Viridis: perceptually even, brightness rises steadily, so it also reads in grayscale.
  viridis: {
    label: 'Viridis',
    description: 'Purple to yellow; reads evenly, even in grayscale.',
    bg: ['bg-muted', 'bg-[#482878]', 'bg-[#31688E]', 'bg-[#35B779]', 'bg-[#FDE725]'],
    fg: ['text-foreground', 'text-white', 'text-white', 'text-[#1A1A1A]', 'text-[#1A1A1A]'],
    swatches: ['#482878', '#31688E', '#35B779', '#FDE725'],
  },
  // Cividis: designed for red-green color blindness; looks nearly the same with or without it.
  cividis: {
    label: 'Cividis',
    description: 'Navy to yellow, built for red-green color blindness.',
    bg: ['bg-muted', 'bg-[#00224E]', 'bg-[#575D6D]', 'bg-[#A69D75]', 'bg-[#FEE838]'],
    fg: ['text-foreground', 'text-white', 'text-white', 'text-[#1A1A1A]', 'text-[#1A1A1A]'],
    swatches: ['#00224E', '#575D6D', '#A69D75', '#FEE838'],
  },
  // Blue–red diverging (ColorBrewer RdBu): two clearly opposite ends.
  bluered: {
    label: 'Blue → Red',
    description: 'Two clearly opposite ends: blue is low, deep red is complete.',
    bg: ['bg-muted', 'bg-[#2166AC]', 'bg-[#92C5DE]', 'bg-[#F4A582]', 'bg-[#B2182B]'],
    fg: ['text-foreground', 'text-white', 'text-[#1A1A1A]', 'text-[#1A1A1A]', 'text-white'],
    swatches: ['#2166AC', '#92C5DE', '#F4A582', '#B2182B'],
  },
  // Single-hue blue: pure lightness, safe even with no color vision at all.
  blues: {
    label: 'Single blue',
    description: 'Pale to deep blue; safest for any color vision.',
    bg: ['bg-muted', 'bg-[#C6DBEF]', 'bg-[#6BAED6]', 'bg-[#2171B5]', 'bg-[#08306B]'],
    fg: ['text-foreground', 'text-[#1A1A1A]', 'text-[#1A1A1A]', 'text-white', 'text-white'],
    swatches: ['#C6DBEF', '#6BAED6', '#2171B5', '#08306B'],
  },
};

/** The scheme the user picked (older installs used an on/off "colorblind" switch = Orange → Blue). */
export function heatSchemeOf(settings: { heatScheme?: HeatScheme; colorblind?: boolean }): HeatScheme {
  return settings.heatScheme ?? (settings.colorblind ? 'okabe' : 'standard');
}

/** Heatmap fill for a 0–1 rate (same scale on Prayer History and the Calendar). */
export function heatColor(rate: number, scheme: HeatScheme = 'standard'): string {
  return (HEAT_SCHEMES[scheme] ?? HEAT_SCHEMES.standard).bg[level(rate)];
}

/** Readable text color to put on top of heatColor(rate). */
export function heatText(rate: number, scheme: HeatScheme = 'standard'): string {
  return (HEAT_SCHEMES[scheme] ?? HEAT_SCHEMES.standard).fg[level(rate)];
}

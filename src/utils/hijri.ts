// Hijri (Islamic) civil/tabular calendar utilities.
// Reference verified: 1 Muharram 1448 AH = June 16, 2026 CE (JDN 2461208).

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;   // 1-30
}

export const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhul Qa'dah", 'Dhul Hijjah',
];

export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

// Civil calendar: leap years by position in 30-year cycle
const LEAP_POS = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);

export function isHijriLeapYear(year: number): boolean {
  return LEAP_POS.has(((year - 1) % 30) + 1);
}

export function hijriMonthDays(year: number, month: number): number {
  if (month % 2 === 1) return 30;
  if (month === 12 && isHijriLeapYear(year)) return 30;
  return 29;
}

// Julian Day Number for Gregorian date (Meeus algorithm)
function gregToJDN(y: number, m: number, d: number): number {
  const Y = m <= 2 ? y - 1 : y;
  const M = m <= 2 ? m + 12 : m;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524;
}

// Gregorian date from Julian Day Number
function jdnToGreg(jdn: number): { year: number; month: number; day: number } {
  const l = jdn + 68569;
  const n = Math.floor((4 * l) / 146097);
  const l2 = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const day = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  return { day, month: j + 2 - 12 * l4, year: 100 * (n - 49) + i + l4 };
}

// Absolute day count from Hijri epoch (used only for diff computation)
function hijriAbsDays(h: HijriDate): number {
  const fullCycles = Math.floor((h.year - 1) / 30);
  const yInCycle = ((h.year - 1) % 30) + 1;
  let days = fullCycles * 10631;
  for (let y = 1; y < yInCycle; y++) {
    days += isHijriLeapYear(fullCycles * 30 + y) ? 355 : 354;
  }
  for (let m = 1; m < h.month; m++) {
    days += hijriMonthDays(h.year, m);
  }
  return days + h.day;
}

const REF_H: HijriDate = { year: 1448, month: 1, day: 1 };
const REF_JDN = 2461208; // June 16, 2026
const REF_ABS = hijriAbsDays(REF_H);

export function gregorianToHijri(year: number, month: number, day: number): HijriDate {
  const jdn = gregToJDN(year, month, day);
  return addHijriDays(REF_H, jdn - REF_JDN);
}

export function hijriToGregorian(hYear: number, hMonth: number, hDay: number): { year: number; month: number; day: number } {
  const diff = hijriAbsDays({ year: hYear, month: hMonth, day: hDay }) - REF_ABS;
  return jdnToGreg(REF_JDN + diff);
}

function addHijriDays(start: HijriDate, days: number): HijriDate {
  let { year, month, day } = { ...start };
  day += days;
  while (day > hijriMonthDays(year, month)) {
    day -= hijriMonthDays(year, month);
    if (++month > 12) { month = 1; year++; }
  }
  while (day < 1) {
    if (--month < 1) { month = 12; year--; }
    day += hijriMonthDays(year, month);
  }
  return { year, month, day };
}

export function todayHijri(): HijriDate {
  const d = new Date();
  return gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// Day-of-week (0=Sun) for the 1st of a Hijri month
export function hijriMonthStartDow(hYear: number, hMonth: number): number {
  const g = hijriToGregorian(hYear, hMonth, 1);
  return new Date(g.year, g.month - 1, g.day).getDay();
}

export function hijriDayToDate(h: HijriDate): Date {
  const g = hijriToGregorian(h.year, h.month, h.day);
  return new Date(g.year, g.month - 1, g.day);
}

export function formatHijriDate(h: HijriDate): string {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}

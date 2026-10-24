// Hijri (Islamic) civil/tabular calendar utilities — CommonJS port of src/utils/hijri.ts

const LEAP_POS = new Set([2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29]);

function isHijriLeapYear(year) {
  return LEAP_POS.has(((year - 1) % 30) + 1);
}

function hijriMonthDays(year, month) {
  if (month % 2 === 1) return 30;
  if (month === 12 && isHijriLeapYear(year)) return 30;
  return 29;
}

function gregToJDN(y, m, d) {
  const Y = m <= 2 ? y - 1 : y;
  const M = m <= 2 ? m + 12 : m;
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524;
}

function jdnToGreg(jdn) {
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

function hijriAbsDays(h) {
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

const REF_H = { year: 1448, month: 1, day: 1 };
const REF_JDN = 2461208; // June 16, 2026
const REF_ABS = hijriAbsDays(REF_H);

function addHijriDays(start, days) {
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

function gregorianToHijri(year, month, day) {
  const jdn = gregToJDN(year, month, day);
  return addHijriDays(REF_H, jdn - REF_JDN);
}

function todayHijri() {
  const d = new Date();
  return gregorianToHijri(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function hijriToGregorian(hYear, hMonth, hDay) {
  const diff = hijriAbsDays({ year: hYear, month: hMonth, day: hDay }) - REF_ABS;
  return jdnToGreg(REF_JDN + diff);
}

module.exports = { gregorianToHijri, hijriToGregorian, todayHijri, hijriMonthDays, isHijriLeapYear };

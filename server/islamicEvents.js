// Trimmed server-side copy of src/data/islamicEvents.ts — only the fields the
// reminder scheduler needs (id, title, hijri date range). Keep in sync with
// the frontend file if events are added/changed there.

const ISLAMIC_EVENTS = [
  { id: 'ashura',          title: 'Ashura',                          hijriMonth: 1,  hijriDay: 9,  hijriDayEnd: 10 },
  { id: 'mawlid',          title: "Mawlid al-Nabi",                  hijriMonth: 3,  hijriDay: 12 },
  { id: 'isra_miraj',      title: "Isra' wal Mi'raj",                hijriMonth: 7,  hijriDay: 27 },
  { id: 'laylat_barat',    title: "Laylat al-Bara'ah",               hijriMonth: 8,  hijriDay: 15 },
  { id: 'ramadan',         title: 'Ramadan',                         hijriMonth: 9,  hijriDay: 1,  hijriDayEnd: 30 },
  { id: 'laylat_qadr',     title: 'Laylat al-Qadr',                  hijriMonth: 9,  hijriDay: 27 },
  { id: 'eid_fitr',        title: 'Eid al-Fitr',                     hijriMonth: 10, hijriDay: 1 },
  { id: 'shawwal_6',       title: 'Six Days of Shawwal',             hijriMonth: 10, hijriDay: 2,  hijriDayEnd: 30 },
  { id: 'dhul_hijjah_10',  title: 'First 10 Days of Dhul Hijjah',    hijriMonth: 12, hijriDay: 1,  hijriDayEnd: 9 },
  { id: 'eid_adha',        title: 'Eid al-Adha',                     hijriMonth: 12, hijriDay: 10 },
];

module.exports = { ISLAMIC_EVENTS };

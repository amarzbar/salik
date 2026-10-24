export interface ActionItem {
  id: string;
  label: string;
}

export interface IslamicEvent {
  id: string;
  title: string;
  titleAr: string;
  hijriMonth: number;
  hijriDay: number;      // start day (or single day)
  hijriDayEnd?: number;  // end day for ranges
  description: string;
  detail: string;
  category: 'fasting' | 'celebration' | 'remembrance';
  color: 'green' | 'gold' | 'teal' | 'purple';
  actionItems: ActionItem[];
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  {
    id: 'ashura',
    title: 'Ashura',
    titleAr: 'عاشوراء',
    hijriMonth: 1,
    hijriDay: 9,
    hijriDayEnd: 10,
    description: 'The 10th of Muharram — one of the most virtuous days of the year.',
    detail: 'The Prophet ﷺ fasted on Ashura and encouraged fasting on the 9th as well to distinguish from other traditions. Fasting on Ashura expiates the sins of the previous year.',
    category: 'fasting',
    color: 'teal',
    actionItems: [
      { id: 'fast_9',   label: 'Fast on the 9th of Muharram (Tasu\'a)' },
      { id: 'fast_10',  label: 'Fast on the 10th of Muharram (Ashura)' },
      { id: 'sadaqah',  label: 'Be generous with your family (Sadaqah)' },
      { id: 'dua',      label: 'Make abundant du\'a throughout the day' },
      { id: 'salawat',  label: 'Increase salawat on the Prophet ﷺ' },
    ],
  },
  {
    id: 'mawlid',
    title: "Mawlid al-Nabi",
    titleAr: 'المولد النبوي الشريف',
    hijriMonth: 3,
    hijriDay: 12,
    description: "The blessed birthday of the Prophet Muhammad ﷺ.",
    detail: 'A day of joy, gratitude, and increased salawat. Many scholars encourage gathering to praise the Prophet ﷺ, read from the Seerah, and give in charity in gratitude for his ﷺ birth.',
    category: 'celebration',
    color: 'gold',
    actionItems: [
      { id: 'salawat', label: 'Send abundant salawat on the Prophet ﷺ' },
      { id: 'fast',    label: 'Fast in gratitude (optional)' },
      { id: 'seerah',  label: 'Read or share from the Seerah' },
      { id: 'sadaqah', label: 'Give Sadaqah in gratitude' },
      { id: 'gather',  label: 'Attend a gathering of remembrance' },
    ],
  },
  {
    id: 'isra_miraj',
    title: "Isra' wal Mi'raj",
    titleAr: 'الإسراء والمعراج',
    hijriMonth: 7,
    hijriDay: 27,
    description: "The Night Journey and Ascension of the Prophet ﷺ.",
    detail: "The miraculous night journey from Makkah to Jerusalem (al-Aqsa) and the ascension through the heavens, where the five daily prayers were gifted to the Ummah.",
    category: 'remembrance',
    color: 'purple',
    actionItems: [
      { id: 'learn',   label: "Reflect on the Night Journey's lessons" },
      { id: 'salawat', label: 'Increase salawat on the Prophet ﷺ' },
      { id: 'qiyam',   label: 'Offer voluntary night prayers' },
    ],
  },
  {
    id: 'laylat_barat',
    title: "Laylat al-Bara'ah",
    titleAr: 'ليلة البراءة',
    hijriMonth: 8,
    hijriDay: 15,
    description: "The 15th night of Sha'ban — a night of forgiveness.",
    detail: "Many scholars report this is a night when Allah bestows forgiveness generously. It is recommended to observe night prayer, seek forgiveness, and make du'a.",
    category: 'remembrance',
    color: 'purple',
    actionItems: [
      { id: 'qiyam',       label: "Observe Qiyam al-Layl (night prayer)" },
      { id: 'istighfar',   label: 'Seek forgiveness abundantly' },
      { id: 'fast_15',     label: "Fast on the 15th of Sha'ban" },
      { id: 'dua',         label: 'Make du\'a for yourself and loved ones' },
    ],
  },
  {
    id: 'ramadan',
    title: 'Ramadan',
    titleAr: 'رمضان الكريم',
    hijriMonth: 9,
    hijriDay: 1,
    hijriDayEnd: 30,
    description: 'The blessed month of fasting, the Qur\'an, and mercy.',
    detail: 'Ramadan is the greatest month of the year. Every good deed is multiplied, the devils are chained, and the gates of Jannah are opened. The last 10 nights hold Laylat al-Qadr.',
    category: 'fasting',
    color: 'gold',
    actionItems: [
      { id: 'fast',      label: 'Maintain the fast each day' },
      { id: 'tarawih',   label: 'Pray Tarawih each night' },
      { id: 'quran',     label: 'Complete Qur\'an recitation' },
      { id: 'sadaqah',   label: 'Give generously in charity' },
      { id: 'itikaf',    label: "Observe I'tikaf in the last 10 days" },
    ],
  },
  {
    id: 'laylat_qadr',
    title: 'Laylat al-Qadr',
    titleAr: 'ليلة القدر',
    hijriMonth: 9,
    hijriDay: 27,
    description: 'The Night of Power — better than a thousand months.',
    detail: 'Seek Laylat al-Qadr in the odd nights of the last 10 days of Ramadan. The Prophet ﷺ said to recite: Allāhumma innaka ʿafuwwun tuḥibbul ʿafwa faʿfu ʿannī.',
    category: 'remembrance',
    color: 'gold',
    actionItems: [
      { id: 'qiyam',   label: 'Observe night prayer throughout the night' },
      { id: 'dua_qadr',label: "Recite the du'a of Laylat al-Qadr" },
      { id: 'quran',   label: "Recite Qur'an throughout the night" },
      { id: 'itikaf',  label: "Remain in I'tikaf if possible" },
    ],
  },
  {
    id: 'eid_fitr',
    title: 'Eid al-Fitr',
    titleAr: 'عيد الفطر المبارك',
    hijriMonth: 10,
    hijriDay: 1,
    description: 'The festival of breaking the fast.',
    detail: 'Eid al-Fitr marks the end of Ramadan. It is forbidden to fast on this day. Zakat al-Fitr must be paid before the Eid prayer.',
    category: 'celebration',
    color: 'gold',
    actionItems: [
      { id: 'ghusl',       label: 'Take ghusl and dress in best clothes' },
      { id: 'zakat_fitr',  label: 'Pay Zakat al-Fitr before prayer' },
      { id: 'eid_prayer',  label: 'Attend the Eid prayer' },
      { id: 'takbir',      label: 'Recite Takbir on the way to prayer' },
      { id: 'visit',       label: 'Visit family and friends' },
    ],
  },
  {
    id: 'shawwal_6',
    title: 'Six Days of Shawwal',
    titleAr: 'ست من شوال',
    hijriMonth: 10,
    hijriDay: 2,
    hijriDayEnd: 30,
    description: 'Fasting six days in Shawwal is equivalent to fasting the entire year.',
    detail: 'The Prophet ﷺ said: "Whoever fasts Ramadan then follows it with six days of Shawwal, it will be as if he fasted for a lifetime." (Muslim 1164)',
    category: 'fasting',
    color: 'green',
    actionItems: [
      { id: 'fast_1', label: 'Fast — Shawwal Day 1 of 6' },
      { id: 'fast_2', label: 'Fast — Shawwal Day 2 of 6' },
      { id: 'fast_3', label: 'Fast — Shawwal Day 3 of 6' },
      { id: 'fast_4', label: 'Fast — Shawwal Day 4 of 6' },
      { id: 'fast_5', label: 'Fast — Shawwal Day 5 of 6' },
      { id: 'fast_6', label: 'Fast — Shawwal Day 6 of 6' },
    ],
  },
  {
    id: 'dhul_hijjah_10',
    title: 'First 10 Days of Dhul Hijjah',
    titleAr: 'العشر الأوائل من ذي الحجة',
    hijriMonth: 12,
    hijriDay: 1,
    hijriDayEnd: 9,
    description: 'The most beloved days to Allah — fast, remember, and give.',
    detail: 'The Prophet ﷺ said: "There are no days on which righteous deeds are more beloved to Allah than these ten days." (Bukhari 969). Fasting on the Day of Arafah (9th) expiates sins of two years.',
    category: 'fasting',
    color: 'green',
    actionItems: [
      { id: 'fast_1', label: 'Fast — Day 1 (1 Dhul Hijjah)' },
      { id: 'fast_2', label: 'Fast — Day 2 (2 Dhul Hijjah)' },
      { id: 'fast_3', label: 'Fast — Day 3 (3 Dhul Hijjah)' },
      { id: 'fast_4', label: 'Fast — Day 4 (4 Dhul Hijjah)' },
      { id: 'fast_5', label: 'Fast — Day 5 (5 Dhul Hijjah)' },
      { id: 'fast_6', label: 'Fast — Day 6 (6 Dhul Hijjah)' },
      { id: 'fast_7', label: 'Fast — Day 7 (7 Dhul Hijjah)' },
      { id: 'fast_8', label: 'Fast — Day 8 (8 Dhul Hijjah — Tarwiyah)' },
      { id: 'fast_9', label: 'Fast — Day 9 (Arafah — the greatest fast)' },
      { id: 'takbir', label: 'Recite Takbir al-Tashreeq daily' },
      { id: 'sadaqah',label: 'Give Sadaqah each day' },
    ],
  },
  {
    id: 'eid_adha',
    title: 'Eid al-Adha',
    titleAr: 'عيد الأضحى المبارك',
    hijriMonth: 12,
    hijriDay: 10,
    description: 'The festival of sacrifice — a day of gratitude and Qurbani.',
    detail: "Eid al-Adha commemorates the sacrifice of Ibrahim ﷺ. It is the greatest Eid. The Qurbani must be performed after the Eid prayer on 10-13 Dhul Hijjah.",
    category: 'celebration',
    color: 'gold',
    actionItems: [
      { id: 'ghusl',       label: 'Take ghusl and dress in best clothes' },
      { id: 'eid_prayer',  label: 'Attend the Eid prayer' },
      { id: 'qurbani',     label: 'Perform or arrange Qurbani (sacrifice)' },
      { id: 'takbir',      label: 'Recite Takbir al-Tashreeq' },
      { id: 'visit',       label: 'Visit family and friends' },
      { id: 'distribute',  label: 'Distribute meat to family, neighbours & poor' },
    ],
  },
];

export function eventsForDay(hMonth: number, hDay: number): IslamicEvent[] {
  return ISLAMIC_EVENTS.filter(ev => {
    if (ev.hijriMonth !== hMonth) return false;
    const end = ev.hijriDayEnd ?? ev.hijriDay;
    return hDay >= ev.hijriDay && hDay <= end;
  });
}

export function hasEventOnDay(hMonth: number, hDay: number): boolean {
  return eventsForDay(hMonth, hDay).length > 0;
}

// Returns the next event starting from (or after) a given Hijri date in the same year
export function nextUpcomingEvent(hMonth: number, hDay: number): IslamicEvent | null {
  const sorted = [...ISLAMIC_EVENTS].sort((a, b) => {
    if (a.hijriMonth !== b.hijriMonth) return a.hijriMonth - b.hijriMonth;
    return a.hijriDay - b.hijriDay;
  });

  // Events in current month that haven't ended
  const thisMonth = sorted.filter(ev => {
    if (ev.hijriMonth !== hMonth) return false;
    const end = ev.hijriDayEnd ?? ev.hijriDay;
    return end >= hDay;
  });
  if (thisMonth.length) return thisMonth[0];

  // Events in future months (wrap to next Islamic year if needed)
  const later = sorted.filter(ev => ev.hijriMonth > hMonth);
  if (later.length) return later[0];

  return sorted[0] ?? null;
}

export const EVENT_COLOR_CLASSES: Record<IslamicEvent['color'], { bg: string; text: string; dot: string }> = {
  green:  { bg: 'bg-secondary',    text: 'text-primary',   dot: 'bg-primary' },
  gold:   { bg: 'bg-amber-50',     text: 'text-amber-800', dot: 'bg-accent' },
  teal:   { bg: 'bg-cyan-50',      text: 'text-cyan-800',  dot: 'bg-cyan-500' },
  purple: { bg: 'bg-purple-50',    text: 'text-purple-800',dot: 'bg-purple-500' },
};

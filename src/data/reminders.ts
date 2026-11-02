// A rotating corpus of short, well-known reminders on the virtue of Salah and
// dhikr — shown one-per-day on the home screen. Deterministic by date so it
// stays stable through a day and cycles predictably, never random repeats.

export interface Reminder {
  text: string;
  source: string;
  kind: 'hadith' | 'quran';
}

export const REMINDERS: Reminder[] = [
  { kind: 'hadith', text: 'The first matter the servant will be brought to account for on the Day of Judgment is the prayer. If it is sound, the rest of his deeds will be sound.', source: 'al-Tabarani' },
  { kind: 'hadith', text: 'The five daily prayers, and Jumu‘ah to Jumu‘ah, are an expiation for what is between them, so long as major sins are avoided.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'Whoever guards the five prayers — their bowing, their humility, and their timing — will meet Allah with a covenant to enter Paradise.', source: 'Musnad Ahmad' },
  { kind: 'hadith', text: 'The coolness of my eyes has been placed in prayer.', source: 'Sunan al-Nasa’i' },
  { kind: 'hadith', text: 'The servant is closest to his Lord while prostrating, so increase your supplication then.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'Whoever prays the two cool prayers — Fajr and ‘Asr — will enter Paradise.', source: 'al-Bukhari & Muslim' },
  { kind: 'hadith', text: 'Whoever prays Fajr is under the protection of Allah.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'If there were a river at one of your doors in which you bathed five times a day, would any dirt remain? That is the likeness of the five prayers — by them Allah erases sins.', source: 'al-Bukhari & Muslim' },
  { kind: 'hadith', text: 'Between a person and disbelief stands the abandonment of prayer.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'Prayer is light.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'The likeness of the one who remembers his Lord and the one who does not is that of the living and the dead.', source: 'Sahih al-Bukhari' },
  { kind: 'hadith', text: 'Two words light on the tongue, heavy on the Scale, beloved to the Most Merciful: SubhanAllahi wa bihamdih, SubhanAllahil-‘Azim.', source: 'al-Bukhari & Muslim' },
  { kind: 'hadith', text: 'Whoever says "SubhanAllahi wa bihamdih" a hundred times a day, his sins are wiped away though they be like the foam of the sea.', source: 'al-Bukhari & Muslim' },
  { kind: 'hadith', text: 'Shall I not tell you of the best of your deeds, purest to your King, and higher in rank than spending gold and silver? The remembrance of Allah.', source: 'Sunan al-Tirmidhi' },
  { kind: 'hadith', text: 'He who prays ‘Isha in congregation is as though he prayed half the night; and he who prays Fajr in congregation, as though he prayed the whole night.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'When the servant stands to pray, he stands before the Most Merciful; and the Most Merciful turns His Face to him so long as he does not turn away.', source: 'Sunan al-Nasa’i' },
  { kind: 'hadith', text: 'Whoever prays twelve rak‘ahs of sunnah in a day and night, a house will be built for him in Paradise.', source: 'Sahih Muslim' },
  { kind: 'hadith', text: 'The nearest a servant comes to his Lord is in the depth of the night; so if you can be among those who remember Allah in that hour, be so.', source: 'al-Hakim' },
  { kind: 'hadith', text: 'Keep your tongue moist with the remembrance of Allah.', source: 'Sunan al-Tirmidhi' },
  { kind: 'hadith', text: 'Allah says: I am as My servant thinks of Me, and I am with him when he remembers Me.', source: 'al-Bukhari & Muslim' },
  { kind: 'quran', text: 'Indeed, the prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater.', source: 'Qur’an 29:45' },
  { kind: 'quran', text: 'Verily, in the remembrance of Allah do hearts find rest.', source: 'Qur’an 13:28' },
  { kind: 'quran', text: 'Guard strictly the prayers, especially the middle prayer, and stand before Allah devoutly obedient.', source: 'Qur’an 2:238' },
  { kind: 'quran', text: 'So remember Me; I will remember you. And be grateful to Me, and do not deny Me.', source: 'Qur’an 2:152' },
  { kind: 'quran', text: 'Establish prayer at the decline of the sun until the darkness of the night, and the recitation at dawn — indeed, the recitation at dawn is witnessed.', source: 'Qur’an 17:78' },
  { kind: 'quran', text: 'O you who believe, seek help through patience and prayer. Indeed, Allah is with the patient.', source: 'Qur’an 2:153' },
];

// Day-of-year index so the reminder is stable within a day and rotates
// deterministically across the corpus.
export function reminderForDay(date: Date = new Date()): Reminder {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000
  );
  return REMINDERS[dayOfYear % REMINDERS.length];
}

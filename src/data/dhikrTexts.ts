// The Tariqah's own texts for each dhikr (Arabic, transliteration and
// English), as published on shaykhfaisal.com/knowledge-resources/dhikr/.
// The PDFs are not stored in this repo: the server fetches each one from
// shaykhfaisal.com the first time it is opened and keeps a copy in its data
// folder (see /api/texts in server/index.js). Recitations work the same way through
// /api/audio; once opened or played, each is saved on the device for offline use (utils/offline).
// The du'ā' after dhikr isn't on the site, so its PDF ships in server/texts/
// and it has no recording.

import type { DhikrId } from '../store';

export type DhikrTextId =
  | 'wirdul_aam' | 'salat_taziyyah' | 'hasbunallah' | 'hizbul_bahr' | 'latifiyyah' | 'mashishiyyah'
  | 'dua_after_dhikr';

export interface DhikrText {
  id: DhikrTextId;
  title: string;
  titleAr: string;
  audio?: string;
}

export const DHIKR_TEXTS: DhikrText[] = [
  { id: 'wirdul_aam',     title: "Al-Wirdul 'Aam",        titleAr: 'الوِرد العام',          audio: `/api/audio/wirdul_aam.mp3` },
  { id: 'salat_taziyyah', title: 'Al-Salāt Al-Tāziyyah',  titleAr: 'الصلاة التازية',        audio: `/api/audio/salat_taziyyah.mp3` },
  { id: 'hasbunallah',    title: 'HasbunAllāh',           titleAr: 'حسبنا الله',            audio: `/api/audio/hasbunallah.mp3` },
  { id: 'hizbul_bahr',    title: 'Hizbul Bahr',           titleAr: 'حِزب البحر',            audio: `/api/audio/hizbul_bahr.mp3` },
  { id: 'latifiyyah',     title: 'Al-Latīfiyyah',         titleAr: 'اللطيفية',              audio: `/api/audio/latifiyyah.mp3` },
  { id: 'mashishiyyah',   title: 'Al-Ṣalāt Al-Mashīshiyyah', titleAr: 'الصلاة المشيشية',   audio: `/api/audio/mashishiyyah.mp3` },
  { id: 'dua_after_dhikr', title: "Du'ā' After Dhikr",    titleAr: 'الدعاء بعد الذكر' },
];

// Recited after every dhikr; each text's reader links to it at the end.
export const DUA_AFTER_DHIKR: DhikrTextId = 'dua_after_dhikr';

// Which text goes with each tracked daily dhikr.
export const TEXT_FOR_DHIKR: Record<DhikrId, DhikrTextId> = {
  wirdul_aam_fajr: 'wirdul_aam',
  wirdul_aam_maghrib: 'wirdul_aam',
  hasbunallah_dhuhr: 'hasbunallah',
  hizbul_bahr_asr: 'hizbul_bahr',
  salatut_taaziyah: 'salat_taziyyah',
};

export function textById(id: DhikrTextId): DhikrText {
  return DHIKR_TEXTS.find(t => t.id === id)!;
}

export function pdfUrl(id: DhikrTextId): string {
  return `/api/texts/${id}.pdf`;
}

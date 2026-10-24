// The Tariqah's own texts for each dhikr (Arabic, transliteration and
// English), as published on shaykhfaisal.com/knowledge-resources/dhikr/.
// The PDFs are not stored in this repo: the server fetches each one from
// shaykhfaisal.com the first time it is opened and keeps a copy in its data
// folder (see /api/texts in server/index.js). Audio streams from the site.

import type { DhikrId } from '../store';

export type DhikrTextId =
  | 'wirdul_aam' | 'salat_taziyyah' | 'hasbunallah' | 'hizbul_bahr' | 'latifiyyah' | 'mashishiyyah';

export interface DhikrText {
  id: DhikrTextId;
  title: string;
  titleAr: string;
  audio?: string;
}

const SITE = 'https://shaykhfaisal.com';

export const DHIKR_TEXTS: DhikrText[] = [
  { id: 'wirdul_aam',     title: "Al-Wirdul 'Aam",        titleAr: 'الوِرد العام',          audio: `${SITE}/wp-content/uploads/custom/AL-WIRDUL-AAM.mp3` },
  { id: 'salat_taziyyah', title: 'Al-Salāt Al-Tāziyyah',  titleAr: 'الصلاة التازية',        audio: `${SITE}/wp-content/uploads/2020/11/AL-SALAT-AL-TAAZIYYAH-DHIKR.mp3` },
  { id: 'hasbunallah',    title: 'HasbunAllāh',           titleAr: 'حسبنا الله',            audio: `${SITE}/wp-content/uploads/custom/HASBUNALLAH.mp3` },
  { id: 'hizbul_bahr',    title: 'Hizbul Bahr',           titleAr: 'حِزب البحر',            audio: `${SITE}/wp-content/uploads/custom/HizbulBahar.mp3` },
  { id: 'latifiyyah',     title: 'Al-Latīfiyyah',         titleAr: 'اللطيفية',              audio: `${SITE}/wp-content/uploads/custom/AL-LATIFIYYAH.mp3` },
  { id: 'mashishiyyah',   title: 'Al-Ṣalāt Al-Mashīshiyyah', titleAr: 'الصلاة المشيشية',   audio: `${SITE}/wp-content/uploads/2021/01/AL-SALAT-AL-MASHISHIYYAH-03.mp3` },
];

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

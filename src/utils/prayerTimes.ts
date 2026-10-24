// Prayer time calculator — Muslim World League (MWL) method.
// Fajr angle: 18°, Isha angle: 17°, Asr: shadow factor 1 (Shafi'i/Maliki).

const DEG = Math.PI / 180;
const fix360 = (a: number) => a - 360 * Math.floor(a / 360);
const fixH = (a: number) => a - 24 * Math.floor(a / 24);

function julianDay(date: Date): number {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const Y = m <= 2 ? y - 1 : y;
  const M = m <= 2 ? m + 12 : m;
  const A = Math.floor(Y / 100);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + (2 - A + Math.floor(A / 4)) - 1524.5;
}

function sunPos(jd: number): { dec: number; eqT: number } {
  const D = jd - 2451545.0;
  const g = fix360(357.529 + 0.98560028 * D);
  const q = fix360(280.459 + 0.98564736 * D);
  const L = fix360(q + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG));
  const e = 23.439 - 0.00000036 * D;
  const RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) / DEG;
  const dec = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) / DEG;
  return { dec, eqT: q / 15 - fix360(RA) / 15 };
}

function hourAngle(angle: number, lat: number, dec: number): number | null {
  const num = -Math.sin(angle * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG);
  const den = Math.cos(lat * DEG) * Math.cos(dec * DEG);
  if (Math.abs(num / den) > 1) return null;
  return Math.acos(num / den) / DEG / 15;
}

// Asr shadow-length factor: Hanafi = 2 (shadow reaches 2x object + noon shadow),
// Shafi'i/Maliki/Hanbali = 1.
function asrAngle(lat: number, dec: number, factor: number): number | null {
  const target = Math.atan(1 / (factor + Math.tan(Math.abs((lat - dec) * DEG)))) / DEG;
  return hourAngle(-target, lat, dec);
}

function fmt(hours: number): string {
  const h = fixH(hours);
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  const hh = min === 60 ? whole + 1 : whole;
  const mm = min === 60 ? 0 : min;
  const hh24 = hh % 24;
  const suffix = hh24 >= 12 ? 'PM' : 'AM';
  const disp = hh24 > 12 ? hh24 - 12 : hh24 === 0 ? 12 : hh24;
  return `${disp}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export interface PrayerTimes {
  fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string;
  fajrH: number; dhuhrH: number; asrH: number; maghribH: number; ishaH: number;
  sunriseH: number; // end of the Fajr window — NOT the same as the next prayer (Dhuhr)
}

export type AsrMethod = 'hanafi' | 'shafi';
export type AngleMethodId = 'mwl' | 'isna' | 'karachi' | 'egyptian';

export interface AngleMethodDef { name: string; fajr: number; isha: number; }

export const ANGLE_METHODS: Record<AngleMethodId, AngleMethodDef> = {
  mwl:      { name: 'Muslim World League',              fajr: 18,   isha: 17 },
  isna:     { name: 'ISNA (North America)',              fajr: 15,   isha: 15 },
  karachi:  { name: 'Univ. of Islamic Sciences, Karachi', fajr: 18,   isha: 18 },
  egyptian: { name: 'Egyptian General Authority',         fajr: 19.5, isha: 17.5 },
};

export const ASR_METHODS: Record<AsrMethod, { name: string; factor: number }> = {
  hanafi: { name: 'Hanafi',                     factor: 2 },
  shafi:  { name: "Shafi'i / Maliki / Hanbali",  factor: 1 },
};

export interface PrayerCalcOptions {
  asrMethod?: AsrMethod;
  angleMethod?: AngleMethodId;
}

export function calcPrayerTimes(
  date: Date, lat: number, lng: number, tz: number, opts: PrayerCalcOptions = {}
): PrayerTimes {
  const angles = ANGLE_METHODS[opts.angleMethod ?? 'mwl'];
  const asrFactor = ASR_METHODS[opts.asrMethod ?? 'hanafi'].factor;
  const jd = julianDay(date);
  const { dec, eqT } = sunPos(jd);
  const transit = 12 + tz - lng / 15 - eqT;
  const riseSet = hourAngle(0.833, lat, dec) ?? 0;
  const fajrOff = hourAngle(angles.fajr, lat, dec) ?? 0;
  const ishaOff = hourAngle(angles.isha, lat, dec) ?? 0;
  const asrOff = asrAngle(lat, dec, asrFactor) ?? 0;
  return {
    fajr: fmt(transit - fajrOff),
    dhuhr: fmt(transit + 0.018),
    asr: fmt(transit + asrOff),
    maghrib: fmt(transit + riseSet),
    isha: fmt(transit + ishaOff),
    fajrH: fixH(transit - fajrOff),
    dhuhrH: fixH(transit + 0.018),
    asrH: fixH(transit + asrOff),
    maghribH: fixH(transit + riseSet),
    ishaH: fixH(transit + ishaOff),
    sunriseH: fixH(transit - riseSet),
  };
}

export interface CityDef {
  name: string; lat: number; lng: number; tz: number;
}

export const CITIES: Record<string, CityDef> = {
  mecca:        { name: 'Mecca',          lat: 21.389, lng: 39.858,   tz: 3  },
  medina:       { name: 'Medina',         lat: 24.468, lng: 39.614,   tz: 3  },
  london:       { name: 'London',         lat: 51.507, lng: -0.128,   tz: 1  },
  new_york:     { name: 'New York',       lat: 40.713, lng: -74.006,  tz: -4 },
  chicago:      { name: 'Chicago',        lat: 41.878, lng: -87.630,  tz: -5 },
  los_angeles:  { name: 'Los Angeles',    lat: 34.052, lng: -118.244, tz: -7 },
  toronto:      { name: 'Toronto',        lat: 43.653, lng: -79.383,  tz: -4 },
  dubai:        { name: 'Dubai',          lat: 25.205, lng: 55.271,   tz: 4  },
  istanbul:     { name: 'Istanbul',       lat: 41.008, lng: 28.978,   tz: 3  },
  cairo:        { name: 'Cairo',          lat: 30.044, lng: 31.236,   tz: 2  },
  karachi:      { name: 'Karachi',        lat: 24.861, lng: 67.001,   tz: 5  },
  lahore:       { name: 'Lahore',         lat: 31.558, lng: 74.352,   tz: 5  },
  dhaka:        { name: 'Dhaka',          lat: 23.811, lng: 90.413,   tz: 6  },
  kuala_lumpur: { name: 'Kuala Lumpur',   lat: 3.139,  lng: 101.687,  tz: 8  },
  jakarta:      { name: 'Jakarta',        lat: -6.209, lng: 106.846,  tz: 7  },
  paris:        { name: 'Paris',          lat: 48.857, lng: 2.347,    tz: 2  },
  amsterdam:    { name: 'Amsterdam',      lat: 52.370, lng: 4.895,    tz: 2  },
  berlin:       { name: 'Berlin',         lat: 52.520, lng: 13.405,   tz: 2  },
};

// ─── Location resolution ───────────────────────────────────────────────────
// Prefer device geolocation when the user has enabled it and a fix is on
// record; otherwise fall back to the manually-picked city preset.

export interface ResolvedLocation { lat: number; lng: number; tz: number; }

export interface LocationSettings {
  city: string;
  useGeolocation: boolean;
  lat?: number;
  lng?: number;
  tzOffsetHours?: number;
}

export function resolveLocation(settings: LocationSettings): ResolvedLocation {
  if (settings.useGeolocation && typeof settings.lat === 'number' && typeof settings.lng === 'number') {
    return {
      lat: settings.lat,
      lng: settings.lng,
      // Local clock's own UTC offset — correct for wherever the device is
      // physically located, and automatically DST-aware.
      tz: settings.tzOffsetHours ?? -new Date().getTimezoneOffset() / 60,
    };
  }
  const city = CITIES[settings.city] ?? CITIES.london;
  return { lat: city.lat, lng: city.lng, tz: city.tz };
}

// Requests a one-shot geolocation fix. Resolves to null (never rejects) if
// geolocation is unsupported, permission is denied, or it times out — so
// callers can gracefully skip rather than surface a hard error.
export function requestGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600_000 }
    );
  });
}

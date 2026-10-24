// Prayer time calculator — Muslim World League (MWL) method.
// Mirrors src/utils/prayerTimes.ts so the server can compute reminder times.

const DEG = Math.PI / 180;
const fix360 = (a) => a - 360 * Math.floor(a / 360);
const fixH = (a) => a - 24 * Math.floor(a / 24);

function julianDay(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const Y = m <= 2 ? y - 1 : y;
  const M = m <= 2 ? m + 12 : m;
  const A = Math.floor(Y / 100);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + (2 - A + Math.floor(A / 4)) - 1524.5;
}

function sunPos(jd) {
  const D = jd - 2451545.0;
  const g = fix360(357.529 + 0.98560028 * D);
  const q = fix360(280.459 + 0.98564736 * D);
  const L = fix360(q + 1.915 * Math.sin(g * DEG) + 0.02 * Math.sin(2 * g * DEG));
  const e = 23.439 - 0.00000036 * D;
  const RA = Math.atan2(Math.cos(e * DEG) * Math.sin(L * DEG), Math.cos(L * DEG)) / DEG;
  const dec = Math.asin(Math.sin(e * DEG) * Math.sin(L * DEG)) / DEG;
  return { dec, eqT: q / 15 - fix360(RA) / 15 };
}

function hourAngle(angle, lat, dec) {
  const num = -Math.sin(angle * DEG) - Math.sin(lat * DEG) * Math.sin(dec * DEG);
  const den = Math.cos(lat * DEG) * Math.cos(dec * DEG);
  if (Math.abs(num / den) > 1) return null;
  return Math.acos(num / den) / DEG / 15;
}

function asrAngle(lat, dec, factor) {
  const target = Math.atan(1 / (factor + Math.tan(Math.abs((lat - dec) * DEG)))) / DEG;
  return hourAngle(-target, lat, dec);
}

const ANGLE_METHODS = {
  mwl:      { fajr: 18,   isha: 17 },
  isna:     { fajr: 15,   isha: 15 },
  karachi:  { fajr: 18,   isha: 18 },
  egyptian: { fajr: 19.5, isha: 17.5 },
};

const ASR_FACTORS = { hanafi: 2, shafi: 1 };

function calcPrayerTimes(date, lat, lng, tz, opts = {}) {
  const angles = ANGLE_METHODS[opts.angleMethod] || ANGLE_METHODS.mwl;
  const asrFactor = ASR_FACTORS[opts.asrMethod] ?? ASR_FACTORS.hanafi;
  const jd = julianDay(date);
  const { dec, eqT } = sunPos(jd);
  const transit = 12 + tz - lng / 15 - eqT;
  const riseSet = hourAngle(0.833, lat, dec) ?? 0;
  const fajrOff = hourAngle(angles.fajr, lat, dec) ?? 0;
  const ishaOff = hourAngle(angles.isha, lat, dec) ?? 0;
  const asrOff = asrAngle(lat, dec, asrFactor) ?? 0;
  return {
    fajrH: fixH(transit - fajrOff),
    dhuhrH: fixH(transit + 0.018),
    asrH: fixH(transit + asrOff),
    maghribH: fixH(transit + riseSet),
    ishaH: fixH(transit + ishaOff),
    sunriseH: fixH(transit - riseSet),
  };
}

const CITIES = {
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

function resolveLocation(settings) {
  if (settings.useGeolocation && typeof settings.lat === 'number' && typeof settings.lng === 'number') {
    return {
      lat: settings.lat,
      lng: settings.lng,
      tz: typeof settings.tzOffsetHours === 'number' ? settings.tzOffsetHours : 0,
    };
  }
  const city = CITIES[settings.city] || CITIES.london;
  return { lat: city.lat, lng: city.lng, tz: city.tz };
}

module.exports = { calcPrayerTimes, CITIES, fixH, resolveLocation };

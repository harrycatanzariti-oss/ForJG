/**
 * The church season for a date, and the colour of the vestments worn that day.
 *
 * The site's accent colour follows this, so it changes through the year:
 * green in Ordinary Time, purple in Advent and Lent, white/gold at Christmas
 * and Easter, red at Pentecost, and so on.
 *
 * This follows the common Western calendar (Catholic, Anglican, Lutheran,
 * Methodist and others using the Revised Common Lectionary). Orthodox churches
 * use a different calendar and colour customs. Moveable feasts that some
 * churches transfer to a nearby Sunday (e.g. Epiphany) are kept on their
 * traditional dates, so a day here or there may differ from your parish.
 *
 * Written as plain JavaScript (not TypeScript) because the very same code is
 * also inlined into each page's <head>, so the right colour is used before the
 * page is drawn.
 */

/** @typedef {'green' | 'purple' | 'rose' | 'red' | 'white'} VestmentColour */
/** @typedef {{ colour: VestmentColour, season: string, day?: string }} LiturgicalDay */

/** Easter Sunday for a year (Gregorian calendar; the "anonymous" algorithm). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const same = (a, b) => a.getTime() === b.getTime();

/** First Sunday of Advent: the fourth Sunday before Christmas Day. */
export function adventSunday(year) {
  const christmas = new Date(year, 11, 25);
  const back = christmas.getDay() === 0 ? 7 : christmas.getDay();
  return addDays(christmas, -back - 21);
}

/** The Baptism of the Lord: the Sunday after 6 January (ends Christmastide). */
function baptismOfTheLord(year) {
  const epiphany = new Date(year, 0, 6);
  return addDays(epiphany, 7 - epiphany.getDay());
}

/**
 * Fixed-date feasts that change the colour on their own day
 * (when they don't fall in Holy Week or the Easter Triduum).
 * [month (1-12), day, colour, name]
 */
const FIXED_FEASTS = [
  [1, 6, 'white', 'Epiphany'],
  [2, 2, 'white', 'The Presentation of the Lord'],
  [3, 25, 'white', 'The Annunciation'],
  [6, 24, 'white', 'The Birth of John the Baptist'],
  [6, 29, 'red', 'Saints Peter and Paul'],
  [8, 6, 'white', 'The Transfiguration'],
  [9, 14, 'red', 'Holy Cross Day'],
  [11, 1, 'white', 'All Saints'],
];

/**
 * @param {Date} [date] defaults to today (in the visitor's own time zone)
 * @returns {LiturgicalDay}
 */
export function liturgicalDay(date = new Date()) {
  const d = midnight(date);
  const y = d.getFullYear();
  const easter = easterSunday(y);
  const ashWednesday = addDays(easter, -46);
  const palmSunday = addDays(easter, -7);
  const pentecost = addDays(easter, 49);
  const advent = adventSunday(y);
  const christmas = new Date(y, 11, 25);

  // Holy Week and the Triduum come first: they override any fixed feast.
  if (same(d, palmSunday)) return { colour: 'red', season: 'Holy Week', day: 'Palm Sunday' };
  if (same(d, addDays(easter, -3))) return { colour: 'white', season: 'Holy Week', day: 'Maundy Thursday' };
  if (same(d, addDays(easter, -2))) return { colour: 'red', season: 'Holy Week', day: 'Good Friday' };
  if (same(d, addDays(easter, -1))) return { colour: 'purple', season: 'Holy Week', day: 'Holy Saturday' };
  if (d > palmSunday && d < easter) return { colour: 'purple', season: 'Holy Week' };

  // Single days.
  if (same(d, easter)) return { colour: 'white', season: 'Easter', day: 'Easter Sunday' };
  if (same(d, pentecost)) return { colour: 'red', season: 'Pentecost', day: 'Pentecost' };
  if (same(d, addDays(pentecost, 7))) return { colour: 'white', season: 'Ordinary Time', day: 'Trinity Sunday' };
  if (same(d, addDays(advent, -7))) return { colour: 'white', season: 'Ordinary Time', day: 'Christ the King' };
  if (same(d, addDays(advent, 14))) return { colour: 'rose', season: 'Advent', day: 'Gaudete Sunday' };
  if (same(d, addDays(easter, -21))) return { colour: 'rose', season: 'Lent', day: 'Laetare Sunday' };
  if (same(d, ashWednesday)) return { colour: 'purple', season: 'Lent', day: 'Ash Wednesday' };
  for (const [m, day, colour, name] of FIXED_FEASTS) {
    if (d.getMonth() === m - 1 && d.getDate() === day) {
      const season = seasonOf(d, { easter, ashWednesday, pentecost, advent, christmas, y });
      return { colour, season: season.season, day: name };
    }
  }
  return seasonOf(d, { easter, ashWednesday, pentecost, advent, christmas, y });
}

function seasonOf(d, { easter, ashWednesday, pentecost, advent, christmas, y }) {
  if (d >= christmas || d <= baptismOfTheLord(y)) return { colour: 'white', season: 'Christmas' };
  if (d >= advent) return { colour: 'purple', season: 'Advent' };
  if (d >= ashWednesday && d < easter) return { colour: 'purple', season: 'Lent' };
  if (d > easter && d < pentecost) return { colour: 'white', season: 'Easter' };
  return { colour: 'green', season: 'Ordinary Time' };
}

/** What each colour means, for the "today's colour" explanation. */
export const COLOUR_MEANINGS = {
  green: 'Green, for growth and everyday faith in Ordinary Time.',
  purple: 'Purple, for waiting, preparation and repentance.',
  rose: 'Rose, for joy breaking through halfway through Advent or Lent.',
  red: 'Red, for the fire of the Holy Spirit and the blood of martyrs.',
  white: 'White and gold, for celebration: Christmas, Easter and great feasts.',
};

/** Puts the colour on the page. Used by the inline <head> script. */
export function applyLiturgicalColour(root = document.documentElement, date = new Date()) {
  const today = liturgicalDay(date);
  root.dataset.vestment = today.colour;
  return today;
}

/**
 * The list of books the site knows about, in reading order.
 *
 * This is the single "source of truth" for book ids, names, testament and
 * genre. The build script combines it with verse counts taken from the
 * downloaded text to produce src/data/books.json.
 *
 * Adding the Deuterocanon later: add entries with `canon: 'deuterocanon'`
 * (USFM codes TOB, JDT, ESG, WIS, SIR, BAR, 1MA, 2MA, etc.) and a source that
 * contains them (e.g. eBible's "eng-web" or "eng-kjv2006" with Apocrypha).
 * Nothing else in the pipeline assumes exactly 66 books except the tests.
 */

export type Testament = 'old' | 'new';
export type Canon = 'protestant' | 'deuterocanon';
export type Genre = 'law' | 'history' | 'wisdom' | 'prophets' | 'gospels' | 'acts' | 'letters' | 'apocalyptic';

export interface CanonBook {
  /** USFM book code used by the source files, e.g. "JHN". */
  usfm: string;
  /** URL-friendly id used everywhere in the site, e.g. "john". */
  id: string;
  name: string;
  /** Short abbreviation for compact UI and reference search. */
  abbr: string;
  /** Extra spellings people type into search, e.g. "jn", "song of solomon". */
  aliases: string[];
  testament: Testament;
  canon: Canon;
  genre: Genre;
}

const b = (
  usfm: string,
  id: string,
  name: string,
  abbr: string,
  testament: Testament,
  genre: Genre,
  aliases: string[] = [],
): CanonBook => ({ usfm, id, name, abbr, aliases, testament, canon: 'protestant', genre });

export const CANON: CanonBook[] = [
  // Old Testament
  b('GEN', 'genesis', 'Genesis', 'Gen', 'old', 'law', ['gn', 'ge']),
  b('EXO', 'exodus', 'Exodus', 'Exod', 'old', 'law', ['ex', 'exo']),
  b('LEV', 'leviticus', 'Leviticus', 'Lev', 'old', 'law', ['lv', 'le']),
  b('NUM', 'numbers', 'Numbers', 'Num', 'old', 'law', ['nm', 'nu']),
  b('DEU', 'deuteronomy', 'Deuteronomy', 'Deut', 'old', 'law', ['dt', 'deu']),
  b('JOS', 'joshua', 'Joshua', 'Josh', 'old', 'history', ['jos', 'jsh']),
  b('JDG', 'judges', 'Judges', 'Judg', 'old', 'history', ['jdg', 'jg']),
  b('RUT', 'ruth', 'Ruth', 'Ruth', 'old', 'history', ['ru', 'rth']),
  b('1SA', '1-samuel', '1 Samuel', '1 Sam', 'old', 'history', ['1sa', '1sm', 'i samuel']),
  b('2SA', '2-samuel', '2 Samuel', '2 Sam', 'old', 'history', ['2sa', '2sm', 'ii samuel']),
  b('1KI', '1-kings', '1 Kings', '1 Kgs', 'old', 'history', ['1ki', '1kgs', 'i kings']),
  b('2KI', '2-kings', '2 Kings', '2 Kgs', 'old', 'history', ['2ki', '2kgs', 'ii kings']),
  b('1CH', '1-chronicles', '1 Chronicles', '1 Chr', 'old', 'history', ['1ch', '1chron']),
  b('2CH', '2-chronicles', '2 Chronicles', '2 Chr', 'old', 'history', ['2ch', '2chron']),
  b('EZR', 'ezra', 'Ezra', 'Ezra', 'old', 'history', ['ezr']),
  b('NEH', 'nehemiah', 'Nehemiah', 'Neh', 'old', 'history', ['ne']),
  b('EST', 'esther', 'Esther', 'Esth', 'old', 'history', ['est', 'es']),
  b('JOB', 'job', 'Job', 'Job', 'old', 'wisdom', ['jb']),
  b('PSA', 'psalms', 'Psalms', 'Ps', 'old', 'wisdom', ['psalm', 'psa', 'pss', 'psm']),
  b('PRO', 'proverbs', 'Proverbs', 'Prov', 'old', 'wisdom', ['pr', 'prv', 'pro']),
  b('ECC', 'ecclesiastes', 'Ecclesiastes', 'Eccl', 'old', 'wisdom', ['ecc', 'qoh']),
  b('SNG', 'song-of-songs', 'Song of Songs', 'Song', 'old', 'wisdom', ['song of solomon', 'sos', 'canticles', 'sng']),
  b('ISA', 'isaiah', 'Isaiah', 'Isa', 'old', 'prophets', ['is']),
  b('JER', 'jeremiah', 'Jeremiah', 'Jer', 'old', 'prophets', ['je', 'jr']),
  b('LAM', 'lamentations', 'Lamentations', 'Lam', 'old', 'prophets', ['la']),
  b('EZK', 'ezekiel', 'Ezekiel', 'Ezek', 'old', 'prophets', ['eze', 'ezk']),
  b('DAN', 'daniel', 'Daniel', 'Dan', 'old', 'prophets', ['da', 'dn']),
  b('HOS', 'hosea', 'Hosea', 'Hos', 'old', 'prophets', ['ho']),
  b('JOL', 'joel', 'Joel', 'Joel', 'old', 'prophets', ['jl']),
  b('AMO', 'amos', 'Amos', 'Amos', 'old', 'prophets', ['am']),
  b('OBA', 'obadiah', 'Obadiah', 'Obad', 'old', 'prophets', ['ob', 'oba']),
  b('JON', 'jonah', 'Jonah', 'Jonah', 'old', 'prophets', ['jnh', 'jon']),
  b('MIC', 'micah', 'Micah', 'Mic', 'old', 'prophets', ['mi']),
  b('NAM', 'nahum', 'Nahum', 'Nah', 'old', 'prophets', ['na']),
  b('HAB', 'habakkuk', 'Habakkuk', 'Hab', 'old', 'prophets', ['hb']),
  b('ZEP', 'zephaniah', 'Zephaniah', 'Zeph', 'old', 'prophets', ['zep', 'zp']),
  b('HAG', 'haggai', 'Haggai', 'Hag', 'old', 'prophets', ['hg']),
  b('ZEC', 'zechariah', 'Zechariah', 'Zech', 'old', 'prophets', ['zec', 'zc']),
  b('MAL', 'malachi', 'Malachi', 'Mal', 'old', 'prophets', ['ml']),
  // New Testament
  b('MAT', 'matthew', 'Matthew', 'Matt', 'new', 'gospels', ['mt', 'mat']),
  b('MRK', 'mark', 'Mark', 'Mark', 'new', 'gospels', ['mk', 'mrk', 'mr']),
  b('LUK', 'luke', 'Luke', 'Luke', 'new', 'gospels', ['lk', 'luk']),
  b('JHN', 'john', 'John', 'John', 'new', 'gospels', ['jn', 'jhn', 'joh']),
  b('ACT', 'acts', 'Acts', 'Acts', 'new', 'acts', ['ac', 'act', 'acts of the apostles']),
  b('ROM', 'romans', 'Romans', 'Rom', 'new', 'letters', ['ro', 'rm']),
  b('1CO', '1-corinthians', '1 Corinthians', '1 Cor', 'new', 'letters', ['1co', 'i corinthians']),
  b('2CO', '2-corinthians', '2 Corinthians', '2 Cor', 'new', 'letters', ['2co', 'ii corinthians']),
  b('GAL', 'galatians', 'Galatians', 'Gal', 'new', 'letters', ['ga']),
  b('EPH', 'ephesians', 'Ephesians', 'Eph', 'new', 'letters', ['ephes']),
  b('PHP', 'philippians', 'Philippians', 'Phil', 'new', 'letters', ['php', 'pp']),
  b('COL', 'colossians', 'Colossians', 'Col', 'new', 'letters', ['co']),
  b('1TH', '1-thessalonians', '1 Thessalonians', '1 Thess', 'new', 'letters', ['1th', '1thes']),
  b('2TH', '2-thessalonians', '2 Thessalonians', '2 Thess', 'new', 'letters', ['2th', '2thes']),
  b('1TI', '1-timothy', '1 Timothy', '1 Tim', 'new', 'letters', ['1ti', '1tm']),
  b('2TI', '2-timothy', '2 Timothy', '2 Tim', 'new', 'letters', ['2ti', '2tm']),
  b('TIT', 'titus', 'Titus', 'Titus', 'new', 'letters', ['tit', 'ti']),
  b('PHM', 'philemon', 'Philemon', 'Phlm', 'new', 'letters', ['phm', 'philem']),
  b('HEB', 'hebrews', 'Hebrews', 'Heb', 'new', 'letters', ['he']),
  b('JAS', 'james', 'James', 'Jas', 'new', 'letters', ['jm', 'jam']),
  b('1PE', '1-peter', '1 Peter', '1 Pet', 'new', 'letters', ['1pe', '1pt', 'i peter']),
  b('2PE', '2-peter', '2 Peter', '2 Pet', 'new', 'letters', ['2pe', '2pt', 'ii peter']),
  b('1JN', '1-john', '1 John', '1 John', 'new', 'letters', ['1jn', '1jo', 'i john']),
  b('2JN', '2-john', '2 John', '2 John', 'new', 'letters', ['2jn', '2jo', 'ii john']),
  b('3JN', '3-john', '3 John', '3 John', 'new', 'letters', ['3jn', '3jo', 'iii john']),
  b('JUD', 'jude', 'Jude', 'Jude', 'new', 'letters', ['jud', 'jd']),
  b('REV', 'revelation', 'Revelation', 'Rev', 'new', 'apocalyptic', ['re', 'rv', 'revelations', 'apocalypse']),
];

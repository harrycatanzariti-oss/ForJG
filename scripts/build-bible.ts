/**
 * Step 2 of the Bible data pipeline: convert USFM into clean JSON.
 *
 *   npm run bible:build
 *
 * Reads the files downloaded by `npm run bible:fetch` and writes:
 *   src/data/bible/{translation}/{book}/{chapter}.json  one file per chapter
 *   src/data/bible/translations.json                    translation details
 *   src/data/books.json                                 metadata for all books
 *
 * The output is committed to git so the website builds without the network.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANON, type CanonBook } from './bible/canon.ts';
import { CACHE_DIR, SOURCES } from './bible/sources.ts';
import { parseUsfm, type ParsedChapter } from './bible/usfm.ts';

const OUT_DIR = 'src/data/bible';
const BOOKS_FILE = 'src/data/books.json';

/**
 * Tiny corrections for typos in the source files. Each one is documented so
 * anyone can check it against the original. Keep this list short.
 */
const ERRATA: {
  translation: string;
  book: string;
  chapter: number;
  field: 'superscription';
  find: string;
  replace: string;
  why: string;
}[] = [
  {
    translation: 'bsb',
    book: 'psalms',
    chapter: 3,
    field: 'superscription',
    find: 'A Psalms of David',
    replace: 'A Psalm of David',
    why: 'Typo in the eBible.org BSB USFM file; the printed BSB reads "A Psalm of David".',
  },
];

const byUsfm = new Map<string, CanonBook>(CANON.map((b) => [b.usfm, b]));

if (!existsSync(CACHE_DIR)) {
  console.error(`No downloaded sources found in ${CACHE_DIR}. Run "npm run bible:fetch" first.`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(CACHE_DIR, 'manifest.json'), 'utf8')) as Record<
  string,
  { url: string; sha256: string; downloaded: string }
>;

/** verseCounts[translation][bookId] = number of verses in each chapter */
const verseCounts: Record<string, Record<string, number[]>> = {};

for (const source of SOURCES) {
  const dir = join(CACHE_DIR, source.id);
  const outRoot = join(OUT_DIR, source.id);
  rmSync(outRoot, { recursive: true, force: true });
  verseCounts[source.id] = {};
  const seen = new Set<string>();

  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.usfm')) continue;
    const parsed = parseUsfm(readFileSync(join(dir, file), 'utf8'));
    const book = byUsfm.get(parsed.usfm);
    if (!book) continue; // Front matter, glossary or books outside our canon.
    seen.add(book.id);

    const bookDir = join(outRoot, book.id);
    mkdirSync(bookDir, { recursive: true });
    verseCounts[source.id]![book.id] = [];

    parsed.chapters.forEach((ch: ParsedChapter, i) => {
      if (ch.chapter !== i + 1) {
        throw new Error(`${source.label} ${book.name}: expected chapter ${i + 1}, found ${ch.chapter}`);
      }
      for (const e of ERRATA) {
        if (e.translation === source.id && e.book === book.id && e.chapter === ch.chapter) {
          const before = ch[e.field];
          if (!before?.includes(e.find)) {
            throw new Error(`Erratum no longer applies (fixed upstream?): ${JSON.stringify(e)}`);
          }
          ch[e.field] = before.replace(e.find, e.replace);
        }
      }
      // Some translations keep a verse number with no text (only a footnote)
      // where a verse is missing from the oldest manuscripts, e.g. WEB Luke
      // 17:36. We drop those and list them in "omitted" so the reader can
      // explain the gap instead of showing an empty verse.
      const omitted = ch.verses.filter((v) => !v.text).map((v) => v.v);
      ch.verses = ch.verses.filter((v) => v.text);
      const lastVerse = ch.verses.at(-1)?.v ?? 0;
      for (let n = 1; n <= lastVerse; n++) {
        if (!ch.verses.some((v) => v.v === n) && !omitted.includes(n)) omitted.push(n);
      }
      omitted.sort((a, b) => a - b);
      const out = {
        translation: source.label,
        book: book.id,
        bookName: book.name,
        chapter: ch.chapter,
        ...(ch.superscription ? { superscription: ch.superscription } : {}),
        headings: ch.headings,
        verses: ch.verses,
        ...(omitted.length ? { omitted } : {}),
      };
      writeFileSync(join(bookDir, `${ch.chapter}.json`), JSON.stringify(out) + '\n');
      verseCounts[source.id]![book.id]!.push(Math.max(lastVerse, ...omitted, 0));
    });
  }

  const missing = CANON.filter((b) => !seen.has(b.id)).map((b) => b.name);
  if (missing.length) throw new Error(`${source.label} is missing books: ${missing.join(', ')}`);
  console.log(`${source.label}: wrote ${CANON.length} books`);
}

// books.json uses the KJV's verse numbering as the reference versification.
// Differences in other translations are checked by tests/bible-data.test.ts.
const books = CANON.map((b, order) => {
  const counts = verseCounts.kjv![b.id]!;
  return {
    id: b.id,
    order: order + 1,
    name: b.name,
    abbr: b.abbr,
    aliases: b.aliases,
    usfm: b.usfm,
    testament: b.testament,
    canon: b.canon,
    genre: b.genre,
    chapters: counts.length,
    verses: counts,
  };
});
writeFileSync(BOOKS_FILE, JSON.stringify(books, null, 2) + '\n');

writeFileSync(
  join(OUT_DIR, 'translations.json'),
  JSON.stringify(
    SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      name: s.name,
      licence: s.licence,
      sourceUrl: s.url,
      sha256: manifest[s.id]?.sha256 ?? null,
      downloaded: manifest[s.id]?.downloaded ?? null,
    })),
    null,
    2,
  ) + '\n',
);

const total = books.reduce((n, b) => n + b.chapters, 0);
console.log(`books.json: ${books.length} books, ${total} chapters`);

/**
 * Understands Bible references typed by people: "John 3:16", "jn 3 16",
 * "Rom 8", "1 Cor 13:4-7", "Psalm 23", "song of solomon 2".
 */

export interface RefBook {
  id: string;
  name: string;
  abbr: string;
  aliases: string[];
  chapters: number;
  verses: number[];
}

export interface Reference {
  book: string;
  bookName: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/\bfirst\b/g, '1')
    .replace(/\bsecond\b/g, '2')
    .replace(/\bthird\b/g, '3')
    .replace(/^iii\s/, '3 ')
    .replace(/^ii\s/, '2 ')
    .replace(/^i\s/, '1 ')
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const compact = (s: string) => normalise(s).replace(/\s/g, '');

/** Builds a lookup from every spelling of every book to its id. */
export function buildBookIndex(books: RefBook[]): Map<string, RefBook> {
  const index = new Map<string, RefBook>();
  for (const b of books) {
    for (const name of [b.id.replace(/-/g, ' '), b.name, b.abbr, ...b.aliases]) index.set(compact(name), b);
  }
  return index;
}

export function parseReference(input: string, books: RefBook[], index = buildBookIndex(books)): Reference | null {
  const text = normalise(input).replace(/[–—]/g, '-');
  // book name, then chapter, then optional verse (":" "." or space) and range.
  const m = /^(\d?\s?[a-z][a-z ]*?)\s*(\d+)(?:\s*[:\s]\s*(\d+)(?:\s*-\s*(\d+))?)?$/.exec(text);
  let book: RefBook | undefined;
  if (m) book = index.get(compact(m[1]!));
  if (!m || !book) {
    // Just a book name: go to chapter 1.
    const only = index.get(compact(text));
    if (only) return { book: only.id, bookName: only.name, chapter: 1 };
    // Allow unambiguous prefixes like "genes" or "philem".
    if (text.length >= 3 && m) {
      const prefix = compact(m[1]!);
      const matches = books.filter((b) => compact(b.name).startsWith(prefix));
      if (matches.length === 1) book = matches[0];
    }
    if (!book) return null;
  }
  const chapter = Number(m![2]);
  if (chapter < 1 || chapter > book.chapters) return null;
  const maxVerse = book.verses[chapter - 1]!;
  const verse = m![3] ? Number(m![3]) : undefined;
  if (verse !== undefined && (verse < 1 || verse > maxVerse)) return null;
  let verseEnd = m![4] ? Number(m![4]) : undefined;
  if (verseEnd !== undefined && verse !== undefined) verseEnd = Math.min(Math.max(verseEnd, verse), maxVerse);
  return { book: book.id, bookName: book.name, chapter, verse, verseEnd };
}

export function formatReference(r: Reference): string {
  const name = r.book === 'psalms' && r.verse === undefined ? 'Psalm' : r.bookName;
  let s = `${name} ${r.chapter}`;
  if (r.verse) s += `:${r.verse}`;
  if (r.verseEnd && r.verseEnd !== r.verse) s += `–${r.verseEnd}`;
  return s;
}

export function referenceUrl(r: Reference): string {
  return `/bible/${r.book}/${r.chapter}${r.verse ? `#v${r.verse}` : ''}`;
}

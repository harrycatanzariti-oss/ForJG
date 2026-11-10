/**
 * Checks the processed Bible data in src/data/ is complete and consistent.
 * These run against the committed JSON, so they need no network.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { booksSchema, chapterSchema, TRANSLATION_IDS } from '../src/lib/schemas.ts';
import { VERSIFICATION_ALLOW_LIST } from '../src/lib/versification.ts';

const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));

describe('books.json', () => {
  it('has the 66 books of the Protestant canon', () => {
    expect(books).toHaveLength(66);
    expect(books.filter((b) => b.testament === 'old')).toHaveLength(39);
    expect(books.filter((b) => b.testament === 'new')).toHaveLength(27);
  });

  it('has 1,189 chapters', () => {
    expect(books.reduce((n, b) => n + b.chapters, 0)).toBe(1189);
  });

  it('has a verse count for every chapter', () => {
    for (const b of books) expect(b.verses).toHaveLength(b.chapters);
  });

  it('has the expected total of 31,102 verses (KJV numbering)', () => {
    expect(books.reduce((n, b) => n + b.verses.reduce((a, c) => a + c, 0), 0)).toBe(31102);
  });

  it('uses unique ids', () => {
    expect(new Set(books.map((b) => b.id)).size).toBe(66);
  });
});

describe.each(TRANSLATION_IDS)('%s chapters', (t) => {
  it('exist for every chapter, are valid, and match the reference verse numbering', () => {
    const problems: string[] = [];
    for (const book of books) {
      for (let c = 1; c <= book.chapters; c++) {
        const data = chapterSchema.parse(
          JSON.parse(readFileSync(`src/data/bible/${t}/${book.id}/${c}.json`, 'utf8')),
        );
        expect(data.book).toBe(book.id);
        expect(data.chapter).toBe(c);
        const numbers = data.verses.map((v) => v.v);
        // Verses must be in order with no duplicates.
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
        expect(new Set(numbers).size).toBe(numbers.length);

        const ref = `${book.id} ${c}`;
        const allowed = VERSIFICATION_ALLOW_LIST.find((a) => a.translation === t && a.ref === ref);
        const last = Math.max(...numbers, ...(data.omitted ?? []));
        const expectedLast = allowed?.lastVerse ?? book.verses[c - 1];
        if (last !== expectedLast) problems.push(`${ref}: last verse ${last}, expected ${expectedLast}`);
        const omitted = data.omitted ?? [];
        const expectedOmitted = allowed?.omitted ?? [];
        if (JSON.stringify(omitted) !== JSON.stringify(expectedOmitted)) {
          problems.push(`${ref}: omitted ${JSON.stringify(omitted)}, expected ${JSON.stringify(expectedOmitted)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

it('every allow-list entry is still needed', () => {
  for (const a of VERSIFICATION_ALLOW_LIST) {
    const [bookId, chapter] = a.ref.split(' ');
    const data = chapterSchema.parse(
      JSON.parse(readFileSync(`src/data/bible/${a.translation}/${bookId}/${chapter}.json`, 'utf8')),
    );
    const book = books.find((b) => b.id === bookId)!;
    const last = Math.max(...data.verses.map((v) => v.v), ...(data.omitted ?? []));
    const differs = last !== book.verses[Number(chapter) - 1] || (data.omitted ?? []).length > 0;
    expect(differs, `${a.translation} ${a.ref} matches KJV now; remove it from the allow-list`).toBe(true);
  }
});

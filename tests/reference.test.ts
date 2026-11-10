import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatReference, parseReference } from '../src/lib/reference.ts';
import { booksSchema } from '../src/lib/schemas.ts';

const books = booksSchema.parse(JSON.parse(readFileSync('src/data/books.json', 'utf8')));
const parse = (s: string) => parseReference(s, books);

describe('parseReference', () => {
  it.each([
    ['John 3:16', { book: 'john', chapter: 3, verse: 16 }],
    ['jn 3 16', { book: 'john', chapter: 3, verse: 16 }],
    ['Rom 8', { book: 'romans', chapter: 8 }],
    ['1 Cor 13:4-7', { book: '1-corinthians', chapter: 13, verse: 4, verseEnd: 7 }],
    ['1cor 13', { book: '1-corinthians', chapter: 13 }],
    ['First John 4:8', { book: '1-john', chapter: 4, verse: 8 }],
    ['Psalm 23', { book: 'psalms', chapter: 23 }],
    ['ps 119:105', { book: 'psalms', chapter: 119, verse: 105 }],
    ['Song of Solomon 2', { book: 'song-of-songs', chapter: 2 }],
    ['Gen. 1:1', { book: 'genesis', chapter: 1, verse: 1 }],
    ['philem 1', { book: 'philemon', chapter: 1 }],
    ['Revelation', { book: 'revelation', chapter: 1 }],
  ])('%s', (input, expected) => {
    expect(parse(input)).toMatchObject(expected);
  });

  it('rejects references that do not exist', () => {
    expect(parse('John 22')).toBeNull();
    expect(parse('John 3:99')).toBeNull();
    expect(parse('love one another')).toBeNull();
    expect(parse('')).toBeNull();
  });

  it('formats references nicely', () => {
    expect(formatReference(parse('ps 23')!)).toBe('Psalm 23');
    expect(formatReference(parse('1 cor 13:4-7')!)).toBe('1 Corinthians 13:4–7');
  });
});

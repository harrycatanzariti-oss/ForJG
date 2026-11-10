import { describe, expect, it } from 'vitest';
import { parseUsfm, stripInline, tidy } from '../scripts/bible/usfm.ts';

describe('stripInline', () => {
  it('removes Strong’s tags but keeps the words', () => {
    expect(tidy(stripInline('\\w In|strong="G1722"\\w* \\w the|strong="G1722"\\w* beginning'))).toBe(
      'In the beginning',
    );
  });

  it('removes footnotes and cross references', () => {
    const raw = 'loved the world\\f + \\fr 3:16 \\ft Or so much\\f*, that \\x - \\xo 3:16 \\xt Rom 5:8\\x*he gave';
    expect(tidy(stripInline(raw))).toBe('loved the world, that he gave');
  });

  it('keeps KJV italic additions and divine name text, and drops pilcrows', () => {
    const raw = '¶ \\add was\\add* the \\nd \\+w LORD|strong="H3068"\\+w*\\nd* God';
    expect(tidy(stripInline(raw))).toBe('was the LORD God');
  });
});

describe('parseUsfm', () => {
  const sample = [
    '\\id PSA test',
    '\\h Psalms',
    '\\mt1 Psalms',
    '\\c 1',
    '\\ms1 BOOK I',
    '\\s1 The Way of the Righteous',
    '\\q1',
    '\\v 1 Blessed is the man',
    '\\q2 who does not walk',
    '\\b',
    '\\q1',
    '\\v 2 But his delight',
    '\\c 2',
    '\\d A Psalm of David.',
    '\\p',
    '\\v 1 Why do the nations rage?',
    '\\v 2 \\f + \\fr 2:2 \\ft Some manuscripts add text.\\f*',
    '\\p',
    '\\v 3 Let us break their chains.',
  ].join('\n');
  const book = parseUsfm(sample);

  it('reads the book code and chapters', () => {
    expect(book.usfm).toBe('PSA');
    expect(book.chapters.map((c) => c.chapter)).toEqual([1, 2]);
  });

  it('keeps headings with the verse they come before', () => {
    expect(book.chapters[0]!.headings).toEqual([
      { beforeVerse: 1, text: 'BOOK I' },
      { beforeVerse: 1, text: 'The Way of the Righteous' },
    ]);
  });

  it('joins poetry lines into one verse and marks stanzas', () => {
    expect(book.chapters[0]!.verses).toEqual([
      { v: 1, text: 'Blessed is the man who does not walk', poetry: true, para: true },
      { v: 2, text: 'But his delight', poetry: true, para: true },
    ]);
  });

  it('stores Psalm titles separately', () => {
    expect(book.chapters[1]!.superscription).toBe('A Psalm of David.');
  });

  it('leaves footnote-only verses empty so the build can mark them omitted', () => {
    expect(book.chapters[1]!.verses.map((v) => [v.v, v.text])).toEqual([
      [1, 'Why do the nations rage?'],
      [2, ''],
      [3, 'Let us break their chains.'],
    ]);
  });
});

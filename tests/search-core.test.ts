import { describe, expect, it } from 'vitest';
import { decodeVerse, encodeVerse, fromDeltas, tokenize, toDeltas } from '../src/lib/search-core.ts';

describe('search core', () => {
  it('tokenizes text the same way for index and query', () => {
    expect(tokenize('“The LORD is my shepherd; God’s word!”')).toEqual([
      'the',
      'lord',
      'is',
      'my',
      'shepherd',
      'god',
      'word',
    ]);
  });
  it('round-trips verse codes and deltas', () => {
    const code = encodeVerse(43, 3, 16);
    expect(decodeVerse(code)).toEqual({ order: 43, chapter: 3, verse: 16 });
    const list = [5, 9, 1000, 1001, 2_003_004];
    expect(fromDeltas(toDeltas(list))).toEqual(list);
  });
});

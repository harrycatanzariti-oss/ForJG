/**
 * Shared by the build (to create the search index) and the browser (to query it).
 *
 * The index is "inverted": for each word it lists the verses that contain it.
 * It is split into small files ("shards") by the word's first two letters, so a
 * search for "shepherd" only downloads the "sh" shard, not the whole Bible.
 */

/** Very common words are not indexed; they would make the index huge. */
export const STOPWORDS = new Set(
  'a an and are as at be but by for from had has have he her him his i in is it its me my no not of on or our she so that the their them then there they this to was we were what when which who will with you your'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']s\b/g, '')
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export const shardOf = (word: string) => (word.length < 2 ? word : word.slice(0, 2));

/** Encodes a verse as one number: book order, chapter and verse. */
export const encodeVerse = (bookOrder: number, chapter: number, verse: number) =>
  bookOrder * 1_000_000 + chapter * 1000 + verse;

export const decodeVerse = (code: number) => ({
  order: Math.floor(code / 1_000_000),
  chapter: Math.floor((code % 1_000_000) / 1000),
  verse: code % 1000,
});

/** Sorted numbers stored as gaps between them, which compress far better. */
export const toDeltas = (sorted: number[]) => sorted.map((n, i) => (i === 0 ? n : n - sorted[i - 1]!));
export const fromDeltas = (deltas: number[]) => {
  const out: number[] = [];
  let acc = 0;
  for (const d of deltas) out.push((acc += d));
  return out;
};

/** Shard file contents: word -> delta-encoded verse codes. */
export type Shard = Record<string, number[]>;

/**
 * Runs a word/phrase search in the browser using the sharded index built
 * by src/pages/data/search/[shard].json.ts.
 */
import { loadChapter } from './bible-client';
import { decodeVerse, fromDeltas, shardOf, STOPWORDS, tokenize, type Shard } from './search-core';
import { url } from './url';

const shardCache = new Map<string, Promise<Shard>>();

function loadShard(key: string): Promise<Shard> {
  let p = shardCache.get(key);
  if (!p) {
    p = fetch(url(`/data/search/${key}.json`)).then((r) => (r.ok ? (r.json() as Promise<Shard>) : {}));
    p.catch(() => shardCache.delete(key));
    shardCache.set(key, p);
  }
  return p;
}

export interface SearchBook {
  id: string;
  name: string;
  order: number;
}

export interface VerseHit {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  text?: string;
  phrase: boolean;
}

export interface SearchResult {
  total: number;
  hits: VerseHit[];
  /** Words that were ignored because they are too common. */
  ignored: string[];
}

const normaliseForPhrase = (s: string) => tokenize(s).join(' ');

export async function searchVerses(query: string, books: SearchBook[], limit = 40): Promise<SearchResult> {
  const all = tokenize(query);
  const words = all.filter((w) => !STOPWORDS.has(w));
  const ignored = all.filter((w) => STOPWORDS.has(w));
  if (words.length === 0) return { total: 0, hits: [], ignored };

  const typingLast = !/\s$/.test(query) && !query.trim().endsWith('"');
  const sets: Set<number>[] = [];
  for (const [i, word] of words.entries()) {
    const shard = await loadShard(shardOf(word));
    const set = new Set<number>(fromDeltas(shard[word] ?? []));
    // Let the last word match as a prefix while typing ("shep" → shepherd).
    if (i === words.length - 1 && typingLast && word.length >= 3) {
      for (const [w, deltas] of Object.entries(shard)) {
        if (w !== word && w.startsWith(word)) for (const c of fromDeltas(deltas)) set.add(c);
      }
    }
    sets.push(set);
  }
  sets.sort((a, b) => a.size - b.size);
  let codes = [...sets[0]!].filter((c) => sets.every((s) => s.has(c)));
  codes.sort((a, b) => a - b);
  const total = codes.length;

  const byOrder = new Map(books.map((b) => [b.order, b]));
  const phrase = normaliseForPhrase(query.replace(/"/g, ''));
  const wantPhrase = all.length > 1;
  // Fetch text for the first matches; when looking for a phrase, check more so exact phrases rise to the top.
  codes = codes.slice(0, wantPhrase ? Math.max(limit, 120) : limit);
  const hits: VerseHit[] = [];
  for (const code of codes) {
    const { order, chapter, verse } = decodeVerse(code);
    const book = byOrder.get(order);
    if (!book) continue;
    let text: string | undefined;
    try {
      text = (await loadChapter('bsb', book.id, chapter)).verses.find((v) => v.v === verse)?.text;
    } catch {
      text = undefined;
    }
    const isPhrase = !!text && wantPhrase && ` ${normaliseForPhrase(text)} `.includes(` ${phrase}`);
    hits.push({ book: book.id, bookName: book.name, chapter, verse, text, phrase: isPhrase });
  }
  if (wantPhrase) hits.sort((a, b) => Number(b.phrase) - Number(a.phrase));
  return { total, hits: hits.slice(0, limit), ignored };
}

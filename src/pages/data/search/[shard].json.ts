/**
 * Builds the search index from the BSB text at build time, one JSON file per
 * two-letter word prefix, e.g. /data/search/sh.json.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { books, getChapter } from '~/lib/bible';
import { encodeVerse, shardOf, STOPWORDS, tokenize, toDeltas, type Shard } from '~/lib/search-core';

function buildShards(): Map<string, Shard> {
  const postings = new Map<string, Set<number>>();
  for (const book of books) {
    for (let c = 1; c <= book.chapters; c++) {
      for (const v of getChapter('bsb', book.id, c).verses) {
        const code = encodeVerse(book.order, c, v.v);
        for (const word of tokenize(v.text)) {
          if (STOPWORDS.has(word)) continue;
          let set = postings.get(word);
          if (!set) postings.set(word, (set = new Set()));
          set.add(code);
        }
      }
    }
  }
  const shards = new Map<string, Shard>();
  for (const [word, set] of [...postings].sort(([a], [b]) => a.localeCompare(b))) {
    const key = shardOf(word);
    let shard = shards.get(key);
    if (!shard) shards.set(key, (shard = {}));
    shard[word] = toDeltas([...set].sort((a, b) => a - b));
  }
  return shards;
}

let cache: Map<string, Shard> | undefined;
const shards = () => (cache ??= buildShards());

export const getStaticPaths = (() =>
  [...shards().keys()].map((shard) => ({ params: { shard } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(JSON.stringify(shards().get(params.shard!) ?? {}), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

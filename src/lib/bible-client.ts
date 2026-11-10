/**
 * Loads chapter text in the browser, one small JSON file at a time.
 * Results are kept in memory so switching slider levels is instant.
 */
import type { Chapter, TranslationId } from './schemas';
import { url } from './url';

const cache = new Map<string, Promise<Chapter>>();

export function chapterUrl(translation: TranslationId, book: string, chapter: number): string {
  return url(`/data/bible/${translation}/${book}/${chapter}.json`);
}

export function loadChapter(translation: TranslationId, book: string, chapter: number): Promise<Chapter> {
  const key = `${translation}/${book}/${chapter}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(chapterUrl(translation, book, chapter)).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${key} (${r.status})`);
      return r.json() as Promise<Chapter>;
    });
    // Forget failures so the next attempt retries instead of reusing the error.
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/** Seeds the cache with a chapter the page already contains. */
export function primeChapter(translation: TranslationId, chapter: Chapter): void {
  cache.set(`${translation}/${chapter.book}/${chapter.chapter}`, Promise.resolve(chapter));
}

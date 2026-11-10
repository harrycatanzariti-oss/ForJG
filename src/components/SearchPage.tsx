/**
 * /search: type a reference ("John 3:16", "Rom 8") to jump straight there,
 * or words and phrases to search the whole BSB text.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildBookIndex, formatReference, parseReference, referenceUrl, type RefBook } from '~/lib/reference';
import { searchVerses, type SearchResult } from '~/lib/search-client';
import { tokenize } from '~/lib/search-core';
import { url } from '~/lib/url';

type Book = RefBook & { order: number };

function Highlight({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const pattern = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\w*`, 'gi');
  const parts: (string | { m: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    parts.push(text.slice(last, m.index), { m: m[0] });
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts.map((p, i) => (typeof p === 'string' ? p : <mark key={i}>{p.m}</mark>))}</>;
}

export default function SearchPage({ books }: { books: Book[] }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const index = useMemo(() => buildBookIndex(books), [books]);
  const run = useRef(0);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setQuery(q);
  }, []);

  const reference = query.trim() ? parseReference(query, books, index) : null;

  useEffect(() => {
    const q = query.trim();
    const id = ++run.current;
    if (q.length < 2) {
      setResult(null);
      return;
    }
    const t = window.setTimeout(async () => {
      setBusy(true);
      setFailed(false);
      try {
        const r = await searchVerses(query, books);
        if (id === run.current) setResult(r);
      } catch {
        if (id === run.current) setFailed(true);
      } finally {
        if (id === run.current) setBusy(false);
      }
      const params = new URLSearchParams(window.location.search);
      params.set('q', q);
      history.replaceState(null, '', `${window.location.pathname}?${params}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [query]);

  const words = tokenize(query);

  return (
    <div>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label for="q" class="block font-medium">
          Search for a reference, word or phrase
        </label>
        <input
          id="q"
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder='e.g. John 3:16, Rom 8, "good shepherd"'
          class="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-lg text-ink"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        />
      </form>

      <div class="mt-6 min-h-[70vh] space-y-4" aria-live="polite">
        {reference && (
          <a
            href={url(referenceUrl(reference))}
            class="card flex items-center justify-between p-4 text-ink no-underline hover:border-accent"
          >
            <span>
              <span class="block text-sm text-ink-muted">Go to</span>
              <span class="text-xl font-semibold tracking-tight">{formatReference(reference)}</span>
            </span>
            <span aria-hidden="true" class="text-accent">
              →
            </span>
          </a>
        )}
        {busy && <p class="text-ink-muted">Searching…</p>}
        {failed && <p role="alert">Search could not load. Check your connection and try again.</p>}
        {result && !busy && (
          <>
            <p class="text-sm text-ink-muted">
              {result.total === 0
                ? reference
                  ? ''
                  : 'No verses found. Try fewer or different words.'
                : `${result.total.toLocaleString()} ${result.total === 1 ? 'verse' : 'verses'} in the Berean Standard Bible${result.total > result.hits.length ? `, showing the first ${result.hits.length}` : ''}.`}
              {result.ignored.length > 0 &&
                result.total > 0 &&
                ` Common words (${result.ignored.join(', ')}) were ignored.`}
            </p>
            <ol class="space-y-3">
              {result.hits.map((h) => (
                <li key={`${h.book}${h.chapter}:${h.verse}`}>
                  <a
                    href={url(`/bible/${h.book}/${h.chapter}#v${h.verse}`)}
                    class="block rounded-xl border border-line bg-surface p-4 text-ink no-underline hover:border-accent"
                  >
                    <span class="block text-sm font-semibold text-accent">
                      {h.book === 'psalms' ? 'Psalm' : h.bookName} {h.chapter}:{h.verse}
                      {h.phrase && <span class="ml-2 text-xs font-normal text-ink-muted">exact phrase</span>}
                    </span>
                    {h.text && (
                      <span class="scripture mt-1 block text-[1rem]">
                        <Highlight text={h.text} words={words} />
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

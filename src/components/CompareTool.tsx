/**
 * /traditions/compare?a=catholic&b=baptist&c=...
 * Pick 2 or 3 traditions and see them side by side on each belief topic.
 * Phones get one swipeable card per topic; wider screens get a table.
 */
import { useEffect, useState } from 'preact/hooks';
import { copyText } from '~/components/reader/VerseActions';
import { url } from '~/lib/url';

export interface CompareTradition {
  id: string;
  name: string;
  shortName: string;
  family: string;
  otherGroup: boolean;
  beliefs: Record<string, { summary: string; source: string }>;
}

interface Props {
  traditions: CompareTradition[];
  topics: { id: string; label: string }[];
}

const SLOTS = ['a', 'b', 'c'] as const;

export default function CompareTool({ traditions, topics }: Props) {
  const [picked, setPicked] = useState<string[]>(['catholic', 'baptist', '']);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const ids = new Set(traditions.map((t) => t.id));
    const fromUrl = SLOTS.map((s) => p.get(s) ?? '').map((v) => (ids.has(v) ? v : ''));
    if (fromUrl.some(Boolean)) setPicked([fromUrl[0] || 'catholic', fromUrl[1] || '', fromUrl[2] || '']);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    picked.forEach((id, i) => id && p.set(SLOTS[i]!, id));
    history.replaceState(null, '', `${window.location.pathname}?${p}`);
    setCopied(false);
  }, [picked, hydrated]);

  const selected = picked.map((id) => traditions.find((t) => t.id === id)).filter((t): t is CompareTradition => !!t);

  const select = (i: number) => (
    <label class="block" key={i}>
      <span class="block text-sm font-medium">{i === 2 ? 'Third (optional)' : i === 0 ? 'First' : 'Second'}</span>
      <select
        class="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink"
        value={picked[i]}
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          setPicked((p) => p.map((x, j) => (j === i ? v : x)));
        }}
      >
        {i > 0 && <option value="">{i === 2 ? 'None' : 'Choose…'}</option>}
        {traditions.map((t) => (
          <option key={t.id} value={t.id} disabled={picked.includes(t.id) && picked[i] !== t.id}>
            {t.shortName}
            {t.otherGroup ? ' (other group)' : ''}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div class="card grid gap-3 p-4 sm:grid-cols-3">{[0, 1, 2].map(select)}</div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="btn btn-secondary text-sm"
          onClick={async () => setCopied(await copyText(window.location.href))}
        >
          {copied ? 'Link copied' : 'Copy link to this comparison'}
        </button>
      </div>

      {selected.length < 2 ? (
        <p class="mt-6 text-ink-muted">Choose at least two traditions to compare.</p>
      ) : (
        <>
          {/* Phones: one card per topic, swipe sideways. */}
          <div class="md:hidden">
            <p class="mt-6 text-sm text-ink-muted">Swipe sideways to move between topics.</p>
            <ol
              class="mt-2 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4"
              aria-label="Topics"
              data-no-swipe
            >
              {topics.map((topic, n) => (
                <li key={topic.id} class="card w-[85vw] max-w-sm shrink-0 snap-center p-4">
                  <p class="text-xs text-ink-muted">
                    {n + 1} of {topics.length}
                  </p>
                  <h2 class="text-lg font-semibold">{topic.label}</h2>
                  <ul class="mt-3 space-y-3">
                    {selected.map((t) => (
                      <li key={t.id} class="border-l-4 pl-3" style={{ borderLeftColor: `var(--f-${t.family})` }}>
                        <a href={url(`/traditions/${t.id}#beliefs`)} class="text-sm font-semibold">
                          {t.shortName}
                        </a>
                        <p class="mt-0.5">{t.beliefs[topic.id]!.summary}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
          {/* Wider screens: a table, row by row. */}
          <div class="mt-6 hidden overflow-x-auto md:block">
            <table class="w-full border-separate border-spacing-0 text-left">
              <caption class="sr-only">Beliefs compared side by side</caption>
              <thead>
                <tr>
                  <th scope="col" class="below-header sticky w-48 bg-paper p-3 text-sm text-ink-muted">
                    Topic
                  </th>
                  {selected.map((t) => (
                    <th
                      key={t.id}
                      scope="col"
                      class="below-header sticky border-b-4 bg-paper p-3"
                      style={{ borderBottomColor: `var(--f-${t.family})` }}
                    >
                      <a href={url(`/traditions/${t.id}`)}>{t.shortName}</a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <th scope="row" class="border-t border-line p-3 align-top text-sm font-semibold">
                      {topic.label}
                    </th>
                    {selected.map((t) => (
                      <td key={t.id} class="border-t border-line p-3 align-top">
                        {t.beliefs[topic.id]!.summary}
                        <span class="mt-1 block text-xs text-ink-muted">{t.beliefs[topic.id]!.source}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

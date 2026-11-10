/**
 * The /bible grid: every book, colour-coded by type of writing, with a ring
 * that fills as you read its chapters.
 */
import { useEffect, useState } from 'preact/hooks';
import { getReadMap } from '~/lib/progress';
import { url } from '~/lib/url';

export interface GridBook {
  id: string;
  name: string;
  chapters: number;
  genre: string;
}
export interface GridGroup {
  heading: string;
  genre: string;
  books: GridBook[];
}

export function Ring({ fraction, colour, size = 36 }: { fraction: number; colour: string; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" class="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" stroke-width="4" />
      {fraction > 0 && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          stroke-width="4"
          stroke-linecap="round"
          stroke-dasharray={`${c * fraction} ${c}`}
        />
      )}
    </svg>
  );
}

export default function BookGrid({ testaments }: { testaments: { id: string; name: string; groups: GridGroup[] }[] }) {
  const [read, setRead] = useState<Record<string, number[]>>({});
  useEffect(() => setRead(getReadMap()), []);

  return (
    <div>
      {testaments.map((t) => (
        <section key={t.id} class="mt-8" aria-labelledby={`t-${t.id}`}>
          <h2 id={`t-${t.id}`} class="text-xl font-semibold">
            {t.name}
          </h2>
          {t.groups.map((g) => (
            <div key={g.genre} class="mt-4">
              <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-muted uppercase">
                <span class="size-3 rounded-full" style={{ background: `var(--g-${g.genre})` }} aria-hidden="true" />
                {g.heading}
              </h3>
              <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {g.books.map((b) => {
                  const done = read[b.id]?.length ?? 0;
                  const fraction = done / b.chapters;
                  return (
                    <li key={b.id}>
                      <a
                        href={url(`/bible/${b.id}`)}
                        class="flex min-h-14 items-center gap-3 rounded-xl border border-line border-l-4 bg-surface px-3 py-2 text-ink no-underline hover:bg-surface-2"
                        style={{ borderLeftColor: `var(--g-${b.genre})` }}
                      >
                        <Ring fraction={fraction} colour={`var(--g-${b.genre})`} />
                        <span class="min-w-0">
                          <span class="block truncate font-medium">{b.name}</span>
                          <span class="block text-xs text-ink-muted">
                            {done > 0
                              ? `${done} of ${b.chapters} read`
                              : `${b.chapters} ${b.chapters === 1 ? 'chapter' : 'chapters'}`}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

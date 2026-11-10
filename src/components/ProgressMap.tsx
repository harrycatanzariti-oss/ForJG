/**
 * /progress: every one of the 1,189 chapters as a small square, grouped by
 * book, filling in as you read. Plus totals and streaks.
 */
import { useEffect, useState } from 'preact/hooks';
import { getReadMap, getStreaks, type Streaks } from '~/lib/progress';
import { url } from '~/lib/url';

interface MapBook {
  id: string;
  name: string;
  chapters: number;
  genre: string;
  testament: string;
}

export default function ProgressMap({ books }: { books: MapBook[] }) {
  const [read, setRead] = useState<Record<string, number[]>>({});
  const [streaks, setStreaks] = useState<Streaks>({ current: 0, longest: 0 });
  useEffect(() => {
    setRead(getReadMap());
    setStreaks(getStreaks());
  }, []);

  const total = books.reduce((n, b) => n + b.chapters, 0);
  const done = books.reduce((n, b) => n + (read[b.id]?.filter((c) => c <= b.chapters).length ?? 0), 0);
  const percent = total ? (done / total) * 100 : 0;

  const stats = [
    { label: 'Chapters read', value: `${done.toLocaleString()}`, sub: `of ${total.toLocaleString()}` },
    { label: 'Of the Bible', value: `${percent < 1 && done > 0 ? percent.toFixed(1) : Math.round(percent)}%`, sub: '' },
    { label: 'Current streak', value: String(streaks.current), sub: streaks.current === 1 ? 'day' : 'days' },
    { label: 'Longest streak', value: String(streaks.longest), sub: streaks.longest === 1 ? 'day' : 'days' },
  ];

  return (
    <div>
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} class="card p-4">
            <dt class="text-sm text-ink-muted">{s.label}</dt>
            <dd class="mt-1 font-serif text-3xl font-semibold">
              {s.value} <span class="font-sans text-sm font-normal text-ink-muted">{s.sub}</span>
            </dd>
          </div>
        ))}
      </dl>
      {done === 0 && (
        <p class="mt-4 text-ink-muted">
          Nothing read yet. Chapters are marked automatically when you reach the end, or tap “Mark as read”.
        </p>
      )}
      {['old', 'new'].map((t) => (
        <section key={t} class="mt-8" aria-label={t === 'old' ? 'Old Testament' : 'New Testament'}>
          <h2 class="text-lg font-semibold">{t === 'old' ? 'Old Testament' : 'New Testament'}</h2>
          <div class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {books
              .filter((b) => b.testament === t)
              .map((b) => {
                const list = read[b.id] ?? [];
                return (
                  <div key={b.id}>
                    <a href={url(`/bible/${b.id}`)} class="text-sm text-ink no-underline hover:underline">
                      {b.name}{' '}
                      <span class="text-ink-muted">
                        {list.length}/{b.chapters}
                      </span>
                    </a>
                    <div
                      class="mt-1 flex flex-wrap gap-[3px]"
                      role="img"
                      aria-label={`${b.name}: ${list.length} of ${b.chapters} chapters read`}
                    >
                      {Array.from({ length: b.chapters }, (_, i) => (
                        <span
                          key={i}
                          class="size-2.5 rounded-[2px]"
                          style={{ background: list.includes(i + 1) ? `var(--g-${b.genre})` : 'var(--line)' }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

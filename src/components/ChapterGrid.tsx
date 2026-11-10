/** The chapter buttons on a book page, with read chapters ticked. */
import { useEffect, useState } from 'preact/hooks';
import { getReadMap } from '~/lib/progress';
import { url } from '~/lib/url';

export default function ChapterGrid({ bookId, chapters, word }: { bookId: string; chapters: number; word: string }) {
  const [read, setRead] = useState<number[]>([]);
  useEffect(() => setRead(getReadMap()[bookId] ?? []), []);
  return (
    <>
      {read.length > 0 && (
        <p class="mb-3 text-sm text-ink-muted">
          You have read {read.length} of {chapters}.
        </p>
      )}
      <ol class="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {Array.from({ length: chapters }, (_, i) => {
          const done = read.includes(i + 1);
          return (
            <li key={i}>
              <a
                href={url(`/bible/${bookId}/${i + 1}`)}
                class={`flex aspect-square min-h-11 items-center justify-center rounded-xl border no-underline ${
                  done
                    ? 'border-accent bg-accent-fill text-accent-ink'
                    : 'border-line bg-surface text-ink hover:border-accent hover:bg-accent-soft'
                }`}
                aria-label={`${word} ${i + 1}${done ? ', read' : ''}`}
              >
                {i + 1}
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}

/**
 * "Continue where I left off" — only appears once you have opened a chapter.
 */
import { useEffect, useState } from 'preact/hooks';
import { getLastRead, type LastRead } from '~/lib/progress';
import { url } from '~/lib/url';

interface Props {
  /** Book id → display name, so we can label the link. */
  names: Record<string, string>;
}

export default function ContinueReading({ names }: Props) {
  const [last, setLast] = useState<LastRead | null>(null);
  useEffect(() => setLast(getLastRead()), []);
  if (!last || !names[last.book]) return null;
  const label = last.book === 'psalms' ? `Psalm ${last.chapter}` : `${names[last.book]} ${last.chapter}`;
  return (
    <a
      href={url(`/bible/${last.book}/${last.chapter}`)}
      class="card flex items-center justify-between gap-4 p-5 text-ink no-underline hover:border-accent"
    >
      <span>
        <span class="block text-sm text-ink-muted">Continue where you left off</span>
        <span class="mt-0.5 block font-serif text-xl font-semibold">{label}</span>
      </span>
      <svg
        class="size-6 text-accent"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M5 12h14m-6-6 6 6-6 6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </a>
  );
}

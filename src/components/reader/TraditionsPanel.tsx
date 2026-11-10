/**
 * "How traditions read this": a panel showing 2-4 ways Christian traditions
 * understand a passage, each attributed with sources. No view is ranked.
 */
import { useEffect, useRef } from 'preact/hooks';
import type { PassageNote } from '~/lib/schemas';
import { url } from '~/lib/url';

interface Props {
  note: PassageNote;
  reference: string;
  traditionNames: Record<string, string>;
  onClose: () => void;
}

export default function TraditionsPanel({ note, reference, traditionNames, onClose }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [note.id]);

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="traditions-panel-title"
      class="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[80dvh] max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:bottom-4 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-xs font-semibold tracking-wide text-ink-muted uppercase">How traditions read {reference}</p>
          <h2 id="traditions-panel-title" class="mt-1 text-lg font-semibold">
            {note.title}
          </h2>
        </div>
        <button
          type="button"
          class="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
          aria-label="Close"
          onClick={onClose}
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <p class="mt-2 text-ink-muted">{note.intro}</p>
      <ul class="mt-4 space-y-3">
        {note.views.map((v) => (
          <li key={v.label} class="rounded-xl border border-line p-3">
            <h3 class="font-semibold">{v.label}</h3>
            <p class="mt-1">{v.summary}</p>
            <p class="mt-2 text-sm text-ink-muted">
              Held by:{' '}
              {v.heldBy.map((id, i) => (
                <>
                  {i > 0 && ', '}
                  {traditionNames[id] ? <a href={url(`/traditions/${id}`)}>{traditionNames[id]}</a> : id}
                </>
              ))}
            </p>
            <p class="mt-1 text-xs text-ink-muted">Source: {v.source}</p>
          </li>
        ))}
      </ul>
      {note.common && (
        <p class="mt-4 rounded-xl bg-accent-soft p-3 text-sm">
          <strong>Common ground:</strong> {note.common}
        </p>
      )}
      <p class="mt-3 text-xs text-ink-muted">
        Summaries describe each tradition in its own terms. Views within a tradition can vary.
      </p>
    </div>
  );
}

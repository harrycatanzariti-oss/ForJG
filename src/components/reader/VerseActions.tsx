/**
 * The panel that slides up when you tap a verse: highlight in 4 colours,
 * write a private note, copy the verse, or share a link to it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { HIGHLIGHT_COLOURS, type Annotation, type HighlightColour } from '~/lib/annotations';

interface Props {
  reference: string;
  verseText: string;
  translation: string;
  shareUrl: string;
  annotation?: Annotation;
  onHighlight: (colour: HighlightColour | null) => void;
  onSaveNote: (note: string) => void;
  onClose: () => void;
}

const COLOUR_NAMES: Record<HighlightColour, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
};

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: fall back to a hidden textarea.
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function VerseActions({
  reference,
  verseText,
  translation,
  shareUrl,
  annotation,
  onHighlight,
  onSaveNote,
  onClose,
}: Props) {
  const [note, setNote] = useState(annotation?.note ?? '');
  const [editing, setEditing] = useState(!!annotation?.note);
  const [status, setStatus] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>('button, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  useEffect(() => {
    setNote(annotation?.note ?? '');
  }, [reference]);

  const copy = async () => {
    const ok = await copyText(`“${verseText}” ${reference} (${translation})`);
    setStatus(ok ? 'Verse copied.' : 'Could not copy on this device.');
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: reference, text: `${reference}: “${verseText}”`, url: shareUrl });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    const ok = await copyText(shareUrl);
    setStatus(ok ? 'Link copied.' : shareUrl);
  };

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-labelledby="verse-actions-title"
      class="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl rounded-t-2xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:bottom-4 sm:rounded-2xl"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 id="verse-actions-title" class="font-semibold">
          {reference}
        </h2>
        <button
          type="button"
          class="flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
          aria-label="Close"
          onClick={onClose}
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <fieldset class="mt-2">
        <legend class="text-sm text-ink-muted">Highlight</legend>
        <div class="mt-2 flex items-center gap-3">
          {HIGHLIGHT_COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              class={`swatch-${c} size-11 rounded-full border-2 ${annotation?.colour === c ? 'border-ink' : 'border-transparent'}`}
              aria-label={`${COLOUR_NAMES[c]} highlight`}
              aria-pressed={annotation?.colour === c}
              onClick={() => onHighlight(annotation?.colour === c ? null : c)}
            />
          ))}
          {annotation?.colour && (
            <button type="button" class="btn btn-secondary min-h-11 px-3 text-sm" onClick={() => onHighlight(null)}>
              Remove
            </button>
          )}
        </div>
      </fieldset>

      {editing ? (
        <div class="mt-4">
          <label for="verse-note" class="text-sm text-ink-muted">
            Private note (saved only on this device)
          </label>
          <textarea
            id="verse-note"
            rows={3}
            class="mt-1 w-full rounded-xl border border-line bg-paper p-3 text-ink"
            value={note}
            onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
          />
          <div class="mt-2 flex gap-2">
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                onSaveNote(note);
                setStatus(note.trim() ? 'Note saved.' : 'Note removed.');
                if (!note.trim()) setEditing(false);
              }}
            >
              Save note
            </button>
            {annotation?.note && (
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => {
                  setNote('');
                  onSaveNote('');
                  setEditing(false);
                  setStatus('Note removed.');
                }}
              >
                Delete note
              </button>
            )}
          </div>
        </div>
      ) : null}

      <div class="mt-4 flex flex-wrap gap-2">
        {!editing && (
          <button type="button" class="btn btn-secondary" onClick={() => setEditing(true)}>
            Add note
          </button>
        )}
        <button type="button" class="btn btn-secondary" onClick={() => void copy()}>
          Copy
        </button>
        <button type="button" class="btn btn-secondary" onClick={() => void share()}>
          Share link
        </button>
      </div>
      <p class="mt-2 min-h-5 text-sm text-ink-muted" role="status">
        {status}
      </p>
    </div>
  );
}

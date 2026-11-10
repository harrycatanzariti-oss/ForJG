/**
 * Renders one chapter of Bible text: headings, paragraphs, poetry lines and
 * verse numbers. Each verse gets an id like "v16" so links such as
 * /bible/john/3#v16 jump straight to it.
 *
 * Tapping a verse (or its number button, for keyboard users) opens the verse
 * actions: highlight, note, copy and share.
 */
import type { ComponentChildren } from 'preact';
import type { Annotation } from '~/lib/annotations';
import type { Chapter, Verse } from '~/lib/schemas';

export interface NoteMarker {
  id: string;
  firstVerse: number;
  title: string;
}

interface Props {
  chapter: Chapter;
  showVerseNumbers: boolean;
  annotations?: Record<number, Annotation>;
  /** "How traditions read this" markers, shown before their first verse. */
  noteMarkers?: NoteMarker[];
  selectedVerse?: number | null;
  onVerse?: (verse: number) => void;
  onNoteMarker?: (id: string) => void;
}

type Block = { kind: 'heading'; text: string } | { kind: 'para'; poetry: boolean; verses: Verse[] };

/** Groups verses into headings and paragraphs, ready to render. */
export function toBlocks(chapter: Chapter): Block[] {
  const blocks: Block[] = [];
  let current: Extract<Block, { kind: 'para' }> | null = null;
  for (const verse of chapter.verses) {
    const headings = chapter.headings.filter((h) => h.beforeVerse === verse.v);
    for (const h of headings) {
      blocks.push({ kind: 'heading', text: h.text });
      current = null;
    }
    const poetry = verse.poetry === true;
    if (!current || verse.para || current.poetry !== poetry) {
      current = { kind: 'para', poetry, verses: [] };
      blocks.push(current);
    }
    current.verses.push(verse);
  }
  return blocks;
}

export default function ScriptureText({
  chapter,
  showVerseNumbers,
  annotations = {},
  noteMarkers = [],
  selectedVerse,
  onVerse,
  onNoteMarker,
}: Props) {
  const blocks = toBlocks(chapter);
  const out: ComponentChildren[] = [];
  const interactive = !!onVerse;

  blocks.forEach((block, i) => {
    if (block.kind === 'heading') {
      out.push(
        <h2 key={`h${i}`} class="mt-8 mb-2 font-sans text-base font-semibold text-ink first:mt-0">
          {block.text}
        </h2>,
      );
      return;
    }
    out.push(
      <p key={`p${i}`} class={block.poetry ? 'my-4 pl-4' : 'my-4'}>
        {block.verses.map((verse) => {
          const ann = annotations[verse.v];
          const markers = noteMarkers.filter((m) => m.firstVerse === verse.v);
          const classes = [
            'scroll-mt-20 rounded-sm',
            block.poetry ? 'block -indent-4 pl-4' : '',
            ann?.colour ? `hl-${ann.colour}` : '',
            selectedVerse === verse.v ? 'verse-selected' : '',
            interactive ? 'cursor-pointer' : '',
          ].join(' ');
          return (
            <span
              key={verse.v}
              id={`v${verse.v}`}
              data-verse={verse.v}
              class={classes}
              onClick={(e) => {
                // Ignore taps that end a text selection or hit a nested button.
                if ((e.target as HTMLElement).closest('button')) return;
                if (window.getSelection()?.toString()) return;
                onVerse?.(verse.v);
              }}
            >
              {markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  class="traditions-marker mr-1 inline-flex size-6 -translate-y-0.5 items-center justify-center rounded-full bg-accent-soft align-middle font-sans text-xs text-accent"
                  aria-label={`How traditions read this: ${m.title}`}
                  title="How traditions read this"
                  onClick={() => onNoteMarker?.(m.id)}
                >
                  <svg
                    class="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M4 6h10M4 12h16M4 18h7" stroke-linecap="round" />
                    <circle cx="18" cy="6" r="2" />
                  </svg>
                </button>
              ))}
              {interactive ? (
                <button
                  type="button"
                  class={
                    showVerseNumbers
                      ? 'mr-1 align-super font-sans text-[0.65em] font-semibold text-ink-muted select-none hover:text-accent'
                      : 'sr-only-focusable mr-1 align-super font-sans text-[0.65em]'
                  }
                  aria-label={`Verse ${verse.v}: highlight, note, copy or share`}
                  aria-haspopup="dialog"
                  onClick={() => onVerse?.(verse.v)}
                >
                  {verse.v}
                </button>
              ) : (
                showVerseNumbers && (
                  <sup class="mr-1 align-super font-sans text-[0.65em] font-semibold text-ink-muted select-none">
                    {verse.v}
                  </sup>
                )
              )}
              {verse.text}
              {ann?.note && (
                <button
                  type="button"
                  class="ml-1 inline-flex -translate-y-0.5 align-middle text-accent"
                  aria-label={`Your note on verse ${verse.v}`}
                  onClick={() => onVerse?.(verse.v)}
                >
                  <svg
                    class="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M4 4h16v12H8l-4 4z" stroke-linejoin="round" />
                  </svg>
                </button>
              )}{' '}
            </span>
          );
        })}
      </p>,
    );
  });

  return (
    <div class="scripture">
      {chapter.superscription && <p class="mb-4 text-[0.9em] text-ink-muted italic">{chapter.superscription}</p>}
      {out}
    </div>
  );
}

/**
 * Renders one chapter of Bible text: headings, paragraphs, poetry lines and
 * verse numbers. Each verse gets an id like "v16" so links such as
 * /bible/john/3#v16 jump straight to it.
 */
import type { ComponentChildren } from 'preact';
import type { Chapter, Verse } from '~/lib/schemas';

interface Props {
  chapter: Chapter;
  showVerseNumbers: boolean;
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

export default function ScriptureText({ chapter, showVerseNumbers }: Props) {
  const blocks = toBlocks(chapter);
  const out: ComponentChildren[] = [];
  blocks.forEach((block, i) => {
    if (block.kind === 'heading') {
      out.push(
        <h3 key={`h${i}`} class="mt-8 mb-2 font-sans text-base font-semibold text-ink first:mt-0">
          {block.text}
        </h3>,
      );
      return;
    }
    out.push(
      <p key={`p${i}`} class={block.poetry ? 'my-4 pl-4' : 'my-4'}>
        {block.verses.map((verse) => (
          <span
            key={verse.v}
            id={`v${verse.v}`}
            data-verse={verse.v}
            class={`scroll-mt-20 ${block.poetry ? 'block -indent-4 pl-4' : ''}`}
          >
            {showVerseNumbers && (
              <sup class="mr-1 align-super font-sans text-[0.65em] font-semibold text-ink-muted select-none">
                {verse.v}
              </sup>
            )}
            {verse.text}{' '}
          </span>
        ))}
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

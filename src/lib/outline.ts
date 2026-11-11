/**
 * A quick outline of any chapter, made at build time from the BSB section
 * headings and the book's introduction. It lets the Plain and Summary levels
 * work on every chapter, even before a hand-written retelling exists.
 * Nothing here is invented: the headings come from the BSB, the overview from
 * our own book introduction, and the question is a general one for the genre.
 */
import type { Chapter } from './schemas';

export interface OutlineSection {
  heading: string;
  from: number;
  to: number;
}

export interface Outline {
  sections: OutlineSection[];
  /** The first sentence of the book's introduction. */
  bookIdea?: string;
  reflection: string;
}

const QUESTIONS: Record<string, string> = {
  law: 'What does this chapter show about who God is and how he wants his people to live?',
  history: 'Where do you see God at work in these events, even when people fail?',
  wisdom: 'Which line here puts into words something you have felt or needed to hear?',
  prophets: 'What is God warning against here, and what is he promising?',
  gospels: 'What does this chapter show you about who Jesus is?',
  acts: 'What do the first Christians do here that you could learn from?',
  letters: 'What is the writer asking his readers to believe or do, and why?',
  apocalyptic: 'Behind the vivid pictures, what hope does this chapter hold out?',
};

export function makeOutline(chapter: Chapter, genre: string, overview?: string): Outline {
  const last = chapter.verses.at(-1)?.v ?? 1;
  const first = chapter.verses[0]?.v ?? 1;
  const heads = (chapter.headings ?? []).filter((h) => h.beforeVerse >= first && h.beforeVerse <= last);
  const sections: OutlineSection[] = heads.map((h, i) => ({
    heading: h.text,
    from: i === 0 ? first : h.beforeVerse,
    to: (heads[i + 1]?.beforeVerse ?? last + 1) - 1,
  }));
  if (!sections.length) sections.push({ heading: `Verses ${first}–${last}`, from: first, to: last });
  // Verses before the first heading join the first section.
  sections[0]!.from = first;
  const bookIdea = overview?.match(/^.*?[.!?](?=\s|$)/)?.[0];
  return { sections, bookIdea, reflection: QUESTIONS[genre] ?? QUESTIONS.letters! };
}

/**
 * Build-time loaders for the non-Bible content in src/data/.
 * Each file is checked against its Zod schema as it is loaded.
 */
import { passageNotesSchema, traditionSchema, type PassageNotes, type Tradition } from './schemas';

const noteFiles = import.meta.glob<unknown>('/src/data/passage-notes/*.json', { eager: true, import: 'default' });
const traditionFiles = import.meta.glob<unknown>('/src/data/traditions/*.json', { eager: true, import: 'default' });

export function getPassageNotes(bookId: string, chapter: number): PassageNotes | undefined {
  const raw = noteFiles[`/src/data/passage-notes/${bookId}-${chapter}.json`];
  return raw ? passageNotesSchema.parse(raw) : undefined;
}

export const allPassageNotes = (): PassageNotes[] => Object.values(noteFiles).map((r) => passageNotesSchema.parse(r));

/** Display order: roughly historical, with "other groups" last. */
export const TRADITION_ORDER = [
  'catholic',
  'eastern-orthodox',
  'oriental-orthodox',
  'church-of-the-east',
  'lutheran',
  'reformed',
  'anglican',
  'anabaptist',
  'baptist',
  'quaker',
  'methodist',
  'churches-of-christ',
  'seventh-day-adventist',
  'pentecostal',
  'charismatic-evangelical',
  'latter-day-saints',
  'jehovahs-witnesses',
];

export const traditions: Tradition[] = Object.values(traditionFiles)
  .map((r) => traditionSchema.parse(r))
  .sort((a, b) => TRADITION_ORDER.indexOf(a.id) - TRADITION_ORDER.indexOf(b.id));

export const getTradition = (id: string) => traditions.find((t) => t.id === id);

export const traditionNames = (): Record<string, string> =>
  Object.fromEntries(traditions.map((t) => [t.id, t.shortName]));

import { bigQuestionSchema, type BigQuestion } from './schemas';
const questionFiles = import.meta.glob<unknown>('/src/data/questions/*.json', { eager: true, import: 'default' });
export const bigQuestions: BigQuestion[] = Object.values(questionFiles)
  .map((r) => bigQuestionSchema.parse(r))
  .sort((a, b) => a.title.localeCompare(b.title));

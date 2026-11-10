/**
 * Highlights and private notes on verses, stored in the browser.
 * Keys look like "john:3:16" so they work across all translations.
 */
import { read, write } from './storage';

export const HIGHLIGHT_COLOURS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number];

export interface Annotation {
  colour?: HighlightColour;
  note?: string;
  /** ISO timestamp of last change */
  updated: string;
}

const KEY = 'annotations';

export const verseKey = (book: string, chapter: number, verse: number) => `${book}:${chapter}:${verse}`;

export function getAnnotations(): Record<string, Annotation> {
  const raw = read<unknown>(KEY, {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, Annotation>) : {};
}

/** Annotations for one chapter, keyed by verse number. */
export function chapterAnnotations(book: string, chapter: number): Record<number, Annotation> {
  const prefix = `${book}:${chapter}:`;
  const out: Record<number, Annotation> = {};
  for (const [k, v] of Object.entries(getAnnotations())) {
    if (k.startsWith(prefix)) out[Number(k.slice(prefix.length))] = v;
  }
  return out;
}

export function setAnnotation(
  book: string,
  chapter: number,
  verse: number,
  patch: { colour?: HighlightColour | null; note?: string | null },
  now = new Date(),
): void {
  const all = getAnnotations();
  const key = verseKey(book, chapter, verse);
  const next: Annotation = { ...all[key], updated: now.toISOString() };
  if (patch.colour !== undefined) {
    if (patch.colour === null) delete next.colour;
    else next.colour = patch.colour;
  }
  if (patch.note !== undefined) {
    const trimmed = patch.note?.trim();
    if (!trimmed) delete next.note;
    else next.note = trimmed;
  }
  if (!next.colour && !next.note) delete all[key];
  else all[key] = next;
  write(KEY, all);
}

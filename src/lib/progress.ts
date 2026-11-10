/**
 * Reading progress stored in the browser.
 * Phase 1 only remembers the last chapter opened; Phase 2 adds chapters read and streaks.
 */
import { read, write } from './storage';

export interface LastRead {
  book: string;
  chapter: number;
  /** ISO timestamp */
  at: string;
}

const LAST_READ_KEY = 'reader:lastRead';

export function recordLastRead(book: string, chapter: number, now = new Date()): void {
  write<LastRead>(LAST_READ_KEY, { book, chapter, at: now.toISOString() });
}

export function getLastRead(): LastRead | null {
  const v = read<LastRead | null>(LAST_READ_KEY, null);
  if (!v || typeof v.book !== 'string' || typeof v.chapter !== 'number') return null;
  return v;
}

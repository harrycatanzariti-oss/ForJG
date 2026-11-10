/**
 * Reading progress stored in the browser: the last chapter opened, which
 * chapters have been read, and on which days (for streaks).
 */
import { read, write } from './storage';

export interface LastRead {
  book: string;
  chapter: number;
  /** ISO timestamp */
  at: string;
}

const LAST_READ_KEY = 'reader:lastRead';
const READ_KEY = 'progress:read';
const DAYS_KEY = 'progress:days';

export function recordLastRead(book: string, chapter: number, now = new Date()): void {
  write<LastRead>(LAST_READ_KEY, { book, chapter, at: now.toISOString() });
}

export function getLastRead(): LastRead | null {
  const v = read<LastRead | null>(LAST_READ_KEY, null);
  if (!v || typeof v.book !== 'string' || typeof v.chapter !== 'number') return null;
  return v;
}

/** A date as "YYYY-MM-DD" in the reader's own time zone. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses "YYYY-MM-DD" as a local date at midnight. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000);
}

type ReadMap = Record<string, number[]>;

export function getReadMap(): ReadMap {
  const raw = read<unknown>(READ_KEY, {});
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: ReadMap = {};
  for (const [book, chapters] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(chapters)) out[book] = chapters.filter((c): c is number => Number.isInteger(c) && c > 0);
  }
  return out;
}

export function isRead(book: string, chapter: number, map: ReadMap = getReadMap()): boolean {
  return map[book]?.includes(chapter) ?? false;
}

function getDays(): Record<string, number> {
  const raw = read<unknown>(DAYS_KEY, {});
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, number>) : {};
}

export function markRead(book: string, chapter: number, now = new Date()): void {
  const map = getReadMap();
  const list = new Set(map[book] ?? []);
  if (list.has(chapter)) return;
  list.add(chapter);
  map[book] = [...list].sort((a, b) => a - b);
  write(READ_KEY, map);
  const days = getDays();
  const key = dayKey(now);
  days[key] = (days[key] ?? 0) + 1;
  write(DAYS_KEY, days);
}

export function markUnread(book: string, chapter: number, now = new Date()): void {
  const map = getReadMap();
  if (!map[book]?.includes(chapter)) return;
  map[book] = map[book]!.filter((c) => c !== chapter);
  if (map[book]!.length === 0) delete map[book];
  write(READ_KEY, map);
  // Undoing straight after marking should not leave a streak day behind.
  const days = getDays();
  const key = dayKey(now);
  if (days[key]) {
    days[key] -= 1;
    if (days[key] <= 0) delete days[key];
    write(DAYS_KEY, days);
  }
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * A streak is consecutive days on which at least one chapter was read.
 * The current streak still counts if you have not read yet today but did yesterday.
 */
export function computeStreaks(dayKeys: string[], today: string = dayKey()): Streaks {
  const days = [...new Set(dayKeys)].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0;
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

export function getStreaks(today?: string): Streaks {
  return computeStreaks(Object.keys(getDays()), today);
}

export function totalRead(map: ReadMap = getReadMap()): number {
  return Object.values(map).reduce((n, list) => n + list.length, 0);
}

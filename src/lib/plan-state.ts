/**
 * Which plan you are following, and where you are in it. Only one active
 * plan at a time. A day counts as done when every chapter in it has been
 * marked as read, so the plan and the reader share the same progress.
 */
import { addDays, dayKey, daysBetween, getReadMap } from './progress';
import type { Reading } from './plans';
import { read, remove, write } from './storage';

const KEY = 'plan:active';

export interface ActivePlan {
  id: string;
  /** First day of the plan, "YYYY-MM-DD". */
  start: string;
}

export function getActivePlan(): ActivePlan | null {
  const v = read<ActivePlan | null>(KEY, null);
  return v && typeof v.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.start) ? v : null;
}

export function startPlan(id: string, start: string = dayKey()): void {
  write<ActivePlan>(KEY, { id, start });
}

export function stopPlan(): void {
  remove(KEY);
}

export interface PlanStatus {
  /** 0-based index of today's reading (clamped to the plan length). */
  todayIndex: number;
  /** True before the start date. */
  notStarted: boolean;
  /** True once every day is complete. */
  finished: boolean;
  /** Each day: done or not. */
  done: boolean[];
  /** Past days (before today) that are not done. */
  behind: number;
  /** The first day that is not done, or -1. */
  firstUndone: number;
  completedDays: number;
}

export function planStatus(
  days: Reading[][],
  active: ActivePlan,
  readMap: Record<string, number[]> = getReadMap(),
  today: string = dayKey(),
): PlanStatus {
  const done = days.map((d) => d.length > 0 && d.every((r) => readMap[r.book]?.includes(r.chapter)));
  const offset = daysBetween(active.start, today);
  const todayIndex = Math.min(Math.max(offset, 0), days.length - 1);
  const pastEnd = offset >= days.length ? days.length : todayIndex;
  const behind = done.slice(0, pastEnd).filter((d) => !d).length;
  const firstUndone = done.indexOf(false);
  return {
    todayIndex,
    notStarted: offset < 0,
    finished: firstUndone === -1,
    done,
    behind,
    firstUndone,
    completedDays: done.filter(Boolean).length,
  };
}

/**
 * "Adjust my plan": move the start date so that the first unfinished day
 * becomes today. Nothing already read is lost.
 */
export function catchUpStart(status: PlanStatus, today: string = dayKey()): string {
  return addDays(today, -Math.max(status.firstUndone, 0));
}

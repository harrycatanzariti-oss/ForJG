/**
 * /plans/{id}: start, follow, adjust or stop a plan, and see every day.
 */
import { useEffect, useState } from 'preact/hooks';
import { catchUpStart, getActivePlan, planStatus, startPlan, stopPlan, type ActivePlan } from '~/lib/plan-state';
import type { PlanData } from '~/lib/plans-data';
import { addDays, dayKey, getReadMap } from '~/lib/progress';
import { CHANGE_EVENT } from '~/lib/storage';
import { url } from '~/lib/url';
import { PlanToday, toDays } from './TodayReading';

export default function PlanDetail({
  data,
  names,
  otherNames,
}: {
  data: PlanData;
  names: Record<string, string>;
  otherNames: Record<string, string>;
}) {
  const [active, setActive] = useState<ActivePlan | null>(null);
  const [readMap, setReadMap] = useState<Record<string, number[]>>({});
  const [start, setStart] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setActive(getActivePlan());
      setReadMap(getReadMap());
    };
    refresh();
    // Keep a date the visitor already typed while the page was loading.
    setStart((s) => s || dayKey());
    setHydrated(true);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, []);

  const days = toDays(data);
  const isActive = active?.id === data.id;
  const status = isActive ? planStatus(days, active!, readMap) : null;
  const centre = status ? status.todayIndex : 0;
  const visible = showAll
    ? days.map((_, i) => i)
    : days.map((_, i) => i).filter((i) => i >= centre - 2 && i <= centre + 11);

  const begin = () => {
    if (active && !isActive) {
      const ok = window.confirm(
        `You're following "${otherNames[active.id] ?? 'another plan'}". Only one plan can be active. Switch to "${data.name}"? Chapters you've read stay marked as read.`,
      );
      if (!ok) return;
    }
    startPlan(data.id, start || dayKey());
  };

  return (
    <div class="space-y-6">
      {isActive && status ? (
        <>
          <PlanToday
            data={data}
            names={names}
            active={active!}
            status={status}
            readMap={readMap}
            onAdjust={() => startPlan(data.id, catchUpStart(status))}
          />
          <details class="card p-4">
            <summary class="min-h-11 cursor-pointer py-2 font-medium">Change or stop this plan</summary>
            <div class="mt-3 space-y-4">
              <div class="flex flex-wrap items-end gap-2">
                <label class="block">
                  <span class="block text-sm">Start date</span>
                  <input
                    type="date"
                    class="mt-1 min-h-11 rounded-xl border border-line bg-paper px-3 text-ink"
                    value={active!.start}
                    onChange={(e) => {
                      const v = (e.target as HTMLInputElement).value;
                      if (v) startPlan(data.id, v);
                    }}
                  />
                </label>
                <button type="button" class="btn btn-secondary" onClick={() => startPlan(data.id, dayKey())}>
                  Restart from today
                </button>
              </div>
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => window.confirm('Stop following this plan? Your reading progress is kept.') && stopPlan()}
              >
                Stop this plan
              </button>
            </div>
          </details>
        </>
      ) : (
        <form
          class="card flex flex-wrap items-end gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            begin();
          }}
        >
          <label class="block">
            <span class="block text-sm font-medium">Start date</span>
            <input
              type="date"
              required
              class="mt-1 min-h-11 rounded-xl border border-line bg-paper px-3 text-ink"
              value={start}
              onInput={(e) => setStart((e.target as HTMLInputElement).value)}
            />
          </label>
          <button type="submit" class="btn btn-primary" disabled={!hydrated}>
            Start this plan
          </button>
          {active && (
            <p class="w-full text-sm text-ink-muted">
              You’re currently following <a href={url(`/plans/${active.id}`)}>{otherNames[active.id]}</a>. Starting this
              one will replace it.
            </p>
          )}
        </form>
      )}

      <section aria-labelledby="days-heading">
        <h2 id="days-heading" class="text-lg font-semibold">
          {showAll ? `All ${days.length} days` : 'Days'}
        </h2>
        <ol class="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {visible.map((i) => {
            const done = status?.done[i];
            const isToday = status && !status.notStarted && i === status.todayIndex;
            const date = isActive ? new Date(`${addDays(active!.start, i)}T12:00`) : null;
            const [b, c] = data.days[i]![0]!;
            return (
              <li key={i} class={`flex items-center gap-3 px-4 py-3 ${isToday ? 'bg-accent-soft' : ''}`}>
                <span
                  class={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? 'bg-accent-fill text-accent-ink' : 'border border-line text-ink-muted'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : i + 1}
                </span>
                <span class="min-w-0 flex-1">
                  <a href={url(`/bible/${b}/${c}`)} class="block text-ink no-underline hover:underline">
                    {data.labels[i]}
                  </a>
                  <span class="block text-xs text-ink-muted">
                    Day {i + 1}
                    {date &&
                      ` · ${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`}
                    {isToday && ' · Today'}
                    {done && <span class="sr-only"> · done</span>}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        {days.length > visible.length || showAll ? (
          <button type="button" class="btn btn-secondary mt-3" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer days' : `Show all ${days.length} days`}
          </button>
        ) : null}
      </section>
    </div>
  );
}

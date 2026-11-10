/**
 * "Today's reading" for the active plan, shown on the home page and /plans.
 * If you've fallen behind it offers to adjust the plan, without guilt.
 */
import { useEffect, useState } from 'preact/hooks';
import { catchUpStart, getActivePlan, planStatus, startPlan, type ActivePlan, type PlanStatus } from '~/lib/plan-state';
import type { PlanData } from '~/lib/plans-data';
import { getReadMap } from '~/lib/progress';
import { CHANGE_EVENT } from '~/lib/storage';
import { url } from '~/lib/url';

export function toDays(data: PlanData) {
  return data.days.map((d) => d.map(([book, chapter]) => ({ book, chapter })));
}

const bookLabel = (id: string, names: Record<string, string>) => (id === 'psalms' ? 'Psalm' : (names[id] ?? id));

export function PlanToday({
  data,
  names,
  active,
  status,
  readMap,
  onAdjust,
}: {
  data: PlanData;
  names: Record<string, string>;
  active: ActivePlan;
  status: PlanStatus;
  readMap: Record<string, number[]>;
  onAdjust: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const i = status.notStarted ? 0 : status.todayIndex;
  const day = data.days[i]!;
  const next = day.find(([b, c]) => !readMap[b]?.includes(c)) ?? day[0]!;
  const percent = Math.round((status.completedDays / data.days.length) * 100);
  const allDone = day.every(([b, c]) => readMap[b]?.includes(c));

  if (status.finished) {
    return (
      <div class="card p-5">
        <p class="text-sm text-ink-muted">{data.name}</p>
        <p class="mt-1 font-serif text-xl font-semibold">You finished the plan. Well done!</p>
        <a href={url('/plans')} class="btn btn-primary mt-3">
          Choose another plan
        </a>
      </div>
    );
  }

  return (
    <div class="card p-5">
      <div class="flex items-baseline justify-between gap-2">
        <p class="text-sm">
          <a href={url(`/plans/${active.id}`)} class="text-ink-muted">
            {data.name}
          </a>
        </p>
        <p class="text-sm text-ink-muted">{percent}% done</p>
      </div>
      <p class="mt-1 text-sm font-semibold">
        {status.notStarted
          ? `Starts ${new Date(`${active.start}T12:00`).toLocaleDateString()}`
          : `Today: day ${i + 1} of ${data.days.length}`}
      </p>
      <p class="mt-1 font-serif text-2xl font-semibold">{data.labels[i]}</p>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div class="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <ul class="mt-3 flex flex-wrap gap-2">
        {day.map(([b, c]) => {
          const isDone = readMap[b]?.includes(c);
          return (
            <li key={`${b}${c}`}>
              <a
                href={url(`/bible/${b}/${c}`)}
                class={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm no-underline ${
                  isDone ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-paper text-ink hover:border-accent'
                }`}
              >
                {isDone && <span aria-hidden="true">✓</span>}
                {bookLabel(b, names)} {c}
                {isDone && <span class="sr-only"> (read)</span>}
              </a>
            </li>
          );
        })}
      </ul>
      <a href={url(`/bible/${next[0]}/${next[1]}`)} class="btn btn-primary mt-4">
        {allDone ? 'Done for today: read again' : 'Start today’s reading'}
      </a>
      {status.behind > 0 && !dismissed && (
        <div class="mt-4 rounded-xl bg-accent-soft p-4" role="status">
          <p>
            You’re {status.behind} {status.behind === 1 ? 'day' : 'days'} behind. That’s completely fine. Want to adjust
            your plan so today picks up where you left off?
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary" onClick={onAdjust}>
              Adjust my plan
            </button>
            <button type="button" class="btn btn-secondary" onClick={() => setDismissed(true)}>
              I’ll catch up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Self-contained version that finds and loads the active plan itself. */
export default function TodayReading({
  names,
  emptyHint = true,
}: {
  names: Record<string, string>;
  emptyHint?: boolean;
}) {
  const [active, setActive] = useState<ActivePlan | null>(null);
  const [data, setData] = useState<PlanData | null>(null);
  const [readMap, setReadMap] = useState<Record<string, number[]>>({});
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setActive(getActivePlan());
      setReadMap(getReadMap());
    };
    refresh();
    setChecked(true);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CHANGE_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(url(`/data/plans/${active.id}.json`))
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [active?.id]);

  if (!checked) return null;
  if (!active) {
    return emptyHint ? (
      <a href={url('/plans')} class="card flex items-start gap-4 p-5 text-ink no-underline hover:border-accent">
        <span>
          <span class="block font-serif text-xl font-semibold">Follow a reading plan</span>
          <span class="mt-1 block text-ink-muted">From 21 gentle days to the whole Bible in a year.</span>
        </span>
      </a>
    ) : null;
  }
  if (!data) return null;
  const status = planStatus(toDays(data), active, readMap);
  return (
    <PlanToday
      data={data}
      names={names}
      active={active}
      status={status}
      readMap={readMap}
      onAdjust={() => startPlan(active.id, catchUpStart(status))}
    />
  );
}

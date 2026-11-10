/**
 * The interactive family tree of Christian traditions (an SVG timeline).
 *
 * Time runs left to right on a compressed scale (early centuries are
 * squeezed so recent branches have room). Drag to pan, pinch or use the
 * buttons to zoom. Tap a dot to see why that split happened; tap a name to
 * open the tradition's profile. A full list version is rendered below the
 * tree by the page for screen readers and anyone who prefers text.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Tree } from '~/lib/schemas';
import { url } from '~/lib/url';

interface Props {
  tree: Tree;
  families: Record<string, string>;
  names: Record<string, string>;
}

const LANE = 34;
const TOP = 44;
const LEFT = 16;
const LABEL = 200;
const NOW = 2030;
const SEGMENTS: [number, number, number, number][] = [
  [0, 1000, 0, 330],
  [1000, 1500, 330, 480],
  [1500, NOW, 480, 1080],
];

export function xOf(year: number): number {
  for (const [y0, y1, x0, x1] of SEGMENTS) {
    if (year <= y1) return LEFT + x0 + ((Math.max(year, y0) - y0) / (y1 - y0)) * (x1 - x0);
  }
  return LEFT + 1080;
}

const TICKS = [100, 500, 1000, 1500, 1600, 1700, 1800, 1900, 2000];

export default function FamilyTree({ tree, families, names }: Props) {
  const lanes = Math.max(...tree.branches.map((b) => b.lane)) + 1;
  const W = LEFT + 1080 + LABEL;
  const H = TOP + lanes * LANE + 16;
  const yOf = (lane: number) => TOP + lane * LANE + LANE / 2;
  const byId = new Map(tree.branches.map((b) => [b.id, b]));
  const eventById = new Map(tree.events.map((e) => [e.id, e]));

  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 360, h: 420 });
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ x: number; y: number; d: number } | null>(null);

  // Default view: readable text size. On narrow screens, start at the right
  // so the newest branches and their names show; drag left for earlier centuries.
  const fit = (w = size.w, h = size.h) => {
    const s = Math.min(1, Math.max(0.6, h / H));
    const x = W * s <= w ? 0 : w - W * s;
    setView({ s, x, y: Math.max(0, (h - H * s) / 2) });
  };

  useEffect(() => {
    const el = box.current!;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const next = { w: r.width, h: r.height };
      setSize(next);
      return next;
    };
    const first = measure();
    fit(first.w, first.h);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = (v: { s: number; x: number; y: number }) => {
    const s = Math.min(3, Math.max(0.3, v.s));
    const minX = Math.min(0, size.w - W * s);
    const minY = Math.min(0, size.h - H * s);
    return { s, x: Math.min(40, Math.max(minX - 40, v.x)), y: Math.min(40, Math.max(minY - 40, v.y)) };
  };

  const zoomAt = (factor: number, cx = size.w / 2, cy = size.h / 2) =>
    setView((v) => {
      const s = Math.min(3, Math.max(0.3, v.s * factor));
      const k = s / v.s;
      return clamp({ s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
    });

  // Pointer events cover mouse, pen and touch (including two-finger pinch).
  const onDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = null;
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...pointers.current.values()];
      const rect = box.current!.getBoundingClientRect();
      const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length - rect.left;
      const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length - rect.top;
      const d = pts.length > 1 ? Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) : 0;
      const prev = last.current;
      last.current = { x: cx, y: cy, d };
      if (!prev) return;
      setView((v) => {
        let next = { ...v, x: v.x + (cx - prev.x), y: v.y + (cy - prev.y) };
        if (d && prev.d) {
          const s = Math.min(3, Math.max(0.3, v.s * (d / prev.d)));
          const k = s / v.s;
          next = { s, x: cx - (cx - next.x) * k, y: cy - (cy - next.y) * k };
        }
        return clamp(next);
      });
    };
    const up = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      last.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [size.w, size.h]);

  const event = selected ? eventById.get(selected) : undefined;
  const eventTraditions = event ? tree.branches.filter((b) => b.event === event.id) : [];

  return (
    <div>
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-secondary px-4" onClick={() => zoomAt(1.3)} aria-label="Zoom in">
          +
        </button>
        <button type="button" class="btn btn-secondary px-4" onClick={() => zoomAt(1 / 1.3)} aria-label="Zoom out">
          −
        </button>
        <button type="button" class="btn btn-secondary text-sm" onClick={() => fit()}>
          Reset view
        </button>
        <span class="text-sm text-ink-muted">Drag sideways for earlier centuries · pinch to zoom · tap a dot</span>
      </div>
      <div
        ref={box}
        class="relative h-[60vh] max-h-[640px] min-h-[360px] overflow-hidden rounded-2xl border border-line bg-surface select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onDown}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          const rect = box.current!.getBoundingClientRect();
          zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        <svg
          width={size.w}
          height={size.h}
          role="img"
          aria-label="Family tree of Christian traditions from about AD 30 to today. A text version follows below."
          data-no-swipe
        >
          <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {TICKS.map((y) => (
              <g key={y}>
                <line x1={xOf(y)} x2={xOf(y)} y1={TOP - 14} y2={H} stroke="var(--line)" stroke-dasharray="3 5" />
                <text x={xOf(y)} y={TOP - 20} text-anchor="middle" font-size="12" fill="var(--ink-muted)">
                  {y}
                </text>
              </g>
            ))}
            {tree.branches.map((b) => {
              const y = yOf(b.lane);
              const colour = `var(--f-${families[b.id] ?? 'other'})`;
              const x0 = xOf(b.start);
              const parent = b.parent ? byId.get(b.parent) : null;
              const py = parent ? yOf(parent.lane) : y;
              return (
                <g key={b.id}>
                  {parent && (
                    <path
                      d={`M ${x0} ${py} C ${x0 + 14} ${py}, ${x0 + 4} ${y}, ${x0 + 22} ${y}`}
                      fill="none"
                      stroke={colour}
                      stroke-width="3"
                    />
                  )}
                  {b.earlyUntil && (
                    <>
                      <line
                        x1={x0}
                        x2={xOf(b.earlyUntil)}
                        y1={y}
                        y2={y}
                        stroke="var(--ink-muted)"
                        stroke-width="5"
                        stroke-linecap="round"
                      />
                      <text x={x0 + 26} y={y - 9} font-size="12" fill="var(--ink-muted)">
                        {b.earlyLabel}
                      </text>
                    </>
                  )}
                  <line
                    x1={b.earlyUntil ? xOf(b.earlyUntil) : parent ? x0 + 22 : x0}
                    x2={xOf(NOW)}
                    y1={y}
                    y2={y}
                    stroke={colour}
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-dasharray={parent || b.earlyUntil ? undefined : '8 6'}
                  />
                </g>
              );
            })}
            {/* Second pass: dots and names on top of every line, so they can always be tapped. */}
            {tree.branches.map((b) => {
              const y = yOf(b.lane);
              const colour = `var(--f-${families[b.id] ?? 'other'})`;
              const x0 = xOf(b.start);
              const parent = b.parent ? byId.get(b.parent) : null;
              const py = parent ? yOf(parent.lane) : y;
              return (
                <g key={`m-${b.id}`}>
                  <a href={url(`/traditions/${b.id}`)} aria-label={`${names[b.id] ?? b.label} profile`}>
                    <text x={xOf(NOW) + 10} y={y + 4} font-size="13" font-weight="600" fill={colour} class="underline">
                      {b.label}
                    </text>
                  </a>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${eventById.get(b.event)?.title} (${eventById.get(b.event)?.label}): why did this happen?`}
                    class="cursor-pointer"
                    onClick={() => setSelected(b.event)}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected(b.event))
                    }
                  >
                    <circle cx={x0} cy={b.earlyUntil ? y : parent ? py : y} r="14" fill="transparent" />
                    <circle
                      cx={x0}
                      cy={b.earlyUntil ? y : parent ? py : y}
                      r={selected === b.event ? 8 : 6}
                      fill="var(--surface)"
                      stroke={colour}
                      stroke-width="3"
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div aria-live="polite" class="mt-4">
        {event ? (
          <div class="card p-5">
            <p class="text-sm text-ink-muted">{event.label}</p>
            <h2 class="text-xl font-semibold">{event.title}</h2>
            <p class="mt-2 leading-relaxed">{event.why}</p>
            {eventTraditions.length > 0 && (
              <p class="mt-3 flex flex-wrap gap-2">
                {eventTraditions.map((b) => (
                  <a key={b.id} href={url(`/traditions/${b.id}`)} class="btn btn-secondary text-sm">
                    {names[b.id] ?? b.label}
                  </a>
                ))}
              </p>
            )}
          </div>
        ) : (
          <p class="text-sm text-ink-muted">Tap a dot on the tree to see why that branch began.</p>
        )}
      </div>
    </div>
  );
}

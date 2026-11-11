/**
 * The Simplify slider: four levels from the original KJV to a short summary.
 *
 * It is a real <input type="range">, so it works with touch, mouse, keyboard
 * arrows and screen readers for free. The four labels underneath are buttons
 * too, so you can tap a level directly instead of dragging.
 */
import { LEVELS } from '~/lib/levels';
import type { Level, ModernTranslation } from '~/lib/settings';

interface Props {
  level: Level;
  modern?: ModernTranslation;
  /** Levels that have content for this chapter. */
  available: Record<Level, boolean>;
  onChange: (level: Level) => void;
}

export default function LevelSlider({ level, available, onChange }: Props) {
  const info = LEVELS[level - 1]!;
  const valueText = `Level ${level} of 4: ${info.name}`;

  const choose = (n: number) => {
    const next = Math.min(4, Math.max(1, Math.round(n))) as Level;
    onChange(next);
  };

  return (
    <div class="select-none">
      <label for="level-slider" class="sr-only">
        Reading level
      </label>
      {/* Drawn like Otis's step slider: a track that fills up to the knob, a dot
          at each stop, and the real range input on top (only its knob shows). */}
      <div class="relative mx-[calc(12.5%-11px)] h-7">
        <div class="absolute inset-x-[11px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line" />
        <div
          class="absolute top-1/2 left-[11px] h-1.5 -translate-y-1/2 rounded-full bg-[rgb(var(--vest))] transition-[width] duration-300 ease-out"
          style={{ width: `calc(${(level - 1) / 3} * (100% - 22px))` }}
        />
        {LEVELS.map((l) => (
          <span
            key={l.level}
            aria-hidden="true"
            class={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface ring-2 ${
              l.level <= level ? 'ring-[rgb(var(--vest))]' : 'ring-line'
            }`}
            style={{ left: `calc(11px + ${(l.level - 1) / 3} * (100% - 22px))` }}
          />
        ))}
        <input
          id="level-slider"
          type="range"
          min={1}
          max={4}
          step={1}
          value={level}
          aria-valuetext={valueText}
          aria-describedby="level-description"
          class="level-slider absolute inset-0"
          onInput={(e) => choose(Number((e.target as HTMLInputElement).value))}
        />
      </div>
      <div class="grid grid-cols-4 text-center" role="group" aria-label="Choose a level">
        {LEVELS.map((l) => {
          const on = l.level === level;
          const off = !available[l.level];
          return (
            <button
              key={l.level}
              type="button"
              onClick={() => choose(l.level)}
              aria-pressed={on}
              aria-label={off ? `${l.name} (coming soon)` : l.name}
              class={`press min-h-7 rounded-full px-1 text-[13px] leading-none transition-colors ${
                on ? 'font-semibold text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {l.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

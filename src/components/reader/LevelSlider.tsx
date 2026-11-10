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
  modern: ModernTranslation;
  /** Levels that have content for this chapter. */
  available: Record<Level, boolean>;
  onChange: (level: Level) => void;
}

export default function LevelSlider({ level, modern, available, onChange }: Props) {
  const info = LEVELS[level - 1]!;
  const valueText = `Level ${level} of 4: ${info.name}`;

  const choose = (n: number) => {
    const next = Math.min(4, Math.max(1, Math.round(n))) as Level;
    onChange(next);
  };

  return (
    <div class="select-none">
      <div class="flex items-baseline justify-between gap-2">
        <label for="level-slider" class="text-sm font-semibold text-ink">
          Reading level
        </label>
        <span class="hidden text-xs text-ink-muted sm:inline">Drag, tap a level, or use arrow keys</span>
      </div>
      <div class="relative mt-2">
        <input
          id="level-slider"
          type="range"
          min={1}
          max={4}
          step={1}
          value={level}
          aria-valuetext={valueText}
          aria-describedby="level-description"
          class="level-slider"
          onInput={(e) => choose(Number((e.target as HTMLInputElement).value))}
        />
        <div class="mt-1 grid grid-cols-4 text-center" role="group" aria-label="Choose a level">
          {LEVELS.map((l) => {
            const on = l.level === level;
            const off = !available[l.level];
            return (
              <button
                key={l.level}
                type="button"
                onClick={() => choose(l.level)}
                aria-pressed={on}
                class={`flex min-h-11 flex-col items-center justify-start rounded-lg px-1 pt-1 text-xs leading-tight ${
                  on ? 'font-semibold text-accent' : off ? 'text-ink-muted' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <span>{l.name}</span>
                {off && <span class="text-[0.65rem] font-normal">Coming soon</span>}
              </button>
            );
          })}
        </div>
      </div>
      <p id="level-description" class="mt-2 text-sm text-ink-muted" aria-live="polite">
        <span class="font-medium text-ink">
          {level}. {info.name}:
        </span>{' '}
        {info.describe(modern)}
      </p>
    </div>
  );
}

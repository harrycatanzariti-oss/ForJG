/**
 * The Settings page. Every change saves immediately to this browser.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { LEVELS } from '~/lib/levels';
import {
  applySettings,
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type Settings,
  type TextSize,
} from '~/lib/settings';
import { exportData, importData, resetData } from '~/lib/storage';
import { url } from '~/lib/url';

const SIZE_LABELS: Record<TextSize, string> = { 1: 'Small', 2: 'Medium', 3: 'Large', 4: 'Extra large' };

export default function SettingsForm() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setS(getSettings()), []);

  const update = (patch: Partial<Settings>) => setS(saveSettings(patch));

  const onExport = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lamplight-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMessage({ kind: 'ok', text: 'Your data was downloaded as a file. Keep it somewhere safe.' });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const result = importData(text);
    if (result.ok) {
      const next = getSettings();
      applySettings(next);
      setS(next);
      setMessage({ kind: 'ok', text: `Restored ${result.count} saved ${result.count === 1 ? 'item' : 'items'}.` });
    } else {
      setMessage({ kind: 'error', text: result.error });
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const onReset = () => {
    const sure = window.confirm(
      'Delete all your progress, highlights, notes and settings from this browser? This cannot be undone. (Tip: export your data first.)',
    );
    if (!sure) return;
    resetData();
    applySettings(DEFAULT_SETTINGS);
    setS(DEFAULT_SETTINGS);
    setMessage({ kind: 'ok', text: 'All data on this device was deleted.' });
  };

  return (
    <div class="space-y-8">
      <Section title="Appearance">
        <Choice
          legend="Theme"
          name="theme"
          value={s.theme}
          options={[
            { value: 'system', label: 'Match my device' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(theme) => update({ theme })}
        />
        <Choice
          legend="Accent colour"
          name="accent"
          value={s.accent}
          options={[
            { value: 'season', label: 'Follow the church year' },
            { value: 'green', label: 'Green' },
            { value: 'purple', label: 'Purple' },
            { value: 'rose', label: 'Rose' },
            { value: 'red', label: 'Red' },
            { value: 'white', label: 'White & gold' },
          ]}
          onChange={(accent) => update({ accent })}
        />
        <p class="-mt-2 text-sm text-ink-muted">
          “Follow the church year” uses the colour of the vestments worn today, at 30% strength.{' '}
          <a href={url('/about#church-colours')}>Why the colour changes</a>
        </p>
        <Choice
          legend="Text size"
          name="textSize"
          value={String(s.textSize)}
          options={([1, 2, 3, 4] as TextSize[]).map((n) => ({ value: String(n), label: SIZE_LABELS[n] }))}
          onChange={(v) => update({ textSize: Number(v) as TextSize })}
        />
        <p class="scripture rounded-xl bg-surface-2 p-4" aria-label="Text size preview">
          <sup class="mr-1 font-sans text-[0.65em] font-semibold text-ink-muted">1</sup>In the beginning God created the
          heavens and the earth.
        </p>
      </Section>

      <Section title="Reading">
        <Choice
          legend="Modern translation (Level 2)"
          name="modernTranslation"
          value={s.modernTranslation}
          options={[
            { value: 'bsb', label: 'Berean Standard Bible (BSB)' },
            { value: 'web', label: 'World English Bible (WEB)' },
          ]}
          onChange={(modernTranslation) => update({ modernTranslation })}
        />
        <label class="flex min-h-11 items-center justify-between gap-4">
          <span>Show verse numbers</span>
          <input
            type="checkbox"
            class="size-6 accent-[var(--accent)]"
            checked={s.verseNumbers}
            onChange={(e) => update({ verseNumbers: (e.target as HTMLInputElement).checked })}
          />
        </label>
        <label class="block">
          <span class="block">Open chapters at</span>
          <select
            class="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink"
            value={String(s.startLevel)}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              update({ startLevel: v === 'last' ? 'last' : (Number(v) as Settings['startLevel']) });
            }}
          >
            <option value="last">The level I used last</option>
            {LEVELS.map((l) => (
              <option key={l.level} value={String(l.level)}>
                Level {l.level}: {l.name}
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section title="Your data">
        <p class="text-ink-muted">
          Everything you save here stays in this browser only. There are no accounts. To move to another phone or
          computer, export your data and import the file there.
        </p>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="btn btn-primary" onClick={onExport}>
            Export my data
          </button>
          <label class="btn btn-secondary cursor-pointer focus-within:outline-3 focus-within:outline-focus">
            Import my data
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              class="sr-only"
              onChange={(e) => void onImport((e.target as HTMLInputElement).files?.[0])}
            />
          </label>
          <button type="button" class="btn btn-secondary text-red-700 dark:text-red-300" onClick={onReset}>
            Delete all my data
          </button>
        </div>
        {message && (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            class={`rounded-xl p-3 ${message.kind === 'error' ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' : 'bg-accent-soft'}`}
          >
            {message.text}
          </p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="card space-y-5 p-5" aria-label={title}>
      <h2 class="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend class="mb-2">{legend}</legend>
      <div class="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            class="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              class="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

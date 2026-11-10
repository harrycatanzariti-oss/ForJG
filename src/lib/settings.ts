/**
 * Reader settings: theme, text size, translations and slider defaults.
 * Stored in localStorage via the safe helper in storage.ts.
 */
import { read, write } from './storage';

export type Theme = 'system' | 'light' | 'dark';
export type TextSize = 1 | 2 | 3 | 4;
export type Level = 1 | 2 | 3 | 4;
export type ModernTranslation = 'bsb' | 'web';

export interface Settings {
  theme: Theme;
  textSize: TextSize;
  modernTranslation: ModernTranslation;
  verseNumbers: boolean;
  /** 'last' means "open chapters at whatever level I used last". */
  startLevel: 'last' | Level;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textSize: 2,
  modernTranslation: 'bsb',
  verseNumbers: true,
  startLevel: 'last',
};

const KEY = 'settings';
const LAST_LEVEL_KEY = 'reader:lastLevel';

const isLevel = (n: unknown): n is Level => n === 1 || n === 2 || n === 3 || n === 4;

/** Reads settings, repairing any missing or invalid values with defaults. */
export function getSettings(): Settings {
  const raw = read<Partial<Settings>>(KEY, {});
  const s = { ...DEFAULT_SETTINGS };
  if (raw && typeof raw === 'object') {
    if (raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'system') s.theme = raw.theme;
    if (isLevel(raw.textSize)) s.textSize = raw.textSize;
    if (raw.modernTranslation === 'bsb' || raw.modernTranslation === 'web') s.modernTranslation = raw.modernTranslation;
    if (typeof raw.verseNumbers === 'boolean') s.verseNumbers = raw.verseNumbers;
    if (raw.startLevel === 'last' || isLevel(raw.startLevel)) s.startLevel = raw.startLevel;
  }
  return s;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  write(KEY, next);
  applySettings(next);
  return next;
}

/** Applies theme and text size to the page (mirrors the inline script in BaseLayout). */
export function applySettings(s: Settings = getSettings()): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark =
    s.theme === 'dark' ||
    (s.theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  root.dataset.textSize = String(s.textSize);
}

/** The level a chapter should open at. */
export function getStartLevel(): Level {
  const s = getSettings();
  if (s.startLevel !== 'last') return s.startLevel;
  const last = read<unknown>(LAST_LEVEL_KEY, 2);
  return isLevel(last) ? last : 2;
}

export function rememberLevel(level: Level): void {
  write(LAST_LEVEL_KEY, level);
}

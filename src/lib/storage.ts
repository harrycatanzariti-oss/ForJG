/**
 * Safe wrapper around the browser's localStorage.
 *
 * All personal data (settings, progress, highlights, notes...) is stored in
 * the visitor's own browser, never on a server. localStorage can be missing
 * or throw an error (private browsing, storage full, blocked cookies), so
 * every read and write here is wrapped in try/catch and falls back safely:
 * the site keeps working, it just will not remember things.
 *
 * Every key is stored with a prefix so we never clash with other sites'
 * code on the same domain, and so export/import/reset know which keys are ours.
 */

export const PREFIX = 'lamplight:';
export const EXPORT_FORMAT = 'lamplight-export';
export const EXPORT_VERSION = 1;
/** Fired on window whenever a value changes, so islands can stay in sync. */
export const CHANGE_EVENT = 'lamplight:storage';

function store(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads a JSON value. Returns `fallback` if missing, unreadable or invalid. */
export function read<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Writes a JSON value. Returns false if the browser refused to save it. */
export function write<T>(key: string, value: T): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(PREFIX + key, JSON.stringify(value));
    notify(key);
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    store()?.removeItem(PREFIX + key);
    notify(key);
  } catch {
    // Nothing we can do; ignore.
  }
}

function notify(key: string) {
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
  } catch {
    // Older browsers without CustomEvent: changes still save, islands just won't live-update.
  }
}

/** All of our keys currently stored, without the prefix. */
export function keys(): string[] {
  try {
    const s = store();
    if (!s) return [];
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out.sort();
  } catch {
    return [];
  }
}

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Collects everything we have stored into one object for "Export my data". */
export function exportData(now = new Date()): ExportFile {
  const data: Record<string, unknown> = {};
  for (const k of keys()) data[k] = read<unknown>(k, null);
  return { format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), data };
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * Restores data from an export file. Existing keys that are not in the file
 * are left alone unless `replace` is true.
 */
export function importData(text: string, { replace = false } = {}): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as ExportFile).format !== EXPORT_FORMAT ||
    typeof (parsed as ExportFile).data !== 'object' ||
    (parsed as ExportFile).data === null
  ) {
    return { ok: false, error: 'That file does not look like an export from this site.' };
  }
  const file = parsed as ExportFile;
  if (file.version > EXPORT_VERSION) {
    return { ok: false, error: 'That file was made by a newer version of this site.' };
  }
  if (!store()) return { ok: false, error: 'Your browser is not allowing this site to save data.' };
  if (replace) resetData();
  let count = 0;
  for (const [k, v] of Object.entries(file.data)) {
    if (typeof k !== 'string' || !/^[\w:.-]+$/.test(k)) continue;
    if (write(k, v)) count++;
  }
  return { ok: true, count };
}

/** Deletes everything this site has stored. */
export function resetData(): void {
  for (const k of keys()) remove(k);
}

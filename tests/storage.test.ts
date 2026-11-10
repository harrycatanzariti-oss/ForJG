import { beforeEach, describe, expect, it, vi } from 'vitest';

/** A minimal in-memory localStorage so the browser code can run under Node. */
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

function installWindow(storage: unknown) {
  vi.stubGlobal('window', {
    localStorage: storage,
    dispatchEvent: () => true,
  });
  vi.stubGlobal(
    'CustomEvent',
    class {
      constructor(
        public type: string,
        public init?: unknown,
      ) {}
    },
  );
}

describe('storage helper', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('reads back what it writes, with a prefix', async () => {
    const mem = new MemoryStorage();
    installWindow(mem);
    const s = await import('../src/lib/storage.ts');
    expect(s.write('a', { x: 1 })).toBe(true);
    expect(s.read('a', null)).toEqual({ x: 1 });
    expect(mem.getItem('lamplight:a')).toBe('{"x":1}');
  });

  it('returns the fallback for corrupt JSON', async () => {
    const mem = new MemoryStorage();
    mem.setItem('lamplight:bad', '{not json');
    installWindow(mem);
    const s = await import('../src/lib/storage.ts');
    expect(s.read('bad', 'fallback')).toBe('fallback');
  });

  it('never throws when storage is blocked', async () => {
    installWindow({
      get length(): number {
        throw new Error('blocked');
      },
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('QuotaExceeded');
      },
      removeItem() {
        throw new Error('blocked');
      },
      key() {
        throw new Error('blocked');
      },
    });
    const s = await import('../src/lib/storage.ts');
    expect(s.read('x', 5)).toBe(5);
    expect(s.write('x', 1)).toBe(false);
    expect(s.keys()).toEqual([]);
    expect(() => s.resetData()).not.toThrow();
  });

  it('works on the server where there is no window', async () => {
    const s = await import('../src/lib/storage.ts');
    expect(s.read('x', 'fallback')).toBe('fallback');
    expect(s.write('x', 1)).toBe(false);
  });

  it('exports and imports all data', async () => {
    const mem = new MemoryStorage();
    installWindow(mem);
    const s = await import('../src/lib/storage.ts');
    s.write('settings', { theme: 'dark' });
    s.write('progress', { john: [1, 2, 3] });
    mem.setItem('someone-else', 'untouched');
    const file = s.exportData(new Date('2026-01-01T00:00:00Z'));
    expect(file).toEqual({
      format: 'lamplight-export',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: { progress: { john: [1, 2, 3] }, settings: { theme: 'dark' } },
    });

    s.resetData();
    expect(s.keys()).toEqual([]);
    expect(mem.getItem('someone-else')).toBe('untouched');

    const result = s.importData(JSON.stringify(file));
    expect(result).toEqual({ ok: true, count: 2 });
    expect(s.read('progress', null)).toEqual({ john: [1, 2, 3] });
  });

  it('rejects files that are not exports', async () => {
    installWindow(new MemoryStorage());
    const s = await import('../src/lib/storage.ts');
    expect(s.importData('nope').ok).toBe(false);
    expect(s.importData('{"hello":1}').ok).toBe(false);
    expect(s.importData(JSON.stringify({ format: 'lamplight-export', version: 99, data: {} })).ok).toBe(false);
  });
});

describe('settings', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('repairs invalid stored values with defaults', async () => {
    const mem = new MemoryStorage();
    mem.setItem('lamplight:settings', JSON.stringify({ theme: 'purple', textSize: 9, verseNumbers: false }));
    installWindow(mem);
    const { getSettings, DEFAULT_SETTINGS } = await import('../src/lib/settings.ts');
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, verseNumbers: false });
  });

  it('opens at the last level used unless a fixed start level is set', async () => {
    installWindow(new MemoryStorage());
    const s = await import('../src/lib/settings.ts');
    expect(s.getStartLevel()).toBe(2);
    s.rememberLevel(1);
    expect(s.getStartLevel()).toBe(1);
    s.saveSettings({ startLevel: 4 });
    expect(s.getStartLevel()).toBe(4);
  });
});

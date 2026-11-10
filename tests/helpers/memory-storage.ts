import { vi } from 'vitest';

/** A minimal in-memory localStorage so browser code can run under Node. */
export class MemoryStorage {
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

export function installBrowser(storage: unknown = new MemoryStorage()) {
  vi.stubGlobal('window', { localStorage: storage, dispatchEvent: () => true });
  vi.stubGlobal(
    'CustomEvent',
    class {
      constructor(
        public type: string,
        public init?: unknown,
      ) {}
    },
  );
  return storage;
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installBrowser } from './helpers/memory-storage';

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  installBrowser();
});

describe('streaks', () => {
  it('counts consecutive days and the longest run', async () => {
    const { computeStreaks } = await import('../src/lib/progress.ts');
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-10', '2026-01-11'];
    expect(computeStreaks(days, '2026-01-11')).toEqual({ current: 2, longest: 3 });
  });

  it('keeps the current streak alive until the end of today', async () => {
    const { computeStreaks } = await import('../src/lib/progress.ts');
    expect(computeStreaks(['2026-03-09', '2026-03-10'], '2026-03-11').current).toBe(2);
    expect(computeStreaks(['2026-03-08', '2026-03-09'], '2026-03-11').current).toBe(0);
  });

  it('handles month and daylight-saving boundaries', async () => {
    const { computeStreaks } = await import('../src/lib/progress.ts');
    expect(
      computeStreaks(['2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01'], '2026-04-01'),
    ).toEqual({
      current: 5,
      longest: 5,
    });
  });
});

describe('marking chapters', () => {
  it('marks, un-marks and records the day', async () => {
    const p = await import('../src/lib/progress.ts');
    const day = new Date(2026, 4, 1, 12);
    p.markRead('john', 3, day);
    p.markRead('john', 1, day);
    p.markRead('john', 3, day); // no double counting
    expect(p.getReadMap()).toEqual({ john: [1, 3] });
    expect(p.totalRead()).toBe(2);
    expect(p.getStreaks('2026-05-01')).toEqual({ current: 1, longest: 1 });
    p.markUnread('john', 1, day);
    p.markUnread('john', 3, day);
    expect(p.getReadMap()).toEqual({});
    expect(p.getStreaks('2026-05-01')).toEqual({ current: 0, longest: 0 });
  });
});

describe('annotations', () => {
  it('stores highlights and notes and removes empty entries', async () => {
    const a = await import('../src/lib/annotations.ts');
    a.setAnnotation('john', 3, 16, { colour: 'yellow' });
    a.setAnnotation('john', 3, 16, { note: '  Remember this  ' });
    expect(a.chapterAnnotations('john', 3)[16]).toMatchObject({ colour: 'yellow', note: 'Remember this' });
    a.setAnnotation('john', 3, 16, { colour: null });
    a.setAnnotation('john', 3, 16, { note: '' });
    expect(a.chapterAnnotations('john', 3)).toEqual({});
  });

  it('keeps chapters separate', async () => {
    const a = await import('../src/lib/annotations.ts');
    a.setAnnotation('john', 3, 1, { colour: 'blue' });
    a.setAnnotation('john', 4, 1, { colour: 'pink' });
    expect(Object.keys(a.chapterAnnotations('john', 3))).toEqual(['1']);
  });
});

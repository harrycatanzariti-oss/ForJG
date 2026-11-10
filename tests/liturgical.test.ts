import { describe, expect, it } from 'vitest';
import { adventSunday, easterSunday, liturgicalDay } from '../src/lib/liturgical.js';

const on = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return liturgicalDay(new Date(y!, m! - 1, d!));
};
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('church calendar', () => {
  it('calculates Easter correctly', () => {
    expect(['2024', '2025', '2026', '2027', '2030'].map((y) => ymd(easterSunday(Number(y))))).toEqual([
      '2024-03-31',
      '2025-04-20',
      '2026-04-05',
      '2027-03-28',
      '2030-04-21',
    ]);
  });

  it('finds the first Sunday of Advent', () => {
    expect(ymd(adventSunday(2025))).toBe('2025-11-30');
    expect(ymd(adventSunday(2026))).toBe('2026-11-29');
  });

  it.each([
    ['2026-11-10', 'green', 'Ordinary Time', undefined],
    ['2026-11-22', 'white', 'Ordinary Time', 'Christ the King'],
    ['2026-11-29', 'purple', 'Advent', undefined],
    ['2026-12-13', 'rose', 'Advent', 'Gaudete Sunday'],
    ['2026-12-25', 'white', 'Christmas', undefined],
    ['2027-01-02', 'white', 'Christmas', undefined],
    ['2026-02-18', 'purple', 'Lent', 'Ash Wednesday'],
    ['2026-03-15', 'rose', 'Lent', 'Laetare Sunday'],
    ['2026-03-29', 'red', 'Holy Week', 'Palm Sunday'],
    ['2026-04-02', 'white', 'Holy Week', 'Maundy Thursday'],
    ['2026-04-03', 'red', 'Holy Week', 'Good Friday'],
    ['2026-04-05', 'white', 'Easter', 'Easter Sunday'],
    ['2026-04-20', 'white', 'Easter', undefined],
    ['2026-05-24', 'red', 'Pentecost', 'Pentecost'],
    ['2026-05-31', 'white', 'Ordinary Time', 'Trinity Sunday'],
    ['2026-07-15', 'green', 'Ordinary Time', undefined],
    ['2026-11-01', 'white', 'Ordinary Time', 'All Saints'],
    ['2026-06-29', 'red', 'Ordinary Time', 'Saints Peter and Paul'],
  ])('%s is %s (%s)', (date, colour, season, day) => {
    expect(on(date)).toEqual({ colour, season, ...(day ? { day } : {}) });
  });

  it('gives every day of a year a colour', () => {
    for (let i = 0; i < 366; i++) {
      const r = liturgicalDay(new Date(2026, 0, 1 + i));
      expect(['green', 'purple', 'rose', 'red', 'white']).toContain(r.colour);
    }
  });
});

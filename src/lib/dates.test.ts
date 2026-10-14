import { describe, expect, it } from 'vitest';
import {
  addDays, dateToDay, dayToDate, diffDays, dueTone, formatShort,
  isValidDay, resolveDayMonth, toDayKey, vnStartOfDay, weekStart,
} from './dates';

describe('dates', () => {
  it('toDayKey uses Vietnam time', () => {
    // 2026-10-03 18:30 UTC is 2026-10-04 01:30 in VN
    expect(toDayKey(new Date('2026-10-03T18:30:00Z'))).toBe('2026-10-04');
  });
  it('dayToDate/dateToDay round-trip', () => {
    expect(dateToDay(dayToDate('2026-02-28'))).toBe('2026-02-28');
  });
  it('addDays crosses months', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
  });
  it('diffDays', () => {
    expect(diffDays('2026-10-06', '2026-10-03')).toBe(3);
    expect(diffDays('2026-09-30', '2026-10-03')).toBe(-3);
  });
  it('weekStart is Monday', () => {
    expect(weekStart('2026-10-04')).toBe('2026-09-28'); // Sunday -> previous Monday
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
  });
  it('vnStartOfDay is midnight +07:00', () => {
    expect(vnStartOfDay('2026-10-04').toISOString()).toBe('2026-10-03T17:00:00.000Z');
  });
  it('resolveDayMonth uses current year', () => {
    expect(resolveDayMonth(5, 10, null, '2026-10-03')).toBe('2026-10-05');
    expect(resolveDayMonth(30, 9, null, '2026-10-03')).toBe('2026-09-30');
  });
  it('resolveDayMonth rolls to next year when >60 days in the past', () => {
    expect(resolveDayMonth(5, 1, null, '2026-12-20')).toBe('2027-01-05');
  });
  it('resolveDayMonth honours explicit year and rejects invalid dates', () => {
    expect(resolveDayMonth(5, 1, 2026, '2026-12-20')).toBe('2026-01-05');
    expect(resolveDayMonth(31, 2, null, '2026-10-03')).toBeNull();
    expect(resolveDayMonth(32, 10, null, '2026-10-03')).toBeNull();
    expect(resolveDayMonth(1, 13, null, '2026-10-03')).toBeNull();
  });
  it('formatShort', () => {
    expect(formatShort('2026-10-05')).toBe('5/10');
  });
  it('dueTone', () => {
    expect(dueTone('2026-10-02', '2026-10-03')).toBe('overdue');
    expect(dueTone('2026-10-05', '2026-10-03')).toBe('soon');
    expect(dueTone('2026-10-06', '2026-10-03')).toBe('normal');
  });
});

describe('isValidDay', () => {
  it('accepts real calendar days', () => {
    expect(isValidDay('2026-10-04')).toBe(true);
    expect(isValidDay('2028-02-29')).toBe(true);
  });
  it('rejects impossible dates, bad shapes and non-strings', () => {
    for (const v of ['2026-13-45', '2026-02-31', '2026-02-29', '2026-1-01', '20261004', '', ' 2026-10-04', undefined, null, 20261004, ['2026-10-04']]) {
      expect(isValidDay(v), String(v)).toBe(false);
    }
  });
});

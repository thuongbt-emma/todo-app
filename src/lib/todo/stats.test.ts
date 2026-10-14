import { describe, expect, it } from 'vitest';
import { buildStats, customRange, presetRange } from './stats';

describe('buildStats', () => {
  const s = buildStats({
    from: '2026-09-28',
    to: '2026-10-11',
    steps: [
      { doneAt: new Date('2026-09-29T03:00:00Z'), dueDate: '2026-09-30', tags: ['posm'] },
      { doneAt: new Date('2026-10-01T03:00:00Z'), dueDate: '2026-09-30', tags: ['posm', 'event'] },
      { doneAt: new Date('2026-10-06T03:00:00Z'), dueDate: null, tags: [] },
    ],
    cards: [{ completedAt: new Date('2026-10-06T04:00:00Z'), tags: ['posm'], hasSteps: true }],
    openOverdue: 2,
  });

  it('counts totals and late', () => {
    expect([s.stepsDone, s.cardsDone, s.lateDone, s.openOverdue]).toEqual([3, 1, 1, 2]);
  });
  it('zero-fills every week in range', () => {
    expect(s.perWeek).toEqual([
      { week: '2026-09-28', label: '28/9', steps: 2, cards: 0 },
      { week: '2026-10-05', label: '5/10', steps: 1, cards: 1 },
    ]);
  });
  it('ranks tags', () => {
    expect(s.topTags).toEqual([{ name: 'posm', count: 2 }, { name: 'event', count: 1 }]);
  });
  it('counts a completed card without steps once per tag', () => {
    const r = buildStats({
      from: '2026-09-28',
      to: '2026-10-04',
      steps: [{ doneAt: new Date('2026-09-29T03:00:00Z'), dueDate: null, tags: ['posm'] }],
      cards: [
        { completedAt: new Date('2026-09-30T03:00:00Z'), tags: ['posm', 'event'], hasSteps: false },
        { completedAt: new Date('2026-09-30T03:00:00Z'), tags: ['posm'], hasSteps: true },
      ],
      openOverdue: 0,
    });
    expect(r.topTags).toEqual([{ name: 'posm', count: 2 }, { name: 'event', count: 1 }]);
  });
});

describe('presetRange', () => {
  it('week', () => expect(presetRange('week', '2026-10-04')).toEqual({ from: '2026-09-28', to: '2026-10-04' }));
  it('month', () => expect(presetRange('month', '2026-10-04')).toEqual({ from: '2026-10-01', to: '2026-10-31' }));
  it('quarter', () => expect(presetRange('quarter', '2026-11-15')).toEqual({ from: '2026-10-01', to: '2026-12-31' }));
});

describe('customRange', () => {
  it('accepts a valid range up to 731 days', () => {
    expect(customRange('2026-01-01', '2026-01-01')).toEqual({ from: '2026-01-01', to: '2026-01-01' });
    expect(customRange('2025-01-01', '2026-12-31')).toEqual({ from: '2025-01-01', to: '2026-12-31' }); // 730 days
    expect(customRange('2024-01-01', '2025-12-31')).toEqual({ from: '2024-01-01', to: '2025-12-31' }); // 731 days
  });
  it('rejects ranges over 731 days, reversed or invalid', () => {
    expect(customRange('2024-01-01', '2026-01-01')).toBeNull(); // 732 days
    expect(customRange('2026-10-05', '2026-10-04')).toBeNull();
    expect(customRange('2026-02-31', '2026-03-01')).toBeNull();
    expect(customRange(undefined, '2026-03-01')).toBeNull();
  });
});

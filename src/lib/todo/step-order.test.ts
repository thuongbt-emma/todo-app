import { describe, expect, it } from 'vitest';
import { canReorder, reorderTarget, sortStepsForDisplay, stepBucket } from './step-order';

type S = { id: string; order: number; dueDate: Date | string | null; doneAt: Date | string | null };
const s = (id: string, order: number, dueDate: Date | string | null = null, doneAt: Date | string | null = null): S => ({ id, order, dueDate, doneAt });
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

describe('sortStepsForDisplay', () => {
  it('puts dated open steps first by due day (overdue naturally first), then undated by order, then done', () => {
    const steps = [
      s('undated2', 2000),
      s('done', 500, day('2026-10-01'), new Date('2026-10-10T03:00:00Z')),
      s('due20', 3000, day('2026-10-20')),
      s('undated1', 1000),
      s('overdue', 4000, day('2026-10-02')),
      s('due15', 100, '2026-10-15'),
    ];
    expect(ids(sortStepsForDisplay(steps))).toEqual(['overdue', 'due15', 'due20', 'undated1', 'undated2', 'done']);
  });

  it('breaks same-day ties by order', () => {
    const steps = [s('b', 2000, day('2026-10-15')), s('a', 1000, '2026-10-15T00:00:00.000Z'), s('c', 1500, day('2026-10-15'))];
    expect(ids(sortStepsForDisplay(steps))).toEqual(['a', 'c', 'b']);
  });

  it('orders done steps by doneAt (earliest ticked first), ties by order', () => {
    const t = '2026-10-12T05:00:00.000Z';
    const steps = [
      s('late', 1000, null, new Date('2026-10-13T01:00:00Z')),
      s('tieB', 3000, null, t),
      s('early', 4000, day('2026-10-01'), new Date('2026-10-11T01:00:00Z')),
      s('tieA', 2000, null, new Date(t)),
    ];
    expect(ids(sortStepsForDisplay(steps))).toEqual(['early', 'tieA', 'tieB', 'late']);
  });

  it('does not mutate its input', () => {
    const steps = [s('b', 2000), s('a', 1000)];
    sortStepsForDisplay(steps);
    expect(ids(steps)).toEqual(['b', 'a']);
  });
});

describe('stepBucket / canReorder', () => {
  const steps = [
    s('d1', 1000, day('2026-10-15')),
    s('d2', 2000, '2026-10-15'),
    s('d3', 3000, day('2026-10-16')),
    s('u1', 4000),
    s('u2', 5000),
    s('x1', 6000, null, '2026-10-12T05:00:00.000Z'),
    s('x2', 7000, day('2026-10-15'), new Date('2026-10-12T05:00:00.000Z')),
    s('x3', 8000, null, '2026-10-13T05:00:00.000Z'),
  ];

  it('groups by open+due day, open undated, done', () => {
    expect(stepBucket(steps[0])).toBe(stepBucket(steps[1]));
    expect(stepBucket(steps[0])).not.toBe(stepBucket(steps[2]));
    expect(stepBucket(steps[3])).toBe(stepBucket(steps[4]));
    expect(stepBucket(steps[5])).toMatch(/^done/);
  });

  it('allows reordering within the same bucket only', () => {
    expect(canReorder(steps, 'd1', 'd2')).toBe(true);
    expect(canReorder(steps, 'u2', 'u1')).toBe(true);
    expect(canReorder(steps, 'd1', 'd3')).toBe(false);
    expect(canReorder(steps, 'u1', 'd2')).toBe(false);
    expect(canReorder(steps, 'u1', 'x1')).toBe(false);
    expect(canReorder(steps, 'x1', 'u1')).toBe(false);
  });

  it('done steps only reorder among steps ticked at the same moment (the rest is fixed by doneAt)', () => {
    expect(canReorder(steps, 'x1', 'x2')).toBe(true);
    expect(canReorder(steps, 'x1', 'x3')).toBe(false);
  });

  it('rejects unknown ids and no-ops', () => {
    expect(canReorder(steps, 'u1', 'u1')).toBe(false);
    expect(canReorder(steps, 'nope', 'u1')).toBe(false);
  });
});

describe('reorderTarget', () => {
  const steps = [
    s('d1', 1000, day('2026-10-15')),
    s('u1', 1500),
    s('d2', 2000, day('2026-10-15')),
    s('d3', 2500, day('2026-10-15')),
    s('u2', 3000),
    s('u3', 4000),
    s('u4', 5000),
    s('x1', 3500, null, '2026-10-12T05:00:00.000Z'),
  ];

  it('within the undated bucket: moving down lands right after the drop target, between bucket neighbours', () => {
    // undated display list: u1(1500) u2(3000) u3(4000) u4(5000); x1(3500, done) is ignored
    expect(reorderTarget(steps, 'u1', 'u3')).toEqual({ order: 4500 });
  });

  it('within the undated bucket: moving up lands right before the drop target', () => {
    expect(reorderTarget(steps, 'u4', 'u2')).toEqual({ order: 2250 }); // between u1 1500 and u2 3000
  });

  it('within the undated bucket: first and last positions extend past the bucket edge', () => {
    expect(reorderTarget(steps, 'u3', 'u1')).toEqual({ order: 500 });
    expect(reorderTarget(steps, 'u1', 'u4')).toEqual({ order: 6000 });
  });

  it('within a same-date bucket uses only that date\'s steps as neighbours', () => {
    // 15/10 list: d1(1000) d2(2000) d3(2500) — u1(1500) sits between them by order but is another bucket
    expect(reorderTarget(steps, 'd3', 'd2')).toEqual({ order: 1500 }); // between d1 and d2
    expect(reorderTarget(steps, 'd1', 'd2')).toEqual({ order: 2250 }); // between d2 and d3
  });

  it('rejects cross-bucket drops, no-ops and unknown ids', () => {
    expect(reorderTarget(steps, 'u1', 'd2')).toBeNull();
    expect(reorderTarget(steps, 'd1', 'x1')).toBeNull();
    expect(reorderTarget(steps, 'u1', 'u1')).toBeNull();
    expect(reorderTarget(steps, 'zz', 'u1')).toBeNull();
  });
});

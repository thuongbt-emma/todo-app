import { describe, expect, it } from 'vitest';
import { bucketOf } from './agenda';

describe('bucketOf', () => {
  const T = '2026-10-03';
  it.each([
    [null, 'none'],
    ['2026-10-02', 'overdue'],
    ['2026-10-03', 'today'],
    ['2026-10-04', 'week'],
    ['2026-10-10', 'week'],
    ['2026-10-11', 'later'],
  ] as const)('%s -> %s', (due, bucket) => expect(bucketOf(due, T)).toBe(bucket));
});

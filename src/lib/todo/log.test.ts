import { describe, expect, it } from 'vitest';
import { groupLog, type LogEntry } from './log';

const e = (id: string, day: string, iso: string): LogEntry => ({
  kind: 'step', id, cardId: 'c', text: id, cardTitle: 'C', doneAt: new Date(iso), day,
});

describe('groupLog', () => {
  const entries = [e('a', '2026-10-04', '2026-10-04T02:00:00Z'), e('b', '2026-10-01', '2026-10-01T02:00:00Z'), e('c', '2026-09-27', '2026-09-27T02:00:00Z')];
  it('by day, newest first', () => {
    expect(groupLog(entries, 'day').map((g) => g.key)).toEqual(['2026-10-04', '2026-10-01', '2026-09-27']);
  });
  it('by week keyed by Monday', () => {
    const groups = groupLog(entries, 'week');
    expect(groups.map((g) => [g.key, g.entries.length])).toEqual([['2026-09-28', 2], ['2026-09-21', 1]]);
  });
});

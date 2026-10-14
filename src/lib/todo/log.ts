import { weekStart } from '@/lib/dates';

export type LogEntry = {
  kind: 'step' | 'card';
  id: string;
  cardId: string;
  text: string;
  cardTitle: string;
  doneAt: Date;
  day: string;
};

export function groupLog(entries: LogEntry[], by: 'day' | 'week'): { key: string; entries: LogEntry[] }[] {
  const map = new Map<string, LogEntry[]>();
  for (const entry of [...entries].sort((a, b) => b.doneAt.getTime() - a.doneAt.getTime())) {
    const key = by === 'day' ? entry.day : weekStart(entry.day);
    map.set(key, [...(map.get(key) ?? []), entry]);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, list]) => ({ key, entries: list }));
}

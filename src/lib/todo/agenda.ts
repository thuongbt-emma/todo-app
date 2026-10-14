import { diffDays } from '@/lib/dates';

export type AgendaBucket = 'overdue' | 'today' | 'week' | 'later' | 'none';

export const AGENDA_BUCKETS: { key: AgendaBucket; label: string }[] = [
  { key: 'overdue', label: 'Quá hạn' },
  { key: 'today', label: 'Hôm nay' },
  { key: 'week', label: '7 ngày tới' },
  { key: 'later', label: 'Sau đó' },
  { key: 'none', label: 'Không có ngày' },
];

export function bucketOf(due: string | null, today: string): AgendaBucket {
  if (!due) return 'none';
  const diff = diffDays(due, today);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'week';
  return 'later';
}

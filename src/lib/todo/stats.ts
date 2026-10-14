import { addDays, diffDays, formatShort, isValidDay, toDayKey, weekStart } from '@/lib/dates';

export type StatsInput = {
  from: string;
  to: string;
  steps: { doneAt: Date; dueDate: string | null; tags: string[] }[];
  /** hasSteps: the card has at least one non-deleted step */
  cards: { completedAt: Date; tags: string[]; hasSteps: boolean }[];
  openOverdue: number;
};

export type Stats = {
  stepsDone: number;
  cardsDone: number;
  lateDone: number;
  openOverdue: number;
  perWeek: { week: string; label: string; steps: number; cards: number }[];
  topTags: { name: string; count: number }[];
};

export function buildStats({ from, to, steps, cards, openOverdue }: StatsInput): Stats {
  const weeks = new Map<string, { steps: number; cards: number }>();
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.set(w, { steps: 0, cards: 0 });

  let lateDone = 0;
  const tagCount = new Map<string, number>();
  for (const s of steps) {
    const day = toDayKey(s.doneAt);
    const bucket = weeks.get(weekStart(day));
    if (bucket) bucket.steps++;
    if (s.dueDate && day > s.dueDate) lateDone++;
    for (const t of s.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  for (const c of cards) {
    const bucket = weeks.get(weekStart(toDayKey(c.completedAt)));
    if (bucket) bucket.cards++;
    // A card done without steps still counts once per tag, so tag stats reflect "việc xong".
    if (!c.hasSteps) for (const t of c.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }

  return {
    stepsDone: steps.length,
    cardsDone: cards.length,
    lateDone,
    openOverdue,
    perWeek: [...weeks.entries()].map(([week, v]) => ({ week, label: formatShort(week), ...v })),
    topTags: [...tagCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8),
  };
}

export type RangePreset = 'week' | 'month' | 'quarter';

function lastDayOfMonth(year: number, month: number): string {
  // month is 1-based; day 0 of next month = last day of this month
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

export function presetRange(preset: RangePreset, today: string): { from: string; to: string } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  if (preset === 'week') return { from: weekStart(today), to: today };
  if (preset === 'month') return { from: `${year}-${pad(month)}-01`, to: lastDayOfMonth(year, month) };
  const first = Math.floor((month - 1) / 3) * 3 + 1;
  return { from: `${year}-${pad(first)}-01`, to: lastDayOfMonth(year, first + 2) };
}

/** Longest custom stats range, in days inclusive (two years incl. a leap day). */
export const MAX_RANGE_DAYS = 731;

/** A user-supplied range, or null (caller falls back to the preset) if invalid, reversed or too long. */
export function customRange(from: unknown, to: unknown): { from: string; to: string } | null {
  if (!isValidDay(from) || !isValidDay(to) || from > to) return null;
  if (diffDays(to, from) + 1 > MAX_RANGE_DAYS) return null;
  return { from, to };
}

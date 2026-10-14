import { dateToDay } from '@/lib/dates';
import { between } from '@/lib/order';

/** What the step display order needs. Dates may arrive as Date (server) or ISO / YYYY-MM-DD strings. */
export type SortableStep = { id: string; order: number; dueDate: Date | string | null; doneAt: Date | string | null };

/** Calendar day of a @db.Date value (stored as UTC midnight, so the UTC date is the VN day). */
const dueDay = (d: Date | string): string => (typeof d === 'string' ? d.slice(0, 10) : dateToDay(d));
const doneTime = (d: Date | string): number => new Date(d).getTime();

/**
 * The group a step's position is decided within: open steps due the same day, open steps without a due date,
 * or done steps ticked at the same instant. Across groups the display order is fixed (date / doneAt), so
 * `order` only matters inside one.
 */
export function stepBucket(s: SortableStep): string {
  if (s.doneAt) return `done:${doneTime(s.doneAt)}`;
  return s.dueDate ? `due:${dueDay(s.dueDate)}` : 'open';
}

const rank = (s: SortableStep) => (s.doneAt ? 2 : s.dueDate ? 0 : 1);

/**
 * Display order for a card's steps: open steps with a due date (earliest day first, so overdue lead),
 * then open steps without one, then done steps (earliest ticked first). Ties fall back to `order`.
 */
export function sortStepsForDisplay<T extends SortableStep>(steps: readonly T[]): T[] {
  return [...steps].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.doneAt && b.doneAt) {
      const t = doneTime(a.doneAt) - doneTime(b.doneAt);
      if (t) return t;
    } else if (a.dueDate && b.dueDate) {
      const da = dueDay(a.dueDate);
      const db = dueDay(b.dueDate);
      if (da !== db) return da < db ? -1 : 1;
    }
    return a.order - b.order;
  });
}

/** Whether dragging `activeId` onto `overId` can change anything: both must be in the same bucket. */
export function canReorder(steps: readonly SortableStep[], activeId: string, overId: string): boolean {
  if (activeId === overId) return false;
  const a = steps.find((s) => s.id === activeId);
  const o = steps.find((s) => s.id === overId);
  return !!a && !!o && stepBucket(a) === stepBucket(o);
}

/**
 * New sort key for dragging step `activeId` onto `overId` within one card (null when the drop is a no-op or
 * crosses buckets). Moving down lands directly after the target, moving up directly before it; the neighbours
 * are taken from the target's bucket only, so steps in other buckets (or hidden done steps) never interfere.
 */
export function reorderTarget(steps: readonly SortableStep[], activeId: string, overId: string): { order: number } | null {
  if (!canReorder(steps, activeId, overId)) return null;
  const key = stepBucket(steps.find((s) => s.id === activeId)!);
  const bucket = sortStepsForDisplay(steps.filter((s) => stepBucket(s) === key));
  const from = bucket.findIndex((s) => s.id === activeId);
  const to = bucket.findIndex((s) => s.id === overId);
  const rest = bucket.filter((s) => s.id !== activeId);
  const anchor = rest.findIndex((s) => s.id === overId);
  const index = to > from ? anchor + 1 : anchor;
  return { order: between(rest[index - 1]?.order ?? null, rest[index]?.order ?? null) };
}

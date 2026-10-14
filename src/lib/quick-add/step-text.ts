import { dateToDay, formatShort, resolveDayMonth, todayVN } from '@/lib/dates';

export type StepTextInput = {
  text: string;
  person: string | { name: string } | null;
  dueDate: string | Date | null;
};

/**
 * The quick-add text for an existing step ("text @person d/m"), so editing it inline and
 * saving unchanged gives back the same step via parseStep. The year is added only when
 * "d/m" alone would resolve to a different year.
 */
export function stepToText(step: StepTextInput, today: string = todayVN()): string {
  const person = typeof step.person === 'string' ? step.person : step.person?.name ?? null;
  const day = step.dueDate instanceof Date ? dateToDay(step.dueDate) : step.dueDate;
  let out = step.text;
  if (person) out += ` @${person}`;
  if (day) {
    const [y, m, d] = day.split('-').map(Number);
    out += ` ${formatShort(day)}`;
    if (resolveDayMonth(d, m, null, today) !== day) out += `/${y}`;
  }
  return out;
}

import 'server-only';
import { prisma } from '@/lib/db';
import { addDays, dateToDay, dayToDate, vnStartOfDay } from '@/lib/dates';
import { buildStats, type Stats } from './stats';

export async function getStats(from: string, to: string, today: string): Promise<Stats> {
  const range = { gte: vnStartOfDay(from), lt: vnStartOfDay(addDays(to, 1)) };
  const [steps, cards, openOverdue] = await Promise.all([
    prisma.step.findMany({
      where: { doneAt: range, deletedAt: null, card: { deletedAt: null } },
      select: { doneAt: true, dueDate: true, card: { select: { tags: { select: { tag: { select: { name: true } } } } } } },
    }),
    prisma.card.findMany({
      where: { completedAt: range, deletedAt: null },
      select: {
        completedAt: true,
        tags: { select: { tag: { select: { name: true } } } },
        _count: { select: { steps: { where: { deletedAt: null } } } },
      },
    }),
    prisma.step.count({
      where: { doneAt: null, deletedAt: null, dueDate: { lt: dayToDate(today) }, card: { completedAt: null, deletedAt: null } },
    }),
  ]);
  return buildStats({
    from,
    to,
    steps: steps.map((s) => ({
      doneAt: s.doneAt!,
      dueDate: s.dueDate ? dateToDay(s.dueDate) : null,
      tags: s.card.tags.map((t) => t.tag.name),
    })),
    cards: cards.map((c) => ({
      completedAt: c.completedAt!,
      tags: c.tags.map((t) => t.tag.name),
      hasSteps: c._count.steps > 0,
    })),
    openOverdue,
  });
}

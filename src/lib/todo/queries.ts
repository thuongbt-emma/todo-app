import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { addDays, dateToDay, toDayKey, vnStartOfDay } from '@/lib/dates';
import { bucketOf, type AgendaBucket } from './agenda';
import type { LogEntry } from './log';

export type Filter = { tagIds: string[]; personIds: string[] };

export function parseFilter(sp: Record<string, string | string[] | undefined>): Filter {
  const list = (key: string) => {
    const v = sp[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s ? s.split(',').filter(Boolean) : [];
  };
  return { tagIds: list('tags'), personIds: list('people') };
}

function cardWhere(f: Filter): Prisma.CardWhereInput {
  return {
    completedAt: null,
    deletedAt: null,
    ...(f.tagIds.length ? { tags: { some: { tagId: { in: f.tagIds } } } } : {}),
    ...(f.personIds.length ? { steps: { some: { personId: { in: f.personIds }, doneAt: null, deletedAt: null } } } : {}),
  };
}

export const cardInclude = {
  tags: { include: { tag: true } },
  steps: { where: { deletedAt: null }, orderBy: { order: 'asc' }, include: { person: true } },
} satisfies Prisma.CardInclude;

export type CardWithRelations = Prisma.CardGetPayload<{ include: typeof cardInclude }>;

export async function getBoard(f: Filter) {
  return prisma.group.findMany({
    orderBy: { order: 'asc' },
    include: { cards: { where: cardWhere(f), orderBy: { order: 'asc' }, include: cardInclude } },
  });
}

export type BoardGroup = Awaited<ReturnType<typeof getBoard>>[number];

export async function getCard(id: string) {
  return prisma.card.findFirst({ where: { id, deletedAt: null }, include: cardInclude });
}

export async function getTaxonomy() {
  const [groups, tags, people] = await Promise.all([
    prisma.group.findMany({ orderBy: { order: 'asc' } }),
    prisma.tag.findMany({ orderBy: { name: 'asc' } }),
    prisma.person.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return { groups, tags, people };
}

export type AgendaItem = {
  stepId: string;
  text: string;
  dueDate: string | null;
  cardId: string;
  cardTitle: string;
  groupColor: string;
  person: string | null;
};

export async function getAgenda(f: Filter, today: string): Promise<Record<AgendaBucket, AgendaItem[]>> {
  const steps = await prisma.step.findMany({
    where: {
      doneAt: null,
      deletedAt: null,
      card: cardWhere(f),
      ...(f.personIds.length ? { personId: { in: f.personIds } } : {}),
    },
    include: { card: { include: { group: true } }, person: true },
    orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { order: 'asc' }],
  });
  const result: Record<AgendaBucket, AgendaItem[]> = { overdue: [], today: [], week: [], later: [], none: [] };
  for (const s of steps) {
    const dueDate = s.dueDate ? dateToDay(s.dueDate) : null;
    result[bucketOf(dueDate, today)].push({
      stepId: s.id,
      text: s.text,
      dueDate,
      cardId: s.cardId,
      cardTitle: s.card.title,
      groupColor: s.card.group.color,
      person: s.person?.name ?? null,
    });
  }
  return result;
}

export async function getLog({ from, to, q }: { from: string; to: string; q: string }): Promise<LogEntry[]> {
  const range = { gte: vnStartOfDay(from), lt: vnStartOfDay(addDays(to, 1)) };
  const search = q.trim();
  const [steps, cards] = await Promise.all([
    prisma.step.findMany({
      where: {
        doneAt: range,
        deletedAt: null,
        card: { deletedAt: null },
        ...(search
          ? { OR: [{ text: { contains: search, mode: 'insensitive' } }, { card: { title: { contains: search, mode: 'insensitive' } } }] }
          : {}),
      },
      include: { card: { select: { title: true } } },
    }),
    prisma.card.findMany({
      where: { completedAt: range, deletedAt: null, ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}) },
    }),
  ]);
  const entries: LogEntry[] = [
    ...steps.map((s) => ({ kind: 'step' as const, id: s.id, cardId: s.cardId, text: s.text, cardTitle: s.card.title, doneAt: s.doneAt!, day: toDayKey(s.doneAt!) })),
    ...cards.map((c) => ({ kind: 'card' as const, id: c.id, cardId: c.id, text: c.title, cardTitle: c.title, doneAt: c.completedAt!, day: toDayKey(c.completedAt!) })),
  ];
  return entries.sort((a, b) => b.doneAt.getTime() - a.doneAt.getTime());
}

export async function getTrash() {
  const [cards, steps, notes] = await Promise.all([
    prisma.card.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } }),
    prisma.step.findMany({
      where: { deletedAt: { not: null }, card: { deletedAt: null } },
      include: { card: { select: { title: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.note.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: 'desc' } }),
  ]);
  return {
    cards: cards.map((c) => ({ id: c.id, title: c.title, deletedAt: c.deletedAt! })),
    steps: steps.map((s) => ({ id: s.id, text: s.text, cardTitle: s.card.title, deletedAt: s.deletedAt! })),
    notes: notes.map((n) => ({ id: n.id, title: n.title, body: n.body, deletedAt: n.deletedAt! })),
  };
}

/** Number of items the Trash section lists (same filters as getTrash). */
export async function getTrashCount(): Promise<number> {
  const counts = await Promise.all([
    prisma.card.count({ where: { deletedAt: { not: null } } }),
    prisma.step.count({ where: { deletedAt: { not: null }, card: { deletedAt: null } } }),
    prisma.note.count({ where: { deletedAt: { not: null } } }),
  ]);
  return counts.reduce((a, b) => a + b, 0);
}

export async function getRecentlyCompleted(now: Date, days = 7) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const cards = await prisma.card.findMany({
    where: { deletedAt: null, completedAt: { gte: since } },
    orderBy: { completedAt: 'desc' },
    include: { group: { select: { name: true, color: true } } },
  });
  return cards.map((c) => ({
    id: c.id,
    title: c.title,
    completedAt: c.completedAt!,
    groupName: c.group.name,
    groupColor: c.group.color,
  }));
}

export async function getUsage(): Promise<{ tags: Record<string, number>; people: Record<string, number>; groups: Record<string, number> }> {
  const [cardTags, noteTags, people, groups] = await Promise.all([
    prisma.cardTag.groupBy({ by: ['tagId'], _count: { _all: true } }),
    prisma.noteTag.groupBy({ by: ['tagId'], _count: { _all: true } }),
    prisma.step.groupBy({ by: ['personId'], where: { personId: { not: null } }, _count: { _all: true } }),
    prisma.card.groupBy({ by: ['groupId'], where: { completedAt: null, deletedAt: null }, _count: { _all: true } }),
  ]);
  const tags: Record<string, number> = {};
  for (const r of [...cardTags, ...noteTags]) tags[r.tagId] = (tags[r.tagId] ?? 0) + r._count._all;
  return {
    tags,
    people: Object.fromEntries(people.map((r) => [r.personId as string, r._count._all])),
    groups: Object.fromEntries(groups.map((r) => [r.groupId, r._count._all])),
  };
}

export async function getOpenCardTitles(): Promise<string[]> {
  const cards = await prisma.card.findMany({ where: { completedAt: null, deletedAt: null }, select: { title: true }, orderBy: { createdAt: 'asc' } });
  return cards.map((c) => c.title);
}

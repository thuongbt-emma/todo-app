import 'server-only';
import { prisma } from '@/lib/db';
import { dayToDate } from '@/lib/dates';
import { between, ORDER_STEP } from '@/lib/order';
import { parseStep, type ParsedCard } from '@/lib/quick-add/parse';
import { pickColor } from './palette';

const openCard = { completedAt: null, deletedAt: null } as const;

async function bottomCardOrder(groupId: string): Promise<number> {
  const last = await prisma.card.findFirst({
    where: { groupId, ...openCard },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return between(last?.order ?? null, null);
}

async function bottomStepOrder(cardId: string): Promise<number> {
  const last = await prisma.step.findFirst({ where: { cardId }, orderBy: { order: 'desc' }, select: { order: true } });
  return between(last?.order ?? null, null);
}

export async function findOrCreateTag(name: string) {
  const existing = await prisma.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) return existing;
  return prisma.tag.create({ data: { name, color: pickColor(await prisma.tag.count()) } });
}

export async function findOrCreatePerson(name: string) {
  const existing = await prisma.person.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (existing) return existing;
  return prisma.person.create({ data: { name, color: pickColor(await prisma.person.count()) } });
}

export type QuickAddReceipt = {
  cardId: string;
  cardTitle: string;
  created: boolean;
  stepIds: string[];
  addedTagIds: string[];
  prevGroupId: string | null;
  prevOrder: number | null;
};

export async function quickAdd(parsed: ParsedCard, defaultGroupId: string): Promise<QuickAddReceipt> {
  if (!parsed.title) throw new Error('Thiếu tiêu đề thẻ');
  const group = parsed.groupName ? await prisma.group.findFirst({ where: { name: parsed.groupName } }) : null;
  const existing = await prisma.card.findFirst({
    where: { title: { equals: parsed.title, mode: 'insensitive' }, ...openCard },
  });

  let cardId: string;
  let cardTitle: string;
  let created: boolean;
  let prevGroupId: string | null = null;
  let prevOrder: number | null = null;
  if (existing) {
    cardId = existing.id;
    cardTitle = existing.title;
    created = false;
    if (group && group.id !== existing.groupId) {
      prevGroupId = existing.groupId;
      prevOrder = existing.order;
      await moveCard(existing.id, group.id, null);
    }
  } else {
    const groupId = group?.id ?? defaultGroupId;
    const card = await prisma.card.create({
      data: { title: parsed.title, groupId, order: await bottomCardOrder(groupId) },
    });
    cardId = card.id;
    cardTitle = card.title;
    created = true;
  }

  const addedTagIds: string[] = [];
  for (const name of parsed.tags) {
    const tag = await findOrCreateTag(name);
    const linked = await prisma.cardTag.findUnique({ where: { cardId_tagId: { cardId, tagId: tag.id } } });
    if (linked) continue;
    await prisma.cardTag.create({ data: { cardId, tagId: tag.id } });
    addedTagIds.push(tag.id);
  }

  const stepIds: string[] = [];
  let order = await bottomStepOrder(cardId);
  for (const s of parsed.steps) {
    const person = s.person ? await findOrCreatePerson(s.person) : null;
    const step = await prisma.step.create({
      data: { cardId, text: s.text, dueDate: s.dueDate ? dayToDate(s.dueDate) : null, personId: person?.id ?? null, order },
    });
    stepIds.push(step.id);
    order += ORDER_STEP;
  }
  return { cardId, cardTitle, created, stepIds, addedTagIds, prevGroupId, prevOrder };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

/**
 * Reverts a quickAdd. The only sanctioned hard delete of cards/steps (spec §2.2), and only for
 * rows still untouched since the add; anything edited meanwhile is soft-deleted into the trash.
 */
export async function undoQuickAdd(r: QuickAddReceipt, now: Date = new Date()) {
  await prisma.$transaction(async (tx) => {
    if (r.created) {
      const card = await tx.card.findUnique({
        where: { id: r.cardId },
        include: { steps: { where: { deletedAt: null }, select: { id: true, doneAt: true } }, tags: { select: { tagId: true } } },
      });
      if (!card) return;
      const untouched =
        card.completedAt === null &&
        card.deletedAt === null &&
        card.title === r.cardTitle &&
        card.note === '' &&
        sameSet(card.steps.map((s) => s.id), r.stepIds) &&
        card.steps.every((s) => s.doneAt === null) &&
        sameSet(card.tags.map((t) => t.tagId), r.addedTagIds);
      if (untouched) await tx.card.delete({ where: { id: r.cardId } });
      else await tx.card.updateMany({ where: { id: r.cardId, deletedAt: null }, data: { deletedAt: now } });
      return;
    }
    const where = { id: { in: r.stepIds }, cardId: r.cardId };
    await tx.step.deleteMany({ where: { ...where, doneAt: null, deletedAt: null } });
    await tx.step.updateMany({ where: { ...where, deletedAt: null }, data: { deletedAt: now } });
    if (r.addedTagIds.length) await tx.cardTag.deleteMany({ where: { cardId: r.cardId, tagId: { in: r.addedTagIds } } });
    if (r.prevGroupId) {
      await tx.card.updateMany({ where: { id: r.cardId }, data: { groupId: r.prevGroupId, order: r.prevOrder ?? 0 } });
    }
  });
}

export async function updateCard(id: string, data: { title?: string; note?: string; tagIds?: string[] }) {
  const { tagIds, ...fields } = data;
  if (fields.title !== undefined && !fields.title.trim()) throw new Error('Tiêu đề không được trống');
  await prisma.$transaction(async (tx) => {
    if (Object.keys(fields).length) await tx.card.update({ where: { id }, data: fields });
    if (tagIds) {
      await tx.cardTag.deleteMany({ where: { cardId: id } });
      if (tagIds.length) await tx.cardTag.createMany({ data: tagIds.map((tagId) => ({ cardId: id, tagId })) });
    }
  });
}

export async function moveCard(id: string, groupId: string, order: number | null) {
  await prisma.card.update({ where: { id }, data: { groupId, order: order ?? (await bottomCardOrder(groupId)) } });
}

export async function completeCard(id: string, now: Date = new Date()) {
  // No-op when already completed. reopenCard relies on steps closed here sharing exactly the
  // card's completedAt (one `now`).
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.card.updateMany({ where: { id, completedAt: null }, data: { completedAt: now } });
    if (!count) return;
    await tx.step.updateMany({ where: { cardId: id, doneAt: null, deletedAt: null }, data: { doneAt: now } });
  });
}

/** Undo of a reopen: completes the card at its original time so log/stats are unchanged. */
export async function completeCardAt(id: string, at: Date) {
  await completeCard(id, at);
}

export async function reopenCard(id: string) {
  const card = await prisma.card.findUniqueOrThrow({ where: { id } });
  if (!card.completedAt) return;
  await prisma.$transaction([
    prisma.step.updateMany({ where: { cardId: id, deletedAt: null, doneAt: card.completedAt }, data: { doneAt: null } }),
    prisma.card.update({ where: { id }, data: { completedAt: null } }),
  ]);
}

export async function softDeleteCard(id: string, now: Date = new Date()) {
  await prisma.card.update({ where: { id }, data: { deletedAt: now } });
}

export async function restoreCard(id: string) {
  await prisma.card.update({ where: { id }, data: { deletedAt: null } });
}

export async function addStep(cardId: string, data: { text: string; dueDate: string | null; personId: string | null }) {
  if (!data.text.trim()) throw new Error('Bước không được trống');
  return prisma.step.create({
    data: {
      cardId,
      text: data.text.trim(),
      dueDate: data.dueDate ? dayToDate(data.dueDate) : null,
      personId: data.personId,
      order: await bottomStepOrder(cardId),
    },
  });
}

export async function updateStep(id: string, data: { text?: string; dueDate?: string | null; personId?: string | null }) {
  if (data.text !== undefined && !data.text.trim()) throw new Error('Bước không được trống');
  await prisma.step.update({
    where: { id },
    data: {
      ...(data.text !== undefined ? { text: data.text.trim() } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? dayToDate(data.dueDate) : null } : {}),
      ...(data.personId !== undefined ? { personId: data.personId } : {}),
    },
  });
}

/** "+ Thêm bước": parses a quick-add style line into a new bottom step. */
export async function addStepFromText(cardId: string, raw: string, today: string): Promise<{ id: string; text: string }> {
  const parsed = parseStep(raw, today);
  if (!parsed) throw new Error('Bước không được trống');
  const person = parsed.person ? await findOrCreatePerson(parsed.person) : null;
  const step = await addStep(cardId, { text: parsed.text, dueDate: parsed.dueDate, personId: person?.id ?? null });
  return { id: step.id, text: step.text };
}

const UNDO_ADD_WINDOW_MS = 24 * 3600_000;

/**
 * Undo of addStepFromText. Hard-deletes the step while it is still fresh (not done, not deleted,
 * created within 24h); otherwise it goes to the trash like any other step.
 */
export async function undoAddStep(id: string, now: Date = new Date()) {
  const step = await prisma.step.findUnique({ where: { id } });
  if (!step || step.deletedAt) return;
  const untouched = step.doneAt === null && now.getTime() - step.createdAt.getTime() < UNDO_ADD_WINDOW_MS;
  if (untouched) await prisma.step.deleteMany({ where: { id, doneAt: null, deletedAt: null } });
  else await prisma.step.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: now } });
}

/** Inline edit: the step becomes exactly what the quick-add text says (missing @person / date clear them). */
export async function updateStepFromText(id: string, raw: string, today: string) {
  const parsed = parseStep(raw, today);
  if (!parsed) throw new Error('Bước không được trống');
  const person = parsed.person ? await findOrCreatePerson(parsed.person) : null;
  await updateStep(id, { text: parsed.text, dueDate: parsed.dueDate, personId: person?.id ?? null });
}

export async function toggleStep(id: string, done: boolean, now: Date = new Date()) {
  if (done) {
    // Keep the original completion time when the step is already done.
    await prisma.step.updateMany({ where: { id, doneAt: null }, data: { doneAt: now } });
  } else {
    await prisma.step.update({ where: { id }, data: { doneAt: null } });
  }
}

export async function setStepDoneAt(id: string, at: Date) {
  await prisma.step.update({ where: { id }, data: { doneAt: at } });
}

export async function moveStep(id: string, order: number) {
  await prisma.step.update({ where: { id }, data: { order } });
}

export async function softDeleteStep(id: string, now: Date = new Date()) {
  await prisma.step.update({ where: { id }, data: { deletedAt: now } });
}

export async function restoreStep(id: string) {
  await prisma.step.update({ where: { id }, data: { deletedAt: null } });
}

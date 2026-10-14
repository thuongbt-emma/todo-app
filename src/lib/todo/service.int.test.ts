import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { freshDb } from '../../../tests/db';
import {
  addStep, addStepFromText, completeCard, completeCardAt, moveCard, quickAdd, reopenCard, restoreCard,
  setStepDoneAt, softDeleteCard, softDeleteStep, toggleStep, undoAddStep, undoQuickAdd, updateCard, updateStep, updateStepFromText,
} from './service';

const T = '2026-10-03';
const G = ['Urgent', 'Đang làm', 'Later', 'Waiting'];
let groups: Awaited<ReturnType<typeof freshDb>>;

beforeEach(async () => {
  groups = await freshDb();
});

const add = (line: string, groupName = 'Đang làm') => quickAdd(parseQuickAdd(line, T, G), groups[groupName].id);

describe('quickAdd', () => {
  it('creates card, steps, person and tag', async () => {
    const { cardId, created } = await add('AP27: final 5/10, submit @c Na 6/10 #event');
    expect(created).toBe(true);
    const card = await prisma.card.findUniqueOrThrow({
      where: { id: cardId },
      include: { steps: { orderBy: { order: 'asc' }, include: { person: true } }, tags: { include: { tag: true } } },
    });
    expect(card.groupId).toBe(groups['Đang làm'].id);
    expect(card.steps.map((s) => s.text)).toEqual(['final', 'submit']);
    expect(card.steps[0].dueDate?.toISOString().slice(0, 10)).toBe('2026-10-05');
    expect(card.steps[1].person?.name).toBe('c Na');
    expect(card.tags.map((t) => t.tag.name)).toEqual(['event']);
  });

  it('honours !group', async () => {
    const { cardId } = await add('!urgent Uprace: trình ký');
    expect((await prisma.card.findUniqueOrThrow({ where: { id: cardId } })).groupId).toBe(groups.Urgent.id);
  });

  it('appends steps to an open card with the same title (case-insensitive)', async () => {
    const first = await add('AP27: final 5/10');
    const second = await add('ap27: submit 6/10 #event');
    expect(second).toMatchObject({ cardId: first.cardId, created: false });
    const steps = await prisma.step.findMany({ where: { cardId: first.cardId }, orderBy: { order: 'asc' } });
    expect(steps.map((s) => s.text)).toEqual(['final', 'submit']);
  });

  it('does not append to completed cards', async () => {
    const first = await add('AP27: final');
    await completeCard(first.cardId);
    expect((await add('AP27: again')).created).toBe(true);
  });

  it('reuses existing people and tags case-insensitively', async () => {
    await add('A: x @c Na #Event');
    await add('B: y @C NA #event');
    expect(await prisma.person.count()).toBe(1);
    expect(await prisma.tag.count()).toBe(1);
  });

  it('places new cards at the bottom of the group', async () => {
    const a = await add('A');
    const b = await add('B');
    const [ca, cb] = await Promise.all([a, b].map((x) => prisma.card.findUniqueOrThrow({ where: { id: x.cardId } })));
    expect(cb.order).toBeGreaterThan(ca.order);
  });

  it('rejects empty title', async () => {
    await expect(add(': x')).rejects.toThrow();
  });
});

describe('card lifecycle', () => {
  it('complete closes open steps and keeps done ones; reopen keeps steps done', async () => {
    const { cardId } = await add('C: a, b');
    const [a] = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    await toggleStep(a.id, true, new Date('2026-10-01T03:00:00Z'));
    await completeCard(cardId, new Date('2026-10-03T03:00:00Z'));
    const steps = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    expect(steps[0].doneAt?.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(steps[1].doneAt?.toISOString()).toBe('2026-10-03T03:00:00.000Z');
    await reopenCard(cardId);
    const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId } });
    expect(card.completedAt).toBeNull();
  });

  it('soft delete and restore', async () => {
    const { cardId } = await add('D');
    await softDeleteCard(cardId);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: cardId } })).deletedAt).not.toBeNull();
    await restoreCard(cardId);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: cardId } })).deletedAt).toBeNull();
    expect(await prisma.card.count()).toBe(1);
  });

  it('moveCard to bottom of another group when order is null', async () => {
    await add('X', 'Later');
    const { cardId } = await add('Y');
    await moveCard(cardId, groups.Later.id, null);
    const later = await prisma.card.findMany({ where: { groupId: groups.Later.id }, orderBy: { order: 'asc' } });
    expect(later.map((c) => c.title)).toEqual(['X', 'Y']);
  });

  it('updateCard replaces tags', async () => {
    const { cardId } = await add('E #a #b');
    const c = await prisma.tag.create({ data: { name: 'c', color: '#000' } });
    await updateCard(cardId, { title: 'E2', tagIds: [c.id] });
    const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: { tags: { include: { tag: true } } } });
    expect(card.title).toBe('E2');
    expect(card.tags.map((t) => t.tag.name)).toEqual(['c']);
  });
});

describe('steps', () => {
  it('add, update, toggle, soft delete', async () => {
    const { cardId } = await add('F');
    const s = await addStep(cardId, { text: 'x', dueDate: '2026-10-09', personId: null });
    await updateStep(s.id, { text: 'y', dueDate: null });
    await toggleStep(s.id, true);
    let row = await prisma.step.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.text).toBe('y');
    expect(row.dueDate).toBeNull();
    expect(row.doneAt).not.toBeNull();
    await toggleStep(s.id, false);
    await softDeleteStep(s.id);
    row = await prisma.step.findUniqueOrThrow({ where: { id: s.id } });
    expect(row.doneAt).toBeNull();
    expect(row.deletedAt).not.toBeNull();
  });
});

describe('toggleStep idempotency', () => {
  it('ticking an already-done step keeps the original doneAt', async () => {
    const { cardId } = await add('G: a');
    const [a] = await prisma.step.findMany({ where: { cardId } });
    await toggleStep(a.id, true, new Date('2026-10-01T03:00:00Z'));
    await toggleStep(a.id, true, new Date('2026-10-05T03:00:00Z'));
    const row = await prisma.step.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.doneAt?.toISOString()).toBe('2026-10-01T03:00:00.000Z');
  });
});

describe('reopenCard (undo-ready)', () => {
  it('restores only steps closed by completion and keeps card order', async () => {
    const { cardId } = await add('R: a, b, c');
    await add('R2');
    const [a] = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    const t1 = new Date('2026-10-01T03:00:00Z');
    await toggleStep(a.id, true, t1);
    const before = await prisma.card.findUniqueOrThrow({ where: { id: cardId } });
    await completeCard(cardId, new Date('2026-10-03T03:00:00Z'));
    await reopenCard(cardId);
    const steps = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    expect(steps[0].doneAt?.toISOString()).toBe(t1.toISOString());
    expect(steps[1].doneAt).toBeNull();
    expect(steps[2].doneAt).toBeNull();
    const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId } });
    expect(card.completedAt).toBeNull();
    expect(card.order).toBe(before.order);
  });
});

describe('quickAdd receipt and undo', () => {
  it('undo of a created card deletes card and steps', async () => {
    const r = await add('U: a, b, c #x');
    expect(r.created).toBe(true);
    expect(r.cardTitle).toBe('U');
    expect(r.stepIds).toHaveLength(3);
    await undoQuickAdd(r);
    expect(await prisma.card.findUnique({ where: { id: r.cardId } })).toBeNull();
    expect(await prisma.step.count({ where: { id: { in: r.stepIds } } })).toBe(0);
  });

  it('undo of a merge restores group, order, steps and tags', async () => {
    const first = await add('!urgent M: orig #old');
    const before = await prisma.card.findUniqueOrThrow({ where: { id: first.cardId } });
    const r = await add('!later m: n1, n2 #old #new');
    expect(r).toMatchObject({ cardId: first.cardId, created: false, prevGroupId: groups.Urgent.id, prevOrder: before.order });
    expect(r.stepIds).toHaveLength(2);
    const newTag = await prisma.tag.findFirstOrThrow({ where: { name: 'new' } });
    expect(r.addedTagIds).toEqual([newTag.id]);
    expect((await prisma.card.findUniqueOrThrow({ where: { id: r.cardId } })).groupId).toBe(groups.Later.id);
    await undoQuickAdd(r);
    const card = await prisma.card.findUniqueOrThrow({
      where: { id: r.cardId },
      include: { steps: true, tags: { include: { tag: true } } },
    });
    expect(card.groupId).toBe(groups.Urgent.id);
    expect(card.order).toBe(before.order);
    expect(card.steps.map((x) => x.text)).toEqual(['orig']);
    expect(card.tags.map((t) => t.tag.name)).toEqual(['old']);
  });

  const inTrash = async (cardId: string) => (await prisma.card.findUniqueOrThrow({ where: { id: cardId } })).deletedAt;

  it('undo after adding an extra step soft-deletes the card into the trash', async () => {
    const r = await add('U: a, b');
    await addStep(r.cardId, { text: 'extra', dueDate: null, personId: null });
    await undoQuickAdd(r);
    expect(await inTrash(r.cardId)).toBeInstanceOf(Date);
    expect(await prisma.step.count({ where: { cardId: r.cardId } })).toBe(3);
  });

  it('undo after ticking a step soft-deletes the card', async () => {
    const r = await add('U: a, b');
    await toggleStep(r.stepIds[0], true);
    await undoQuickAdd(r);
    expect(await inTrash(r.cardId)).toBeInstanceOf(Date);
  });

  it('undo after editing the note soft-deletes the card', async () => {
    const r = await add('U: a');
    await updateCard(r.cardId, { note: 'ghi chú' });
    await undoQuickAdd(r);
    expect(await inTrash(r.cardId)).toBeInstanceOf(Date);
  });

  it('undo after renaming or retagging soft-deletes the card', async () => {
    const r1 = await add('U1: a #x');
    await updateCard(r1.cardId, { title: 'U1 renamed' });
    await undoQuickAdd(r1);
    expect(await inTrash(r1.cardId)).toBeInstanceOf(Date);

    const r2 = await add('U2: a #x');
    await updateCard(r2.cardId, { tagIds: [] });
    await undoQuickAdd(r2);
    expect(await inTrash(r2.cardId)).toBeInstanceOf(Date);
  });

  it('undo after deleting a step soft-deletes the card', async () => {
    const r = await add('U: a, b');
    await softDeleteStep(r.stepIds[1]);
    await undoQuickAdd(r);
    expect(await inTrash(r.cardId)).toBeInstanceOf(Date);
  });

  it('undo of an already-completed created card soft-deletes it', async () => {
    const r = await add('U: a');
    await completeCard(r.cardId);
    await undoQuickAdd(r);
    expect(await inTrash(r.cardId)).toBeInstanceOf(Date);
  });

  it('undo of a merge soft-deletes a ticked added step and removes untouched ones', async () => {
    await add('MT: orig');
    const r = await add('mt: n1, n2');
    await toggleStep(r.stepIds[0], true);
    await undoQuickAdd(r);
    const steps = await prisma.step.findMany({ where: { cardId: r.cardId }, orderBy: { order: 'asc' } });
    expect(steps.map((s) => s.text)).toEqual(['orig', 'n1']);
    expect(steps[0].deletedAt).toBeNull();
    expect(steps[1].deletedAt).toBeInstanceOf(Date);
    expect(await inTrash(r.cardId)).toBeNull();
  });

  it('merge without !group leaves prev fields null', async () => {
    await add('N: a');
    const r = await add('N: b');
    expect(r.prevGroupId).toBeNull();
    expect(r.prevOrder).toBeNull();
  });
});

describe('completeCard idempotency', () => {
  it('is a no-op when the card is already completed', async () => {
    const { cardId } = await add('I: a');
    const t1 = new Date('2026-10-01T03:00:00Z');
    await completeCard(cardId, t1);
    await completeCard(cardId, new Date('2026-10-05T03:00:00Z'));
    const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: { steps: true } });
    expect(card.completedAt?.toISOString()).toBe(t1.toISOString());
    expect(card.steps[0].doneAt?.toISOString()).toBe(t1.toISOString());
  });
});

describe('completeCardAt (undo of reopen)', () => {
  it('restores the original completion time on card and steps', async () => {
    const { cardId } = await add('CA: a, b');
    const t1 = new Date('2026-10-01T03:00:00Z');
    await completeCard(cardId, t1);
    await reopenCard(cardId);
    await completeCardAt(cardId, t1);
    const card = await prisma.card.findUniqueOrThrow({ where: { id: cardId }, include: { steps: true } });
    expect(card.completedAt?.toISOString()).toBe(t1.toISOString());
    expect(card.steps.map((s) => s.doneAt?.toISOString())).toEqual([t1.toISOString(), t1.toISOString()]);
  });

  it('is a no-op when the card is already completed', async () => {
    const { cardId } = await add('CA2: a');
    const t1 = new Date('2026-10-01T03:00:00Z');
    await completeCard(cardId, t1);
    await completeCardAt(cardId, new Date('2026-10-04T03:00:00Z'));
    expect((await prisma.card.findUniqueOrThrow({ where: { id: cardId } })).completedAt?.toISOString()).toBe(t1.toISOString());
  });
});

describe('setStepDoneAt', () => {
  it('restores an exact timestamp', async () => {
    const { cardId } = await add('S: a');
    const [a] = await prisma.step.findMany({ where: { cardId } });
    const t = new Date('2026-10-02T04:05:06.789Z');
    await setStepDoneAt(a.id, t);
    expect((await prisma.step.findUniqueOrThrow({ where: { id: a.id } })).doneAt?.toISOString()).toBe(t.toISOString());
  });
});

describe('updateStepFromText', () => {
  const load = (id: string) => prisma.step.findUniqueOrThrow({ where: { id }, include: { person: true } });

  it('parses text, date and a new person', async () => {
    const { stepIds } = await add('Card A: gửi file');
    expect(await prisma.person.count({ where: { name: 'c Na' } })).toBe(0);
    await updateStepFromText(stepIds[0], 'gửi bản final @c Na 15/10', T);
    const s = await load(stepIds[0]);
    expect(s.text).toBe('gửi bản final');
    expect(s.dueDate?.toISOString().slice(0, 10)).toBe('2026-10-15');
    expect(s.person?.name).toBe('c Na');
  });

  it('reuses an existing person (case-insensitive)', async () => {
    const { stepIds } = await add('Card A: gửi file @Na, ký @Bình');
    const na = (await load(stepIds[0])).personId;
    await updateStepFromText(stepIds[1], 'ký @na', T);
    expect((await load(stepIds[1])).personId).toBe(na);
  });

  it('clears person and due date when they are removed from the text', async () => {
    const { stepIds } = await add('Card A: gửi file @Na 6/10');
    await updateStepFromText(stepIds[0], 'gửi file', T);
    const s = await load(stepIds[0]);
    expect(s.text).toBe('gửi file');
    expect(s.dueDate).toBeNull();
    expect(s.personId).toBeNull();
  });

  it('works on done steps and keeps them done', async () => {
    const { stepIds } = await add('Card A: gửi file');
    await toggleStep(stepIds[0], true);
    await updateStepFromText(stepIds[0], 'gửi file 2', T);
    const s = await load(stepIds[0]);
    expect(s.text).toBe('gửi file 2');
    expect(s.doneAt).not.toBeNull();
  });

  it('rejects empty text', async () => {
    const { stepIds } = await add('Card A: gửi file');
    await expect(updateStepFromText(stepIds[0], '   ', T)).rejects.toThrow('Bước không được trống');
    expect((await load(stepIds[0])).text).toBe('gửi file');
  });
});

describe('addStepFromText', () => {
  it('parses the line, appends at the bottom and returns id + text', async () => {
    const { cardId, stepIds } = await add('Card A: đầu tiên');
    const r = await addStepFromText(cardId, 'gửi file @c Na 16/10', T);
    expect(r).toEqual({ id: expect.any(String), text: 'gửi file' });
    const steps = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' }, include: { person: true } });
    expect(steps.map((s) => s.id)).toEqual([stepIds[0], r.id]);
    expect(steps[1].person?.name).toBe('c Na');
    expect(steps[1].dueDate?.toISOString().slice(0, 10)).toBe('2026-10-16');
  });

  it('rejects empty text', async () => {
    const { cardId } = await add('Card A');
    await expect(addStepFromText(cardId, '   ', T)).rejects.toThrow('Bước không được trống');
  });
});

describe('undoAddStep', () => {
  const now = new Date();
  const fresh = async () => {
    const { cardId } = await add('Card A');
    return addStep(cardId, { text: 'x', dueDate: null, personId: null });
  };
  const load = (id: string) => prisma.step.findUnique({ where: { id } });

  it('hard-deletes an untouched step', async () => {
    const s = await fresh();
    await undoAddStep(s.id, now);
    expect(await load(s.id)).toBeNull();
  });

  it('soft-deletes a step that was ticked meanwhile', async () => {
    const s = await fresh();
    await toggleStep(s.id, true);
    await undoAddStep(s.id, now);
    expect((await load(s.id))?.deletedAt?.toISOString()).toBe(now.toISOString());
  });

  it('soft-deletes a step older than 24h', async () => {
    const s = await fresh();
    await undoAddStep(s.id, new Date(s.createdAt.getTime() + 25 * 3600_000));
    expect((await load(s.id))?.deletedAt).not.toBeNull();
  });

  it('leaves an already deleted step alone and ignores unknown ids', async () => {
    const s = await fresh();
    const at = new Date('2026-10-01T00:00:00.000Z');
    await softDeleteStep(s.id, at);
    await undoAddStep(s.id, now);
    expect((await load(s.id))?.deletedAt?.toISOString()).toBe(at.toISOString());
    await expect(undoAddStep('nope', now)).resolves.toBeUndefined();
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { freshDb } from '../../../tests/db';
import { getAgenda, getBoard, getLog, getOpenCardTitles, getRecentlyCompleted, getTrash, getUsage, parseFilter } from './queries';
import { completeCard, quickAdd, softDeleteCard, toggleStep } from './service';

const T = '2026-10-03';
const G = ['Urgent', 'Đang làm', 'Later', 'Waiting'];
let groups: Awaited<ReturnType<typeof freshDb>>;
beforeEach(async () => {
  groups = await freshDb();
});
const add = (line: string) => quickAdd(parseQuickAdd(line, T, G), groups['Đang làm'].id);

describe('parseFilter', () => {
  it('reads comma lists', () => {
    expect(parseFilter({ tags: 'a,b', people: undefined })).toEqual({ tagIds: ['a', 'b'], personIds: [] });
  });
});

describe('getBoard', () => {
  it('returns open cards per group and honours tag/person filters', async () => {
    await add('A: x @c Na #posm');
    await add('B: y');
    const done = await add('C');
    await completeCard(done.cardId);
    const all = await getBoard({ tagIds: [], personIds: [] });
    expect(all.find((g) => g.name === 'Đang làm')?.cards.map((c) => c.title)).toEqual(['A', 'B']);
    const tag = await prisma.tag.findFirstOrThrow();
    const byTag = await getBoard({ tagIds: [tag.id], personIds: [] });
    expect(byTag.flatMap((g) => g.cards).map((c) => c.title)).toEqual(['A']);
    const person = await prisma.person.findFirstOrThrow();
    const byPerson = await getBoard({ tagIds: [], personIds: [person.id] });
    expect(byPerson.flatMap((g) => g.cards).map((c) => c.title)).toEqual(['A']);
  });
});

describe('getAgenda', () => {
  it('buckets open steps of open cards', async () => {
    await add('A: late 1/10, now 3/10, soon 6/10, far 30/10, undated');
    const agenda = await getAgenda({ tagIds: [], personIds: [] }, T);
    expect(agenda.overdue.map((i) => i.text)).toEqual(['late']);
    expect(agenda.today.map((i) => i.text)).toEqual(['now']);
    expect(agenda.week.map((i) => i.text)).toEqual(['soon']);
    expect(agenda.later.map((i) => i.text)).toEqual(['far']);
    expect(agenda.none.map((i) => i.text)).toEqual(['undated']);
  });
});

describe('getLog', () => {
  it('lists done steps and completed cards in VN-day range, searchable', async () => {
    const { cardId } = await add('AP27: final, submit');
    const [final] = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    await toggleStep(final.id, true, new Date('2026-10-02T18:00:00Z')); // 2026-10-03 01:00 VN
    await completeCard(cardId, new Date('2026-10-04T03:00:00Z'));
    const oct3 = await getLog({ from: '2026-10-03', to: '2026-10-03', q: '' });
    expect(oct3.map((e) => [e.kind, e.text, e.day])).toEqual([['step', 'final', '2026-10-03']]);
    const all = await getLog({ from: '2026-10-01', to: '2026-10-05', q: 'ap27' });
    expect(all.map((e) => e.kind).sort()).toEqual(['card', 'step', 'step']);
  });
});

describe('getTrash', () => {
  it('lists deleted cards', async () => {
    const { cardId } = await add('Z');
    await softDeleteCard(cardId);
    expect((await getTrash()).cards.map((c) => c.title)).toEqual(['Z']);
  });
});

describe('getRecentlyCompleted', () => {
  it('includes last 7 days, excludes older and trashed, newest first', async () => {
    const now = new Date('2026-10-10T03:00:00Z');
    const a = await add('Recent');
    const b = await add('Newer');
    const old = await add('Old');
    const trashed = await add('Trashed');
    await completeCard(a.cardId, new Date('2026-10-08T03:00:00Z'));
    await completeCard(b.cardId, new Date('2026-10-09T03:00:00Z'));
    await completeCard(old.cardId, new Date('2026-10-02T03:00:00Z'));
    await completeCard(trashed.cardId, new Date('2026-10-09T05:00:00Z'));
    await softDeleteCard(trashed.cardId);
    const rows = await getRecentlyCompleted(now);
    expect(rows.map((r) => r.title)).toEqual(['Newer', 'Recent']);
    expect(rows[0]).toMatchObject({ groupName: 'Đang làm', groupColor: groups['Đang làm'].color });
  });
});

describe('getUsage', () => {
  it('counts card tags, steps per person, open cards per group', async () => {
    await add('A: x @c Na, y @c Na #t1 #t2');
    await add('B #t1');
    const done = await add('C: z @Bo');
    await completeCard(done.cardId);
    const u = await getUsage();
    const tag = (n: string) => prisma.tag.findFirstOrThrow({ where: { name: n } });
    const person = (n: string) => prisma.person.findFirstOrThrow({ where: { name: n } });
    expect(u.tags[(await tag('t1')).id]).toBe(2);
    expect(u.tags[(await tag('t2')).id]).toBe(1);
    expect(u.people[(await person('c Na')).id]).toBe(2);
    expect(u.people[(await person('Bo')).id]).toBe(1);
    expect(u.groups[groups['Đang làm'].id]).toBe(2);
  });
});

describe('getOpenCardTitles', () => {
  it('excludes completed and trashed cards', async () => {
    await add('Open');
    const c = await add('Done');
    const t = await add('Trash');
    await completeCard(c.cardId);
    await softDeleteCard(t.cardId);
    expect(await getOpenCardTitles()).toEqual(['Open']);
  });
});

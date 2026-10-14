import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { freshDb } from '../../../tests/db';
import { completeCard, quickAdd, softDeleteCard, softDeleteStep, toggleStep } from './service';
import { getStats } from './stats-query';

const T = '2026-10-03';
let groups: Awaited<ReturnType<typeof freshDb>>;
beforeEach(async () => {
  groups = await freshDb();
});

describe('getStats', () => {
  it('counts done steps in range, excludes deleted, counts open overdue', async () => {
    const { cardId } = await quickAdd(parseQuickAdd('A: a 1/10, b 2/10, c 1/10 #posm', T, ['Đang làm']), groups['Đang làm'].id);
    const [a, b, c] = await prisma.step.findMany({ where: { cardId }, orderBy: { order: 'asc' } });
    await toggleStep(a.id, true, new Date('2026-10-02T03:00:00Z')); // late
    await toggleStep(b.id, true, new Date('2026-10-02T03:00:00Z')); // on time
    await softDeleteStep(c.id);
    const stats = await getStats('2026-10-01', '2026-10-31', T);
    expect(stats.stepsDone).toBe(2);
    expect(stats.lateDone).toBe(1);
    expect(stats.topTags).toEqual([{ name: 'posm', count: 2 }]);
    expect(stats.openOverdue).toBe(0);
  });

  it('counts a completed step-less card once per tag; ignores trashed cards and deleted steps', async () => {
    const at = new Date('2026-10-02T03:00:00Z');
    const g = groups['Đang làm'].id;
    const { cardId: bare } = await quickAdd(parseQuickAdd('Gọi vendor #posm #event', T, ['Đang làm']), g);
    await completeCard(bare, at);
    // only step was deleted → counts as step-less
    const { cardId: emptied } = await quickAdd(parseQuickAdd('B: x #posm', T, ['Đang làm']), g);
    const [x] = await prisma.step.findMany({ where: { cardId: emptied } });
    await softDeleteStep(x.id);
    await completeCard(emptied, at);
    // trashed card is ignored
    const { cardId: trashed } = await quickAdd(parseQuickAdd('Rác #event', T, ['Đang làm']), g);
    await completeCard(trashed, at);
    await softDeleteCard(trashed);
    const stats = await getStats('2026-10-01', '2026-10-31', T);
    expect(stats.topTags).toEqual([{ name: 'posm', count: 2 }, { name: 'event', count: 1 }]);
    expect(stats.stepsDone).toBe(0);
  });
});

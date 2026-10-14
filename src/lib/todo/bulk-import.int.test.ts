import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { importLines } from './bulk-import';
import { ensureDefaults } from './defaults';
import { resetDb } from '../../../tests/db';

const groupOf = async (title: string) =>
  (await prisma.card.findFirstOrThrow({ where: { title }, include: { group: true } })).group.name;

describe('importLines', () => {
  beforeEach(async () => {
    await resetDb();
    await ensureDefaults(prisma);
  });

  it('puts sections in the right groups and headerless lines in Đang làm', async () => {
    const text = 'Orphan: a\nUrgent\nFC9: gửi lại\nLater\nRenovation: chờ AF';
    const r = await importLines(text, '2026-10-04');
    expect(r).toEqual({ cards: 3, steps: 3, failed: [] });
    expect(await groupOf('Orphan')).toBe('Đang làm');
    expect(await groupOf('FC9')).toBe('Urgent');
    expect(await groupOf('Renovation')).toBe('Later');
  });

  it('reports an empty-title line as failed without aborting the rest', async () => {
    const r = await importLines('Urgent\n: x\nGood: y', '2026-10-04');
    expect(r.failed).toEqual([': x']);
    expect(r.cards).toBe(1);
    expect(await groupOf('Good')).toBe('Urgent');
  });
});

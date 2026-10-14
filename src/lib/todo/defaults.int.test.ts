import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { ensureDefaults } from './defaults';
import { resetDb } from '../../../tests/db';

describe('ensureDefaults', () => {
  beforeEach(resetDb);

  it('creates the four default groups in order and a settings row', async () => {
    await ensureDefaults(prisma);
    const groups = await prisma.group.findMany({ orderBy: { order: 'asc' } });
    expect(groups.map((g) => g.name)).toEqual(['Urgent', 'Đang làm', 'Later', 'Waiting']);
    const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect(settings.theme).toBe('system');
  });

  it('is idempotent', async () => {
    await ensureDefaults(prisma);
    await ensureDefaults(prisma);
    expect(await prisma.group.count()).toBe(4);
  });
});

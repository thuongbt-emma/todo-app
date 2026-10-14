// defaults.ts
import type { PrismaClient } from '@/generated/prisma/client';

export const DEFAULT_GROUPS = [
  { name: 'Urgent', color: '#e5484d' },
  { name: 'Đang làm', color: '#3e63dd' },
  { name: 'Later', color: '#8b8d98' },
  { name: 'Waiting', color: '#f5a623' },
];

export async function ensureDefaults(db: PrismaClient) {
  if ((await db.group.count()) === 0) {
    await db.group.createMany({
      data: DEFAULT_GROUPS.map((g, i) => ({ ...g, order: (i + 1) * 1000 })),
    });
  }
  await db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

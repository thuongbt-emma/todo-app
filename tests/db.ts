import { prisma } from '@/lib/db';
import { ensureDefaults } from '@/lib/todo/defaults';

export async function resetDb() {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Empty DB + default groups/settings; returns groups by name. */
export async function freshDb() {
  await resetDb();
  await ensureDefaults(prisma);
  const groups = await prisma.group.findMany({ orderBy: { order: 'asc' } });
  return Object.fromEntries(groups.map((g) => [g.name, g]));
}

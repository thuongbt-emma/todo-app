import 'server-only';
import { prisma } from '@/lib/db';
import { between } from '@/lib/order';

export type TaxonomyKind = 'group' | 'tag' | 'person';

export type AppSettings = {
  theme: 'light' | 'dark' | 'system';
  accent: string;
  density: 'compact' | 'cozy';
  defaultView: 'board' | 'list' | 'agenda';
  showDone: boolean;
};

function cleanName(name: string): string {
  const n = name.trim();
  if (!n) throw new Error('Tên không được trống');
  return n;
}

export async function createItem(kind: TaxonomyKind, name: string, color: string) {
  const n = cleanName(name);
  if (kind === 'group') {
    const last = await prisma.group.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    return prisma.group.create({ data: { name: n, color, order: between(last?.order ?? null, null) }, select: { id: true } });
  }
  if (kind === 'tag') return prisma.tag.create({ data: { name: n, color }, select: { id: true } });
  return prisma.person.create({ data: { name: n, color }, select: { id: true } });
}

export async function updateItem(kind: TaxonomyKind, id: string, data: { name?: string; color?: string; order?: number }) {
  const fields = {
    ...(data.name !== undefined ? { name: cleanName(data.name) } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
  };
  if (kind === 'group') {
    await prisma.group.update({ where: { id }, data: { ...fields, ...(data.order !== undefined ? { order: data.order } : {}) } });
  } else if (kind === 'tag') {
    await prisma.tag.update({ where: { id }, data: fields });
  } else {
    await prisma.person.update({ where: { id }, data: fields });
  }
}

export async function deleteItem(kind: TaxonomyKind, id: string) {
  // Tags/people are never hard-deleted while referenced (spec §2): history must keep them.
  if (kind === 'tag') {
    const used =
      (await prisma.cardTag.count({ where: { tagId: id } })) + (await prisma.noteTag.count({ where: { tagId: id } }));
    if (used > 0) throw new Error('Tag đang được dùng, không xoá được. Hãy đổi tên nếu cần.');
    await prisma.tag.delete({ where: { id } });
    return;
  }
  if (kind === 'person') {
    const used = await prisma.step.count({ where: { personId: id } });
    if (used > 0) throw new Error('Người này đang gắn với bước, không xoá được. Hãy đổi tên nếu cần.');
    await prisma.person.delete({ where: { id } });
    return;
  }
  const openCount = await prisma.card.count({ where: { groupId: id, completedAt: null, deletedAt: null } });
  if (openCount > 0) throw new Error('Nhóm còn việc, hãy chuyển việc sang nhóm khác trước khi xoá');
  const fallback = await prisma.group.findFirst({ where: { id: { not: id } }, orderBy: { order: 'asc' } });
  if (!fallback) throw new Error('Cần giữ ít nhất 1 nhóm');
  // Completed / trashed cards keep their history under another group.
  await prisma.$transaction([
    prisma.card.updateMany({ where: { groupId: id }, data: { groupId: fallback.id } }),
    prisma.group.delete({ where: { id } }),
  ]);
}

// Mirrors the column defaults in prisma/schema.prisma (model Settings).
const DEFAULT_SETTINGS: AppSettings = { theme: 'system', accent: '#f05a22', density: 'cozy', defaultView: 'board', showDone: true };

/** Read-only: called on every render, so no write; the row is created by updateSettings. */
export async function getSettings(): Promise<AppSettings> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!s) return { ...DEFAULT_SETTINGS };
  return {
    theme: s.theme as AppSettings['theme'],
    accent: s.accent,
    density: s.density as AppSettings['density'],
    defaultView: s.defaultView as AppSettings['defaultView'],
    showDone: s.showDone,
  };
}

export async function updateSettings(data: Partial<AppSettings>) {
  await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
}

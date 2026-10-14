import 'server-only';
import { prisma } from '@/lib/db';
import type { Prisma } from '@/generated/prisma/client';
import { fold } from '@/lib/quick-add/parse';

const noteInclude = { tags: { include: { tag: true } } } satisfies Prisma.NoteInclude;

export type NoteWithTags = Prisma.NoteGetPayload<{ include: typeof noteInclude }>;

export async function createNote(): Promise<{ id: string }> {
  return prisma.note.create({ data: {}, select: { id: true } });
}

export async function updateNote(
  id: string,
  data: { title?: string; body?: string; pinned?: boolean; tagIds?: string[] },
): Promise<void> {
  const { tagIds, ...fields } = data;
  await prisma.$transaction(async (tx) => {
    if (tagIds) {
      await tx.noteTag.deleteMany({ where: { noteId: id } });
      if (tagIds.length) await tx.noteTag.createMany({ data: [...new Set(tagIds)].map((tagId) => ({ noteId: id, tagId })) });
    }
    // Always touch the row so updatedAt moves even for tag-only edits.
    await tx.note.update({ where: { id }, data: { ...fields, updatedAt: new Date() } });
  });
}

/** Hard-deletes a never-filled note (spec §9.2). Returns whether it was deleted. */
export async function discardIfEmpty(id: string): Promise<boolean> {
  const n = await prisma.note.findFirst({ where: { id, deletedAt: null }, include: { _count: { select: { tags: true } } } });
  if (!n || n.title.trim() || n.body.trim() || n._count.tags > 0) return false;
  await prisma.note.delete({ where: { id } });
  return true;
}

export async function softDeleteNote(id: string, now = new Date()): Promise<void> {
  await prisma.note.update({ where: { id }, data: { deletedAt: now } });
}

export async function restoreNote(id: string): Promise<void> {
  await prisma.note.update({ where: { id }, data: { deletedAt: null } });
}

export async function listNotes({ q, tagIds }: { q: string; tagIds: string[] }): Promise<NoteWithTags[]> {
  const notes = await prisma.note.findMany({
    where: { deletedAt: null, ...(tagIds.length ? { tags: { some: { tagId: { in: tagIds } } } } : {}) },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    include: noteInclude,
  });
  const needle = fold(q.trim());
  if (!needle) return notes;
  return notes.filter((n) => fold(`${n.title} ${n.body}`).includes(needle));
}

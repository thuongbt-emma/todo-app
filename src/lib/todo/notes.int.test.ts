import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { freshDb } from '../../../tests/db';
import { createNote, discardIfEmpty, listNotes, restoreNote, softDeleteNote, updateNote } from './notes';
import { deleteItem } from './taxonomy';
import { getTrash, getTrashCount, getUsage } from './queries';

beforeEach(async () => {
  await freshDb();
});

const none = { q: '', tagIds: [] as string[] };

describe('notes', () => {
  it('creates an empty note and updates it', async () => {
    const { id } = await createNote();
    const n = await prisma.note.findUniqueOrThrow({ where: { id } });
    expect(n).toMatchObject({ title: '', body: '', pinned: false });
    await updateNote(id, { title: 'Địa chỉ', body: 'Lô Z06' });
    expect((await listNotes(none))[0]).toMatchObject({ title: 'Địa chỉ', body: 'Lô Z06' });
  });

  it('orders pinned first, then updatedAt desc', async () => {
    const a = await createNote();
    await updateNote(a.id, { title: 'a' });
    const b = await createNote();
    await updateNote(b.id, { title: 'b' });
    const c = await createNote();
    await updateNote(c.id, { title: 'c' });
    expect((await listNotes(none)).map((n) => n.title)).toEqual(['c', 'b', 'a']);
    await updateNote(a.id, { pinned: true });
    expect((await listNotes(none)).map((n) => n.title)).toEqual(['a', 'c', 'b']);
  });

  it('searches title and body ignoring case and diacritics', async () => {
    const a = await createNote();
    await updateNote(a.id, { title: 'Địa chỉ kho', body: 'x' });
    const b = await createNote();
    await updateNote(b.id, { title: 'khác', body: 'ĐỊA CHỈ văn phòng' });
    const c = await createNote();
    await updateNote(c.id, { title: 'khác', body: 'không' });
    expect((await listNotes({ q: 'dia chi', tagIds: [] })).map((n) => n.id).sort()).toEqual([a.id, b.id].sort());
  });

  it('filters by any of the tags and attaches tags', async () => {
    const t1 = await prisma.tag.create({ data: { name: 't1', color: '#111111' } });
    const t2 = await prisma.tag.create({ data: { name: 't2', color: '#222222' } });
    const a = await createNote();
    await updateNote(a.id, { title: 'a', tagIds: [t1.id] });
    const b = await createNote();
    await updateNote(b.id, { title: 'b', tagIds: [t2.id] });
    const c = await createNote();
    await updateNote(c.id, { title: 'c' });
    const res = await listNotes({ q: '', tagIds: [t1.id, t2.id] });
    expect(res.map((n) => n.title).sort()).toEqual(['a', 'b']);
    expect(res.find((n) => n.title === 'a')!.tags[0].tag.name).toBe('t1');
    await updateNote(a.id, { tagIds: [] });
    expect((await listNotes({ q: '', tagIds: [t1.id] }))).toEqual([]);
  });

  it('soft deletes and restores', async () => {
    const { id } = await createNote();
    await updateNote(id, { title: 'x' });
    await softDeleteNote(id);
    expect(await listNotes(none)).toEqual([]);
    expect((await getTrash()).notes.map((n) => n.title)).toEqual(['x']);
    await restoreNote(id);
    expect(await listNotes(none)).toHaveLength(1);
    expect((await getTrash()).notes).toEqual([]);
  });

  it('getTrashCount counts trashed cards, steps and notes', async () => {
    expect(await getTrashCount()).toBe(0);
    const g = await prisma.group.findFirstOrThrow();
    const live = await prisma.card.create({ data: { title: 'live', groupId: g.id, order: 1 } });
    await prisma.step.create({ data: { cardId: live.id, text: 's', order: 1, deletedAt: new Date() } });
    const dead = await prisma.card.create({ data: { title: 'dead', groupId: g.id, order: 2, deletedAt: new Date() } });
    // a trashed step of a trashed card is not listed separately
    await prisma.step.create({ data: { cardId: dead.id, text: 's2', order: 1, deletedAt: new Date() } });
    const { id } = await createNote();
    await softDeleteNote(id);
    expect(await getTrashCount()).toBe(3);
  });

  it('discardIfEmpty deletes blank notes only', async () => {
    const a = await createNote();
    expect(await discardIfEmpty(a.id)).toBe(true);
    expect(await prisma.note.count()).toBe(0);
    const b = await createNote();
    await updateNote(b.id, { title: '  ', body: 'hi' });
    expect(await discardIfEmpty(b.id)).toBe(false);
    const c = await createNote();
    const t = await prisma.tag.create({ data: { name: 't', color: '#111111' } });
    await updateNote(c.id, { tagIds: [t.id] });
    expect(await discardIfEmpty(c.id)).toBe(false);
    expect(await prisma.note.count()).toBe(2);
  });

  it('discardIfEmpty leaves trashed notes alone', async () => {
    const { id } = await createNote();
    await softDeleteNote(id);
    expect(await discardIfEmpty(id)).toBe(false);
    expect(await prisma.note.count()).toBe(1);
  });
});

describe('tags used by notes', () => {
  it('cannot be deleted while a note uses them', async () => {
    const t = await prisma.tag.create({ data: { name: 't', color: '#111111' } });
    const { id } = await createNote();
    await updateNote(id, { tagIds: [t.id] });
    await expect(deleteItem('tag', t.id)).rejects.toThrow('Tag đang được dùng');
  });

  it('are counted in usage alongside cards', async () => {
    const groups = await prisma.group.findFirstOrThrow();
    const t = await prisma.tag.create({ data: { name: 't', color: '#111111' } });
    const card = await prisma.card.create({ data: { title: 'c', groupId: groups.id, order: 1 } });
    await prisma.cardTag.create({ data: { cardId: card.id, tagId: t.id } });
    const { id } = await createNote();
    await updateNote(id, { tagIds: [t.id] });
    expect((await getUsage()).tags[t.id]).toBe(2);
  });
});

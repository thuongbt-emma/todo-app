import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/db';
import { freshDb } from '../../../tests/db';
import { completeCard } from './service';
import { createItem, deleteItem, getSettings, updateItem, updateSettings } from './taxonomy';

let groups: Awaited<ReturnType<typeof freshDb>>;
beforeEach(async () => {
  groups = await freshDb();
});

describe('groups', () => {
  it('creates at the bottom and renames', async () => {
    const { id } = await createItem('group', 'Ý tưởng', '#123456');
    await updateItem('group', id, { name: 'Ideas' });
    const all = await prisma.group.findMany({ orderBy: { order: 'asc' } });
    expect(all.at(-1)?.name).toBe('Ideas');
  });

  it('refuses to delete a group with open cards', async () => {
    await prisma.card.create({ data: { title: 'x', groupId: groups.Later.id, order: 1 } });
    await expect(deleteItem('group', groups.Later.id)).rejects.toThrow('Nhóm còn việc');
  });

  it('moves completed cards to another group, then deletes', async () => {
    const card = await prisma.card.create({ data: { title: 'x', groupId: groups.Later.id, order: 1 } });
    await completeCard(card.id);
    await deleteItem('group', groups.Later.id);
    const moved = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
    expect(moved.groupId).toBe(groups.Urgent.id);
    expect(await prisma.group.count()).toBe(3);
  });

  it('refuses to delete the last group', async () => {
    for (const name of ['Urgent', 'Đang làm', 'Later']) await deleteItem('group', groups[name].id);
    await expect(deleteItem('group', groups.Waiting.id)).rejects.toThrow('ít nhất 1 nhóm');
  });

  it('rejects empty names', async () => {
    await expect(createItem('tag', '  ', '#000')).rejects.toThrow();
  });
});

describe('tags and people', () => {
  it('refuses to delete a tag or person in use, even on completed/trashed cards', async () => {
    const tag = await createItem('tag', 'posm', '#000');
    const person = await createItem('person', 'c Na', '#000');
    const card = await prisma.card.create({
      data: { title: 'x', groupId: groups.Later.id, order: 1, completedAt: new Date(), deletedAt: new Date() },
    });
    await prisma.cardTag.create({ data: { cardId: card.id, tagId: tag.id } });
    await prisma.step.create({
      data: { cardId: card.id, text: 's', order: 1, personId: person.id, doneAt: new Date(), deletedAt: new Date() },
    });
    await expect(deleteItem('tag', tag.id)).rejects.toThrow('Tag đang được dùng, không xoá được. Hãy đổi tên nếu cần.');
    await expect(deleteItem('person', person.id)).rejects.toThrow(
      'Người này đang gắn với bước, không xoá được. Hãy đổi tên nếu cần.',
    );
    expect(await prisma.tag.count({ where: { id: tag.id } })).toBe(1);
    expect(await prisma.person.count({ where: { id: person.id } })).toBe(1);
    expect(await prisma.cardTag.count()).toBe(1);
  });

  it('deletes an unreferenced tag and person', async () => {
    const tag = await createItem('tag', 'posm', '#000');
    const person = await createItem('person', 'c Na', '#000');
    await deleteItem('tag', tag.id);
    await deleteItem('person', person.id);
    expect(await prisma.tag.count({ where: { id: tag.id } })).toBe(0);
    expect(await prisma.person.count({ where: { id: person.id } })).toBe(0);
  });
});

describe('settings', () => {
  it('reads defaults and updates partially', async () => {
    expect(await getSettings()).toEqual({ theme: 'system', accent: '#f05a22', density: 'cozy', defaultView: 'board', showDone: true });
    await updateSettings({ theme: 'dark' });
    expect((await getSettings()).theme).toBe('dark');
  });

  it('stores showDone (default true)', async () => {
    expect((await getSettings()).showDone).toBe(true);
    await updateSettings({ showDone: false });
    expect(await getSettings()).toMatchObject({ theme: 'system', showDone: false });
    await updateSettings({ showDone: true });
    expect((await getSettings()).showDone).toBe(true);
  });

  it('returns defaults without writing when the settings row is missing', async () => {
    await prisma.settings.deleteMany();
    expect(await getSettings()).toEqual({ theme: 'system', accent: '#f05a22', density: 'cozy', defaultView: 'board', showDone: true });
    expect(await prisma.settings.count()).toBe(0);
    await updateSettings({ density: 'compact' });
    expect(await getSettings()).toEqual({ theme: 'system', accent: '#f05a22', density: 'compact', defaultView: 'board', showDone: true });
  });
});

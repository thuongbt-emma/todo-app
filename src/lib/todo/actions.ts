'use server';
import { revalidatePath } from 'next/cache';
import { z, ZodError } from 'zod';
import { assertAuthed } from '@/lib/auth/guard';
import { prisma } from '@/lib/db';
import { todayVN } from '@/lib/dates';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { importLines } from './bulk-import';
import * as notes from './notes';
import * as svc from './service';
import { createItem, deleteItem, updateItem, updateSettings, type AppSettings, type TaxonomyKind } from './taxonomy';

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await assertAuthed();
    const data = await fn();
    revalidatePath('/', 'layout');
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      console.error(e);
      return { ok: false, error: 'Dữ liệu không hợp lệ' };
    }
    if (!(e instanceof Error) || e.name.startsWith('PrismaClient')) {
      console.error(e);
      return { ok: false, error: 'Chưa lưu được, thử lại' };
    }
    return { ok: false, error: e.message };
  }
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const kind = z.enum(['group', 'tag', 'person']);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const quickAddInput = z.string().min(1).max(2000);
const requiredId = z.string().min(1);
const stepInput = z.string().max(500);

export async function quickAddAction(input: string, defaultGroupId: string) {
  return run(async () => {
    const text = quickAddInput.parse(input);
    const groupId = requiredId.parse(defaultGroupId);
    const groups = await prisma.group.findMany({ select: { name: true } });
    return svc.quickAdd(parseQuickAdd(text, todayVN(), groups.map((g) => g.name)), groupId);
  });
}

export async function addStepFromTextAction(cardId: string, raw: string) {
  return run(() => svc.addStepFromText(requiredId.parse(cardId), stepInput.parse(raw), todayVN()));
}

export async function undoAddStepAction(stepId: string) {
  return run(() => svc.undoAddStep(requiredId.parse(stepId)));
}

export async function updateStepFromTextAction(stepId: string, raw: string) {
  return run(() => svc.updateStepFromText(requiredId.parse(stepId), stepInput.parse(raw), todayVN()));
}

export async function updateCardAction(id: string, data: { title?: string; note?: string; tagIds?: string[] }) {
  return run(() => svc.updateCard(id, z.object({ title: z.string().optional(), note: z.string().optional(), tagIds: z.array(z.string()).optional() }).parse(data)));
}
export async function moveCardAction(id: string, groupId: string, order: number | null) {
  return run(() => svc.moveCard(id, groupId, z.number().finite().nullable().parse(order)));
}
export async function completeCardAction(id: string) { return run(() => svc.completeCard(id)); }
const receipt = z.object({
  cardId: z.string().min(1),
  cardTitle: z.string(),
  created: z.boolean(),
  stepIds: z.array(z.string().min(1)),
  addedTagIds: z.array(z.string().min(1)),
  prevGroupId: z.string().min(1).nullable(),
  prevOrder: z.number().finite().nullable(),
});

export async function undoQuickAddAction(r: svc.QuickAddReceipt) {
  return run(() => svc.undoQuickAdd(receipt.parse(r)));
}
export async function setStepDoneAtAction(id: string, iso: string) {
  return run(() => svc.setStepDoneAt(requiredId.parse(id), new Date(z.string().datetime().parse(iso))));
}
export async function completeCardAtAction(id: string, iso: string) {
  return run(() => svc.completeCardAt(requiredId.parse(id), new Date(z.string().datetime().parse(iso))));
}
export async function reopenCardAction(id: string) { return run(() => svc.reopenCard(id)); }
export async function deleteCardAction(id: string) { return run(() => svc.softDeleteCard(id)); }
export async function restoreCardAction(id: string) { return run(() => svc.restoreCard(id)); }

export async function updateStepAction(id: string, data: { text?: string; dueDate?: string | null; personId?: string | null }) {
  return run(() => svc.updateStep(id, z.object({ text: z.string().optional(), dueDate: day.optional(), personId: z.string().nullable().optional() }).parse(data)));
}
export async function toggleStepAction(id: string, done: boolean) { return run(() => svc.toggleStep(id, done)); }
export async function moveStepAction(id: string, order: number) { return run(() => svc.moveStep(id, z.number().finite().parse(order))); }
export async function deleteStepAction(id: string) { return run(() => svc.softDeleteStep(id)); }
export async function restoreStepAction(id: string) { return run(() => svc.restoreStep(id)); }

export async function createItemAction(k: TaxonomyKind, name: string, c: string) {
  return run(async () => { await createItem(kind.parse(k), name, color.parse(c)); });
}
export async function updateItemAction(k: TaxonomyKind, id: string, data: { name?: string; color?: string; order?: number }) {
  return run(() => updateItem(kind.parse(k), id, z.object({ name: z.string().optional(), color: color.optional(), order: z.number().finite().optional() }).parse(data)));
}
export async function deleteItemAction(k: TaxonomyKind, id: string) { return run(() => deleteItem(kind.parse(k), id)); }

export async function updateSettingsAction(data: Partial<AppSettings>) {
  const schema = z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    accent: color.optional(),
    density: z.enum(['compact', 'cozy']).optional(),
    defaultView: z.enum(['board', 'list', 'agenda']).optional(),
    showDone: z.boolean().optional(),
  });
  return run(() => updateSettings(schema.parse(data)));
}

const bulkText = z.string().max(20000, 'Tối đa 20000 ký tự mỗi lần nhập');

export async function bulkImportAction(text: string) {
  return run(async () => importLines(bulkText.parse(text), todayVN()));
}

const noteUpdate = z.object({
  title: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  pinned: z.boolean().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
});

export async function createNoteAction() {
  return run(() => notes.createNote());
}
export async function updateNoteAction(id: string, data: { title?: string; body?: string; pinned?: boolean; tagIds?: string[] }) {
  return run(() => notes.updateNote(requiredId.parse(id), noteUpdate.parse(data)));
}
export async function discardNoteIfEmptyAction(id: string) {
  return run(() => notes.discardIfEmpty(requiredId.parse(id)));
}
export async function deleteNoteAction(id: string) {
  return run(() => notes.softDeleteNote(requiredId.parse(id)));
}
export async function restoreNoteAction(id: string) {
  return run(async () => {
    await notes.restoreNote(requiredId.parse(id));
    revalidatePath('/notes');
  });
}

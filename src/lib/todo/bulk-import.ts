import { prisma } from '@/lib/db';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { splitStickySections } from '@/lib/quick-add/sticky';
import * as svc from './service';

export const BULK_MAX_CHARS = 20000;
export const BULK_MAX_LINES = 300;

export async function importLines(text: string, today: string): Promise<{ cards: number; steps: number; failed: string[] }> {
  const groups = await prisma.group.findMany({ orderBy: { order: 'asc' } });
  if (!groups.length) throw new Error('Chưa có nhóm nào');
  const names = groups.map((g) => g.name);
  const fallback = groups.find((g) => g.name === 'Đang làm') ?? groups[0];
  const entries = splitStickySections(text, names);
  if (entries.length > BULK_MAX_LINES) throw new Error(`Tối đa ${BULK_MAX_LINES} dòng mỗi lần nhập`);
  let cards = 0;
  let steps = 0;
  const failed: string[] = [];
  for (const { groupName, line } of entries) {
    try {
      const parsed = parseQuickAdd(line, today, names);
      const groupId = groups.find((g) => g.name === groupName)?.id ?? fallback.id;
      const r = await svc.quickAdd(parsed, groupId);
      if (r.created) cards++;
      steps += parsed.steps.length;
    } catch {
      failed.push(line);
    }
  }
  return { cards, steps, failed };
}

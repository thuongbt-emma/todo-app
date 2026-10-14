import { resolveDayMonth } from '@/lib/dates';

export type ParsedStep = { text: string; dueDate: string | null; person: string | null };
export type ParsedCard = { title: string; steps: ParsedStep[]; tags: string[]; groupName: string | null; unknownGroup: string | null };

const DATE_RE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?![\d/])/g;
const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]+)/gu;
const GROUP_RE = /(^|\s)!([\p{L}\p{N}_-]+)/gu;

export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

export function parseStep(raw: string, today: string): ParsedStep | null {
  let dueDate: string | null = null;
  let dateSpan: [number, number] | null = null;
  for (const m of raw.matchAll(DATE_RE)) {
    const resolved = resolveDayMonth(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null, today);
    if (resolved) {
      dueDate = resolved;
      dateSpan = [m.index!, m.index! + m[0].length];
    }
  }

  let person: string | null = null;
  let personSpan: [number, number] | null = null;
  const at = raw.indexOf('@');
  if (at >= 0) {
    const end = dateSpan && dateSpan[0] > at ? dateSpan[0] : raw.length;
    const name = squash(raw.slice(at + 1, end));
    if (name) {
      person = name;
      personSpan = [at, end];
    }
  }

  let text = raw;
  const spans = [dateSpan, personSpan].filter((s): s is [number, number] => s !== null).sort((a, b) => b[0] - a[0]);
  for (const [s, e] of spans) text = `${text.slice(0, s)} ${text.slice(e)}`;
  text = squash(text);

  if (!text && !person && !dueDate) return null;
  if (!text) text = person ? `Chờ ${person}` : 'Việc chưa đặt tên';
  return { text, dueDate, person };
}

export function parseQuickAdd(input: string, today: string, groupNames: string[]): ParsedCard {
  const tags: string[] = [];
  let groupName: string | null = null;
  let unknownGroup: string | null = null;

  let line = input.replace(TAG_RE, (_m, pre: string, tag: string) => {
    if (!tags.some((t) => fold(t) === fold(tag))) tags.push(tag);
    return pre;
  });
  line = line.replace(GROUP_RE, (_m, pre: string, key: string) => {
    const hit = groupNames.find((g) => fold(g).startsWith(fold(key)));
    if (hit) {
      if (!groupName) groupName = hit;
    } else if (!unknownGroup) unknownGroup = key;
    return pre;
  });

  const colon = line.indexOf(':');
  const title = squash(colon >= 0 ? line.slice(0, colon) : line);
  const rest = colon >= 0 ? line.slice(colon + 1) : '';
  const steps = rest
    .split(',')
    .map((s) => parseStep(s, today))
    .filter((s): s is ParsedStep => s !== null);

  return { title, steps, tags, groupName, unknownGroup };
}

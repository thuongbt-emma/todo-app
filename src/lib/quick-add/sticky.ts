import { fold } from './parse';

export function splitStickySections(text: string, groupNames: string[]): { groupName: string | null; line: string }[] {
  const out: { groupName: string | null; line: string }[] = [];
  let current: string | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = groupNames.find((g) => fold(g) === fold(line.replace(/:$/, '').trim()));
    if (header) {
      current = header;
      continue;
    }
    out.push({ groupName: current, line });
  }
  return out;
}

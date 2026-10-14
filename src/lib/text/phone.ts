export type Segment = { type: 'text'; value: string } | { type: 'phone'; value: string; tel: string };

const PHONE_RE = /(?<![\d+])(?:\+84|0)(?:[ .-]?\d){8,10}(?!\d)/g;

export function splitPhones(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(PHONE_RE)) {
    if (m.index! > last) out.push({ type: 'text', value: text.slice(last, m.index) });
    out.push({ type: 'phone', value: m[0], tel: m[0].replace(/[ .-]/g, '') });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

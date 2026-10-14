// palette.ts — colors auto-assigned to new tags/people, cycled by index
export const PALETTE = ['#3e63dd', '#e5484d', '#30a46c', '#f5a623', '#8e4ec6', '#12a594', '#d6409f', '#978365'];

export function pickColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export const ORDER_STEP = 1000;

/** Float sort key strictly between two neighbours (null = no neighbour on that side). */
export function between(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return ORDER_STEP;
  if (prev === null) return next! - ORDER_STEP;
  if (next === null) return prev + ORDER_STEP;
  return (prev + next) / 2;
}

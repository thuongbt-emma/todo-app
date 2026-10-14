/**
 * Same title as the server's merge lookup (`equals` with `mode: 'insensitive'`): case-insensitive,
 * but diacritics still count, so "Đi chợ" and "Di cho" are different cards.
 */
export function sameTitle(a: string, b: string): boolean {
  return a.toLocaleLowerCase('vi') === b.toLocaleLowerCase('vi');
}

/** State updater that clears the quick-add box only if the user has not typed something new since submitting. */
export const clearIfSubmitted = (submitted: string) => (current: string) => (current === submitted ? '' : current);

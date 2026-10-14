export const UNDO_LIMIT = 20;
export type UndoEntry = { id: number; label: string; undone: boolean };
export function pushEntry(entries: UndoEntry[], e: UndoEntry): UndoEntry[] {
  return [...entries, e].slice(-UNDO_LIMIT);
}
export function latestPending(entries: UndoEntry[]): UndoEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i--) if (!entries[i].undone) return entries[i];
  return undefined;
}
export function markUndone(entries: UndoEntry[], id: number): UndoEntry[] {
  return entries.map((e) => (e.id === id ? { ...e, undone: true } : e));
}
const TEXT_INPUT_TYPES = new Set([
  'text', 'search', 'email', 'url', 'tel', 'number', 'password', 'date', 'datetime-local', 'month', 'time', 'week',
]);

type FocusLike = {
  tagName?: string;
  isContentEditable?: boolean;
  type?: string;
  value?: string;
  dataset?: { undoWhenEmpty?: string };
};

/**
 * True when keyboard focus is in a text-entry control, where native Ctrl+Z must win.
 * An empty input marked `data-undo-when-empty` has nothing to undo natively, so app undo runs.
 */
export function isTypingTarget(el: FocusLike | null): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? '').toUpperCase();
  if (tag === 'INPUT') {
    if (!TEXT_INPUT_TYPES.has((el.type || 'text').toLowerCase())) return false;
    if (el.value === '' && el.dataset?.undoWhenEmpty !== undefined) return false;
    return true;
  }
  return tag === 'TEXTAREA' || tag === 'SELECT';
}

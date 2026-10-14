import { describe, expect, it } from 'vitest';
import { UNDO_LIMIT, isTypingTarget, latestPending, markUndone, pushEntry, type UndoEntry } from './stack';

const e = (id: number, undone = false): UndoEntry => ({ id, label: `l${id}`, undone });

describe('undo stack', () => {
  it('keeps at most UNDO_LIMIT entries, dropping the oldest', () => {
    let s: UndoEntry[] = [];
    for (let i = 1; i <= UNDO_LIMIT + 5; i++) s = pushEntry(s, e(i));
    expect(s).toHaveLength(UNDO_LIMIT);
    expect(s[0].id).toBe(6);
    expect(s[s.length - 1].id).toBe(UNDO_LIMIT + 5);
  });
  it('latestPending skips undone entries', () => {
    expect(latestPending([e(1), e(2, true), e(3, true)])?.id).toBe(1);
    expect(latestPending([e(1, true)])).toBeUndefined();
    expect(latestPending([])).toBeUndefined();
  });
  it('markUndone marks only one entry', () => {
    const s = markUndone([e(1), e(2), e(3)], 2);
    expect(s.map((x) => x.undone)).toEqual([false, true, false]);
  });
  it('isTypingTarget', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true);
    expect(isTypingTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
  it('isTypingTarget: only text-like INPUT types are typing targets', () => {
    for (const type of ['text', 'search', 'email', 'url', 'tel', 'number', 'password', 'date', 'datetime-local', 'month', 'time', 'week', 'TEXT']) {
      expect(isTypingTarget({ tagName: 'INPUT', type }), type).toBe(true);
    }
    expect(isTypingTarget({ tagName: 'INPUT', type: '' })).toBe(true);
    for (const type of ['checkbox', 'radio', 'button', 'submit', 'color', 'range', 'file']) {
      expect(isTypingTarget({ tagName: 'INPUT', type }), type).toBe(false);
    }
  });
  it('isTypingTarget: empty input marked data-undo-when-empty yields to app undo', () => {
    const marked = { undoWhenEmpty: '' };
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text', value: '', dataset: marked })).toBe(false);
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text', value: 'abc', dataset: marked })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text', value: '', dataset: {} })).toBe(true);
    expect(isTypingTarget({ tagName: 'INPUT', type: 'text', value: '' })).toBe(true);
  });
});

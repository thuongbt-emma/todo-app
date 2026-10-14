'use client';
import { useEffect, useRef, useState } from 'react';
import { addStepFromTextAction, undoAddStepAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

// Keep presses and keys here away from the Board's card drag.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
// Ctrl/Cmd+Z still bubbles to the app's undo listener on window (it decides via data-undo-when-empty).
const stopKey = (e: React.KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') return;
  e.stopPropagation();
};
const isolate = { onPointerDown: stop, onMouseDown: stop, onTouchStart: stop, onKeyDown: stopKey };

/**
 * "+ Thêm bước" at the bottom of a card: opens a quick-add style input. Enter saves and stays open
 * for the next step; Esc (or blur while empty) closes; blur with text saves, then closes.
 */
export function AddStepInline({ cardId }: { cardId: string }) {
  const toast = useToast();
  const undo = useUndo();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const closeAfterSave = useRef(false);
  const cancelled = useRef(false); // Esc discards; the blur fired as the input unmounts must not save

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const save = async (thenClose: boolean) => {
    if (thenClose) closeAfterSave.current = true;
    if (saving.current) return;
    const raw = text;
    if (!raw.trim()) {
      close();
      return;
    }
    saving.current = true;
    const r = await safeAction(addStepFromTextAction(cardId, raw));
    saving.current = false;
    const shouldClose = closeAfterSave.current;
    closeAfterSave.current = false;
    if (!r.ok) {
      toast.show(r.error, 'error');
      return;
    }
    undo.push(`Đã thêm bước "${r.data.text}"`, () => undoAddStepAction(r.data.id));
    if (shouldClose) close();
    else setText((t) => (t === raw ? '' : t)); // keep anything typed during the save
  };

  if (!open) {
    return (
      <button
        type="button"
        {...isolate}
        onClick={() => {
          cancelled.current = false;
          setOpen(true);
        }}
        className="mt-1 min-h-6 rounded px-1 text-left text-xs text-muted hover:bg-surface-2 hover:text-fg [@media(hover:none)]:min-h-10"
      >
        + Thêm bước
      </button>
    );
  }

  return (
    <div {...isolate} className="mt-1">
      <input
        ref={input}
        aria-label="Thêm bước"
        data-undo-when-empty
        placeholder="Bước mới… (vd: gửi file @c Na 16/10)"
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (cancelled.current) return;
          if (text.trim()) void save(true);
          else if (!saving.current) close();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void save(false);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelled.current = true;
            closeAfterSave.current = false;
            close();
          }
        }}
        className="w-full rounded border border-line bg-bg px-1 text-sm [@media(hover:none)]:min-h-10"
      />
    </div>
  );
}

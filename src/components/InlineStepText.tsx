'use client';
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { dateToDay } from '@/lib/dates';
import { parseStep } from '@/lib/quick-add/parse';
import { stepToText } from '@/lib/quick-add/step-text';
import { updateStepAction, updateStepFromTextAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import type { CardWithRelations } from '@/lib/todo/queries';
import { useToast, useUndo } from './Toast';

type Step = CardWithRelations['steps'][number];
type Shown = { text: string; person: string | null; dueDate: string | null };

// Keep pointer/touch presses on the text away from @dnd-kit's listeners on the Board card wrapper.
const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const noDrag = { onPointerDown: stop, onMouseDown: stop, onTouchStart: stop };

/**
 * Step text + @person that turns into a quick-add style input on click (or Enter/Space).
 * Enter/blur saves via updateStepFromTextAction, Esc cancels; the due badge is rendered by the caller from `due`.
 */
export function InlineStepText({
  step, today, done, renderDue,
}: { step: Step; today: string; done: boolean; renderDue: (day: string) => React.ReactNode }) {
  const toast = useToast();
  const undo = useUndo();
  const [, start] = useTransition();
  const saved: Shown = { text: step.text, person: step.person?.name ?? null, dueDate: step.dueDate ? dateToDay(step.dueDate) : null };
  const [shown, setShown] = useOptimistic(saved);
  const [draft, setDraft] = useState<string | null>(null);
  const finished = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLSpanElement>(null);
  const refocus = useRef(false); // Enter/Esc hand focus back to the text; blur leaves it where the user moved it
  const editing = draft !== null;
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (refocus.current) {
      refocus.current = false;
      trigger.current?.focus();
    }
  }, [editing]);

  const begin = () => {
    finished.current = false;
    setDraft(stepToText(saved, today));
  };

  const finish = (save: boolean) => {
    if (finished.current || draft === null) return;
    finished.current = true;
    const raw = draft;
    setDraft(null);
    if (!save) return;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === stepToText(saved, today)) return;
    const parsed = parseStep(trimmed, today);
    if (!parsed) return;
    const prev = { text: step.text, dueDate: saved.dueDate, personId: step.personId };
    start(async () => {
      setShown(parsed);
      const r = await safeAction(updateStepFromTextAction(step.id, trimmed));
      if (!r.ok) {
        toast.show(r.error, 'error');
        return;
      }
      undo.push(`Đã sửa bước "${prev.text}"`, () => updateStepAction(step.id, prev));
    });
  };

  if (draft !== null) {
    return (
      <input
        {...noDrag}
        ref={input}
        aria-label="Sửa bước"
        value={draft}
        maxLength={500}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => finish(true)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            refocus.current = true;
            finish(true);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            refocus.current = true;
            finish(false);
          }
        }}
        className="min-w-0 flex-1 rounded border border-line bg-bg px-1 text-sm"
      />
    );
  }

  return (
    <>
      <span
        {...noDrag}
        ref={trigger}
        role="button"
        tabIndex={0}
        aria-label="Sửa bước"
        onClick={begin}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            begin();
          }
        }}
        className={`min-w-0 flex-1 cursor-text rounded hover:bg-surface-2 ${done ? 'text-muted line-through' : ''}`}
      >
        {shown.text}
        {shown.person && <span className="ml-1 text-xs text-muted">@{shown.person}</span>}
      </span>
      {shown.dueDate && renderDue(shown.dueDate)}
    </>
  );
}

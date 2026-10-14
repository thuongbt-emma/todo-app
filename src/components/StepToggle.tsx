'use client';
import { useOptimistic, useTransition } from 'react';
import { setStepDoneAtAction, toggleStepAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

type Props = {
  stepId: string;
  done: boolean;
  label: string;
  doneAt?: Date | string | null;
  onChange?: (done: boolean) => void;
};

export function StepToggle({ stepId, done, label, doneAt, onChange }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(done);
  const [, start] = useTransition();
  const toast = useToast();
  const undo = useUndo();
  return (
    <input
      type="checkbox"
      aria-label="Đánh dấu xong"
      checked={optimistic}
      onChange={(e) => {
        const next = e.target.checked;
        const prevIso = doneAt ? new Date(doneAt).toISOString() : null;
        // Outside the transition so the parent's overlay (strike-through, position, linger) commits right away
        // instead of waiting for the action + revalidation; still before the await so revalidation can't beat it.
        onChange?.(next);
        start(async () => {
          setOptimistic(next);
          const r = await safeAction(toggleStepAction(stepId, next));
          if (!r.ok) {
            onChange?.(!next);
            toast.show(r.error, 'error');
            return;
          }
          if (next) undo.push('Đã xong: ' + label, () => toggleStepAction(stepId, false));
          else if (prevIso) undo.push('Đã bỏ đánh dấu: ' + label, () => setStepDoneAtAction(stepId, prevIso));
        });
      }}
      className="mt-0.5 size-4 shrink-0 cursor-pointer"
    />
  );
}

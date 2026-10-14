'use client';
import { useTransition } from 'react';
import { completeCardAtAction, reopenCardAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

/** `completedAt` is the card's original completion time (ISO); undo restores it exactly. */
export function LogReopen({ cardId, title, completedAt }: { cardId: string; title: string; completedAt: string }) {
  const toast = useToast();
  const undo = useUndo();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await safeAction(reopenCardAction(cardId));
          if (!r.ok) toast.show(r.error, 'error');
          else undo.push(`Đã mở lại "${title}"`, () => completeCardAtAction(cardId, completedAt));
        })
      }
      className="text-xs text-muted hover:underline disabled:opacity-60"
    >
      Mở lại
    </button>
  );
}

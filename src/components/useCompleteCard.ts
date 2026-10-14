'use client';
import { useTransition } from 'react';
import { completeCardAction, reopenCardAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

/** Completes a card and pushes the "Hoàn tác" toast. Shared by the card chip and the drawer button. */
export function useCompleteCard(card: { id: string; title: string }) {
  const toast = useToast();
  const undo = useUndo();
  const [pending, start] = useTransition();
  const complete = (after?: () => void) =>
    start(async () => {
      const r = await safeAction(completeCardAction(card.id));
      if (!r.ok) {
        toast.show(r.error, 'error');
        return;
      }
      undo.push(`Đã hoàn thành "${card.title}"`, () => reopenCardAction(card.id));
      after?.();
    });
  return { complete, pending };
}

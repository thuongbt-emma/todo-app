'use client';
import { useTransition } from 'react';
import { noteLabel } from '@/lib/text/note-label';
import { deleteCardAction, deleteNoteAction, deleteStepAction, restoreCardAction, restoreNoteAction, restoreStepAction, type ActionResult } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

type Props = {
  cards: { id: string; title: string }[];
  steps: { id: string; text: string; cardTitle: string }[];
  notes: { id: string; title: string; body: string }[];
};

export function TrashList({ cards, steps, notes }: Props) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const undo = useUndo();
  if (!cards.length && !steps.length && !notes.length) return <p className="text-sm text-muted">Thùng rác trống.</p>;
  const row = (key: string, label: React.ReactNode, name: string, restore: () => Promise<ActionResult<unknown>>, redo: () => Promise<ActionResult<unknown>>) => (
    <li key={key} className="flex items-center gap-2 py-1 text-sm">
      <span className="min-w-0 flex-1">{label}</span>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await safeAction(restore());
            if (!r.ok) toast.show(r.error, 'error');
            else undo.push(`Đã khôi phục "${name}"`, redo);
          })
        }
        className="text-accent"
      >
        Khôi phục
      </button>
    </li>
  );
  return (
    <ul className="divide-y divide-line">
      {cards.map((c) => row(`c-${c.id}`, <b>{c.title}</b>, c.title, () => restoreCardAction(c.id), () => deleteCardAction(c.id)))}
      {steps.map((s) => row(`s-${s.id}`, <>{s.text} <span className="text-muted">· {s.cardTitle}</span></>, s.text, () => restoreStepAction(s.id), () => deleteStepAction(s.id)))}
      {notes.map((n) => {
        const name = noteLabel(n.title, n.body);
        return row(`n-${n.id}`, <>{name} <span className="text-muted">· Ghi chú</span></>, name, () => restoreNoteAction(n.id), () => deleteNoteAction(n.id));
      })}
    </ul>
  );
}

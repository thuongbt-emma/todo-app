'use client';
import { createContext, useContext, useState } from 'react';
import { updateSettingsAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast } from './Toast';

type ShowDoneApi = { showDone: boolean; toggle: () => void };

// Outside a provider (Agenda, drawer) done steps are always shown.
const Ctx = createContext<ShowDoneApi>({ showDone: true, toggle: () => {} });

/** Holds the "show done steps" setting for a Board/List page so the toggle flips cards optimistically. */
export function ShowDoneProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  const [showDone, setShowDone] = useState(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setShowDone(initial);
  }
  const toast = useToast();
  const toggle = () => {
    const next = !showDone;
    setShowDone(next);
    void safeAction(updateSettingsAction({ showDone: next })).then((r) => {
      if (r.ok) return;
      setShowDone(!next);
      toast.show(r.error, 'error');
    });
  };
  return <Ctx.Provider value={{ showDone, toggle }}>{children}</Ctx.Provider>;
}

export function useShowDone(): boolean {
  return useContext(Ctx).showDone;
}

export function ShowDoneToggle() {
  const { showDone, toggle } = useContext(Ctx);
  return (
    <button
      type="button"
      aria-pressed={showDone}
      onClick={toggle}
      className="min-h-10 shrink-0 rounded-full border border-line px-3 text-xs text-muted hover:text-fg sm:min-h-7"
    >
      {showDone ? '👁 Đang hiện việc đã xong' : '🙈 Đang ẩn việc đã xong'}
    </button>
  );
}

/** Renders children only while done items are shown. */
export function ShowDoneGate({ children }: { children: React.ReactNode }) {
  return useShowDone() ? <>{children}</> : null;
}

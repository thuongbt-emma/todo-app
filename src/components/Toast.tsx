'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ActionResult } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { isTypingTarget, latestPending, markUndone, pushEntry, type UndoEntry } from '@/lib/undo/stack';

type ToastAction = { label: string; run: () => void };
type Toast = { id: number; text: string; tone: 'info' | 'error'; action?: ToastAction };
type ToastApi = { show: (text: string, tone?: 'info' | 'error', action?: ToastAction) => void };
type UndoApi = { push: (label: string, undo: () => Promise<ActionResult<unknown>>) => void };

const Ctx = createContext<ToastApi>({ show: () => {} });
const UndoCtx = createContext<UndoApi>({ push: () => {} });
export const useToast = () => useContext(Ctx);
export const useUndo = () => useContext(UndoCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const entriesRef = useRef<UndoEntry[]>([]);
  const fns = useRef(new Map<number, () => Promise<ActionResult<unknown>>>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ToastApi['show']>(
    (text, tone = 'info', action) => {
      const id = ++seq.current;
      setToasts((t) => [...t, { id, text, tone, action }]);
      const timer = setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, action ? 8000 : 3500);
      timers.current.add(timer);
    },
    [dismiss],
  );

  const undoById = useCallback(
    async (id: number) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      const fn = fns.current.get(id);
      if (!entry || entry.undone || !fn) return;
      entriesRef.current = markUndone(entriesRef.current, id);
      const r = await safeAction(Promise.resolve().then(fn));
      if (r.ok) show(`Đã hoàn tác: ${entry.label}`);
      else show(`Không hoàn tác được: ${r.error}`, 'error');
    },
    [show],
  );

  const push = useCallback<UndoApi['push']>(
    (label, undo) => {
      const id = ++seq.current;
      const next = pushEntry(entriesRef.current, { id, label, undone: false });
      entriesRef.current = next;
      fns.current.set(id, undo);
      for (const k of fns.current.keys()) if (!next.some((e) => e.id === k)) fns.current.delete(k);
      show(label, 'info', { label: 'Hoàn tác', run: () => void undoById(id) });
    },
    [show, undoById],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.repeat || e.altKey || e.key.toLowerCase() !== 'z') return;
      if (isTypingTarget(document.activeElement as HTMLElement | null)) return;
      e.preventDefault();
      const e2 = latestPending(entriesRef.current);
      if (e2) void undoById(e2.id);
      else show('Không còn gì để hoàn tác');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show, undoById]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      t.clear();
    };
  }, []);

  const toastApi = useMemo(() => ({ show }), [show]);
  const undoApi = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={toastApi}>
      <UndoCtx.Provider value={undoApi}>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map((t) => (
            <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2 text-sm text-white shadow-lg ${t.tone === 'error' ? 'bg-danger' : 'bg-neutral-800'}`}>
              <span>{t.text}</span>
              {t.action && (
                <button className="font-semibold underline" onClick={() => { t.action!.run(); dismiss(t.id); }}>
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </UndoCtx.Provider>
    </Ctx.Provider>
  );
}

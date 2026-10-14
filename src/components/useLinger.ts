'use client';
import { useCallback, useEffect, useState } from 'react';
import { createLingerTimers } from '@/lib/linger-timers';

export const LINGER_MS = 4000;

/** onExpire is captured once, so it must only call stable setters. Tracks ids that stay visible for LINGER_MS after being ticked. Timers are cleared on unmount. */
export function useLinger(onExpire?: (id: string) => void) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set());
  const drop = useCallback((id: string) => setIds((s) => {
    if (!s.has(id)) return s;
    const n = new Set(s);
    n.delete(id);
    return n;
  }), []);
  const [timers] = useState(() => createLingerTimers(LINGER_MS, (id) => { drop(id); onExpire?.(id); }));

  const add = useCallback((id: string) => {
    setIds((s) => new Set(s).add(id));
    timers.add(id);
  }, [timers]);
  const remove = useCallback((id: string) => {
    timers.remove(id);
    drop(id);
  }, [timers, drop]);

  useEffect(() => () => timers.clear(), [timers]);

  /** Pass to StepToggle's onChange. */
  const onToggle = useCallback((id: string, done: boolean) => (done ? add(id) : remove(id)), [add, remove]);

  return { ids, add, remove, onToggle };
}

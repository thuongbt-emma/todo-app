/** Pure timer bookkeeping for lingering ids: each id expires `ms` after its last add. */
export function createLingerTimers(ms: number, onExpire: (id: string) => void) {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    add(id: string) {
      const old = timers.get(id);
      if (old) clearTimeout(old);
      timers.set(id, setTimeout(() => { timers.delete(id); onExpire(id); }, ms));
    },
    remove(id: string) {
      const t = timers.get(id);
      if (t) clearTimeout(t);
      timers.delete(id);
    },
    clear() {
      timers.forEach(clearTimeout);
      timers.clear();
    },
    has: (id: string) => timers.has(id),
  };
}

// in-memory is enough for one user on one container

/**
 * Rate-limit key from `x-forwarded-for`: the rightmost non-empty hop is the one our
 * reverse proxy appended, so a client cannot spoof it by sending its own header.
 */
export function clientKey(xff: string | null | undefined): string {
  const hops = (xff ?? '').split(',').map((h) => h.trim()).filter(Boolean);
  return hops.at(-1) ?? 'local';
}

export class LoginLimiter {
  private fails = new Map<string, number[]>();
  private lockedUntil = new Map<string, number>();
  private globalFails: number[] = [];

  constructor(
    private max = 5,
    private windowMs = 600_000,
    private lockMs = 600_000,
    private globalMax = 20,
  ) {}

  isLocked(key: string, now = Date.now()): boolean {
    if (this.globalFails.filter((t) => now - t < this.windowMs).length >= this.globalMax) return true;
    return (this.lockedUntil.get(key) ?? 0) > now;
  }

  recordFailure(key: string, now = Date.now()) {
    this.prune(now);
    this.globalFails.push(now);
    const recent = this.fails.get(key) ?? [];
    recent.push(now);
    if (recent.length >= this.max) {
      this.lockedUntil.set(key, now + this.lockMs);
      this.fails.delete(key);
    } else {
      this.fails.set(key, recent);
    }
  }

  reset(key: string) {
    this.fails.delete(key);
    this.lockedUntil.delete(key);
  }

  /** Number of keys holding state (failures or a lock); for tests. */
  get trackedKeys(): number {
    return new Set([...this.fails.keys(), ...this.lockedUntil.keys()]).size;
  }

  private prune(now: number) {
    const live = (t: number) => now - t < this.windowMs;
    this.globalFails = this.globalFails.filter(live);
    for (const [k, ts] of this.fails) {
      const kept = ts.filter(live);
      if (kept.length) this.fails.set(k, kept);
      else this.fails.delete(k);
    }
    for (const [k, until] of this.lockedUntil) {
      if (until <= now) this.lockedUntil.delete(k);
    }
  }
}

export const loginLimiter = new LoginLimiter();

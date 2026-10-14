import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLingerTimers } from './linger-timers';

describe('createLingerTimers', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('expires an id after the delay', () => {
    const fn = vi.fn();
    const t = createLingerTimers(4000, fn);
    t.add('a');
    vi.advanceTimersByTime(3999);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledWith('a');
    expect(t.has('a')).toBe(false);
  });

  it('re-adding restarts the timer; remove cancels', () => {
    const fn = vi.fn();
    const t = createLingerTimers(4000, fn);
    t.add('a');
    vi.advanceTimersByTime(3000);
    t.add('a');
    vi.advanceTimersByTime(3000);
    expect(fn).not.toHaveBeenCalled();
    t.remove('a');
    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('clear cancels everything', () => {
    const fn = vi.fn();
    const t = createLingerTimers(4000, fn);
    t.add('a'); t.add('b');
    t.clear();
    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { assertAuthed, isAuthed } from './guard';

const original = process.env.AUTH_DISABLED;
afterEach(() => {
  if (original === undefined) delete process.env.AUTH_DISABLED;
  else process.env.AUTH_DISABLED = original;
});

describe('isAuthed with AUTH_DISABLED', () => {
  it('resolves true without a cookie when disabled', async () => {
    process.env.AUTH_DISABLED = 'true';
    expect(await isAuthed()).toBe(true);
    await expect(assertAuthed()).resolves.toBeUndefined();
  });
  it('resolves false without a cookie when unset', async () => {
    delete process.env.AUTH_DISABLED;
    expect(await isAuthed()).toBe(false);
    await expect(assertAuthed()).rejects.toThrow();
  });
});

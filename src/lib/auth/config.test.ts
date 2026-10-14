import { afterEach, describe, expect, it } from 'vitest';
import { authDisabled } from './config';

const original = process.env.AUTH_DISABLED;
afterEach(() => {
  if (original === undefined) delete process.env.AUTH_DISABLED;
  else process.env.AUTH_DISABLED = original;
});

describe('authDisabled', () => {
  it('is true only for the exact string "true"', () => {
    process.env.AUTH_DISABLED = 'true';
    expect(authDisabled()).toBe(true);
    for (const v of ['', 'false', '1', 'TRUE', 'yes']) {
      process.env.AUTH_DISABLED = v;
      expect(authDisabled()).toBe(false);
    }
    delete process.env.AUTH_DISABLED;
    expect(authDisabled()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { safeAction } from './safe-action';

describe('safeAction', () => {
  it('passes a resolved result through', async () => {
    expect(await safeAction(Promise.resolve({ ok: true as const, data: 5 }))).toEqual({ ok: true, data: 5 });
  });
  it('turns a rejection into an error result', async () => {
    expect(await safeAction(Promise.reject(new Error('net')))).toEqual({ ok: false, error: 'Chưa lưu được, thử lại' });
  });
});

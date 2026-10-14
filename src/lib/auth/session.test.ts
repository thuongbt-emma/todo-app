import { describe, expect, it } from 'vitest';
import { createSessionToken, SESSION_TTL_MS, verifySessionToken } from './session';

const SECRET = 'a'.repeat(64);

describe('session token', () => {
  it('accepts a fresh token', async () => {
    const t = await createSessionToken(SECRET, 1_000);
    expect(await verifySessionToken(t, SECRET, 2_000)).toBe(true);
  });
  it('rejects expired, tampered, wrong-secret, empty', async () => {
    const t = await createSessionToken(SECRET, 1_000);
    expect(await verifySessionToken(t, SECRET, 1_000 + SESSION_TTL_MS + 1)).toBe(false);
    const [exp, sig] = t.split('.');
    expect(await verifySessionToken(`${Number(exp) + 1}.${sig}`, SECRET, 2_000)).toBe(false);
    expect(await verifySessionToken(t, 'b'.repeat(64), 2_000)).toBe(false);
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken(t, '', 2_000)).toBe(false);
  });
  it('rejects signatures that differ in length or in a single char', async () => {
    const t = await createSessionToken(SECRET, 1_000);
    const [exp, sig] = t.split('.');
    expect(await verifySessionToken(`${exp}.${sig.slice(0, -1)}`, SECRET, 2_000)).toBe(false);
    expect(await verifySessionToken(`${exp}.${sig}A`, SECRET, 2_000)).toBe(false);
    const flipped = sig.slice(0, -1) + (sig.at(-1) === 'A' ? 'B' : 'A');
    expect(await verifySessionToken(`${exp}.${flipped}`, SECRET, 2_000)).toBe(false);
  });
});

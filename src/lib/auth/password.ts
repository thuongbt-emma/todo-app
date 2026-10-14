import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// Format "scrypt:<saltHex>:<hashHex>" — no "$" because Next's env loader expands it.
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(':');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const actual = scryptSync(pw, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

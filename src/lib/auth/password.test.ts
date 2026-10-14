import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('verifies the right password only', () => {
    const stored = hashPassword('đúng rồi');
    expect(stored.startsWith('scrypt:')).toBe(true);
    expect(stored).not.toContain('$');
    expect(verifyPassword('đúng rồi', stored)).toBe(true);
    expect(verifyPassword('sai', stored)).toBe(false);
  });
  it('rejects malformed hashes', () => {
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', 'bcrypt:a:b')).toBe(false);
  });
});

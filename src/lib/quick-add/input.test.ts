import { describe, expect, it } from 'vitest';
import { clearIfSubmitted, sameTitle } from './input';

describe('sameTitle (mirrors the server merge, mode: insensitive)', () => {
  it('ignores case, including Vietnamese letters', () => {
    expect(sameTitle('AP27', 'ap27')).toBe(true);
    expect(sameTitle('ĐI CHỢ', 'đi chợ')).toBe(true);
  });
  it('does not fold diacritics', () => {
    expect(sameTitle('Đi chợ', 'Di cho')).toBe(false);
    expect(sameTitle('bàn', 'bán')).toBe(false);
  });
});

describe('clearIfSubmitted', () => {
  it('clears only when the input still holds the submitted text', () => {
    expect(clearIfSubmitted('A: x')('A: x')).toBe('');
    expect(clearIfSubmitted('A: x')('B: typed meanwhile')).toBe('B: typed meanwhile');
  });
});

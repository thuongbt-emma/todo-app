import { describe, expect, it } from 'vitest';
import { between, ORDER_STEP } from './order';

describe('between', () => {
  it('first item', () => expect(between(null, null)).toBe(ORDER_STEP));
  it('append', () => expect(between(3000, null)).toBe(4000));
  it('prepend', () => expect(between(null, 1000)).toBe(0));
  it('middle', () => expect(between(1000, 2000)).toBe(1500));
});

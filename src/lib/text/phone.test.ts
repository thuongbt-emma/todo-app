import { describe, expect, it } from 'vitest';
import { splitPhones } from './phone';

const phones = (s: string) => splitPhones(s).filter((x) => x.type === 'phone');

describe('splitPhones', () => {
  it('finds a plain number', () => {
    expect(splitPhones('Anh A - 0900123456')).toEqual([
      { type: 'text', value: 'Anh A - ' },
      { type: 'phone', value: '0900123456', tel: '0900123456' },
    ]);
  });
  it('normalises spaces and dots', () => {
    expect(phones('0900 123 456')[0]).toMatchObject({ tel: '0900123456' });
    expect(phones('0900.123.456')[0]).toMatchObject({ tel: '0900123456' });
  });
  it('handles +84', () => {
    expect(phones('+84 900 123 456')[0]).toMatchObject({ tel: '+84900123456' });
  });
  it('ignores addresses, years and overlong digit runs', () => {
    expect(splitPhones('Lô Z06, Đường số 13')).toEqual([{ type: 'text', value: 'Lô Z06, Đường số 13' }]);
    expect(phones('năm 2026')).toEqual([]);
    expect(phones('12345678901234')).toEqual([]);
  });
});

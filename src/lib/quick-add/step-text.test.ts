import { describe, expect, it } from 'vitest';
import { parseStep } from './parse';
import { stepToText } from './step-text';

const T = '2026-10-12';

describe('stepToText', () => {
  it('formats text only', () => {
    expect(stepToText({ text: 'gửi file', person: null, dueDate: null })).toBe('gửi file');
  });

  it('appends @person and d/m', () => {
    expect(stepToText({ text: 'gửi file', person: 'c Na', dueDate: '2026-10-15' }, T)).toBe('gửi file @c Na 15/10');
  });

  it('accepts Date due dates and person objects', () => {
    expect(stepToText({ text: 'ký', person: { name: 'Na' }, dueDate: new Date('2026-11-02T00:00:00.000Z') }, T)).toBe('ký @Na 2/11');
  });

  it('adds the year only when d/m alone would resolve to another year', () => {
    expect(stepToText({ text: 'x', person: null, dueDate: '2027-01-05' }, T)).toBe('x 5/1');
    expect(stepToText({ text: 'x', person: null, dueDate: '2027-09-01' }, T)).toBe('x 1/9/2027');
    expect(stepToText({ text: 'x', person: null, dueDate: '2026-03-01' }, T)).toBe('x 1/3/2026');
  });

  it.each([
    { text: 'gửi file', person: null, dueDate: null },
    { text: 'gửi file', person: 'c Na', dueDate: null },
    { text: 'gửi file', person: null, dueDate: '2026-10-15' },
    { text: 'gửi file', person: 'c Na', dueDate: '2026-10-15' },
    { text: 'final', person: 'Na', dueDate: '2026-09-20' },
    { text: 'review', person: null, dueDate: '2027-09-01' },
    { text: 'nộp', person: 'anh Bình', dueDate: '2026-12-31' },
  ])('round-trips through parseStep: %o', (step) => {
    expect(parseStep(stepToText(step, T), T)).toEqual(step);
  });
});

import { describe, expect, it } from 'vitest';
import { fold, parseQuickAdd, parseStep } from './parse';

const T = '2026-10-03';
const G = ['Urgent', 'Đang làm', 'Later', 'Waiting'];

describe('parseStep', () => {
  it('takes the last date token as due date', () => {
    expect(parseStep(' final 5/10', T)).toEqual({ text: 'final', dueDate: '2026-10-05', person: null });
  });
  it('person runs from @ to the date', () => {
    expect(parseStep('submit @c Na 6/10', T)).toEqual({ text: 'submit', dueDate: '2026-10-06', person: 'c Na' });
  });
  it('person runs to end when no date follows', () => {
    expect(parseStep('chờ rep @chị Vi', T)).toEqual({ text: 'chờ rep', dueDate: null, person: 'chị Vi' });
  });
  it('person-only step gets a "Chờ" text', () => {
    expect(parseStep('@c Na 6/10', T)).toEqual({ text: 'Chờ c Na', dueDate: '2026-10-06', person: 'c Na' });
  });
  it('keeps invalid dates as text', () => {
    expect(parseStep('gửi 32/10', T)).toEqual({ text: 'gửi 32/10', dueDate: null, person: null });
  });
  it('accepts explicit year and past dates', () => {
    expect(parseStep('check 30/9', T)?.dueDate).toBe('2026-09-30');
    expect(parseStep('họp 2/1/2027', T)?.dueDate).toBe('2027-01-02');
  });
  it('returns null for empty steps', () => {
    expect(parseStep('   ', T)).toBeNull();
  });
});

describe('parseQuickAdd', () => {
  it('parses a full sticky-note line', () => {
    expect(parseQuickAdd('AP27: chờ Duý 2/10, plan POSM???, final 5/10, submit @c Na 6/10', T, G)).toEqual({
      title: 'AP27',
      tags: [],
      groupName: null,
      unknownGroup: null,
      steps: [
        { text: 'chờ Duý', dueDate: '2026-10-02', person: null },
        { text: 'plan POSM???', dueDate: null, person: null },
        { text: 'final', dueDate: '2026-10-05', person: null },
        { text: 'submit', dueDate: '2026-10-06', person: 'c Na' },
      ],
    });
  });
  it('title may itself look like a date', () => {
    const r = parseQuickAdd('20/10: check PUR mua POSM 30/9, gửi design 6/10', T, G);
    expect(r.title).toBe('20/10');
    expect(r.steps.map((s) => s.dueDate)).toEqual(['2026-09-30', '2026-10-06']);
  });
  it('line without colon is a card with no steps', () => {
    expect(parseQuickAdd('sắp xếp folder team', T, G)).toEqual({ title: 'sắp xếp folder team', steps: [], tags: [], groupName: null, unknownGroup: null });
  });
  it('extracts tags and group anywhere in the line', () => {
    const r = parseQuickAdd('!later POSM: xuất cho EB 50 cái nón 3/11 #posm #Event', T, G);
    expect(r.groupName).toBe('Later');
    expect(r.tags).toEqual(['posm', 'Event']);
    expect(r.title).toBe('POSM');
    expect(r.steps).toEqual([{ text: 'xuất cho EB 50 cái nón', dueDate: '2026-11-03', person: null }]);
  });
  it('group prefix match ignores case and diacritics', () => {
    expect(parseQuickAdd('!dang Ticket: build', T, G).groupName).toBe('Đang làm');
    expect(parseQuickAdd('!xyz Ticket: build', T, G).groupName).toBeNull();
  });
  it('reports the first !token matching no group', () => {
    const r = parseQuickAdd('!xyz A: b', T, G);
    expect(r.unknownGroup).toBe('xyz');
    expect(r.groupName).toBeNull();
    expect(parseQuickAdd('!later A', T, G).unknownGroup).toBeNull();
  });
  it('dedupes tags case-insensitively', () => {
    expect(parseQuickAdd('A #ui #UI', T, G).tags).toEqual(['ui']);
  });
});

describe('fold', () => {
  it('strips diacritics and đ', () => expect(fold('Đang Làm')).toBe('dang lam'));
});

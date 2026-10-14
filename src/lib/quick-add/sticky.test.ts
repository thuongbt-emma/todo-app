import { describe, expect, it } from 'vitest';
import { splitStickySections } from './sticky';

const G = ['Urgent', 'Đang làm', 'Later', 'Waiting'];

describe('splitStickySections', () => {
  it('assigns lines to the latest header', () => {
    const text = `Urgent\nUprace: trình ký\n\nđang làm\nTicket: build\nLater:\nPOSM: chờ sticker\n\nWaiting\nVPP: chờ c Na rep`;
    expect(splitStickySections(text, G)).toEqual([
      { groupName: 'Urgent', line: 'Uprace: trình ký' },
      { groupName: 'Đang làm', line: 'Ticket: build' },
      { groupName: 'Later', line: 'POSM: chờ sticker' },
      { groupName: 'Waiting', line: 'VPP: chờ c Na rep' },
    ]);
  });
  it('lines before any header have no group', () => {
    expect(splitStickySections('A: x', G)).toEqual([{ groupName: null, line: 'A: x' }]);
  });
});

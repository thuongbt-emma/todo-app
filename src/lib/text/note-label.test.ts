import { describe, expect, it } from 'vitest';
import { noteCopyText, noteLabel } from './note-label';

describe('noteLabel', () => {
  it('prefers the title', () => expect(noteLabel(' Địa chỉ ', 'Lô Z06')).toBe('Địa chỉ'));
  it('falls back to the first non-blank body line', () => expect(noteLabel('', '\n  Lô Z06 \nQ7')).toBe('Lô Z06'));
  it('names an empty note', () => expect(noteLabel(' ', ' \n ')).toBe('Ghi chú trống'));
});

describe('noteCopyText', () => {
  it('joins title and body', () => expect(noteCopyText('A', 'b\nc')).toBe('A\nb\nc'));
  it('skips a blank title', () => expect(noteCopyText('', 'b')).toBe('b'));
});

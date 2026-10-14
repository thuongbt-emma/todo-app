/** Display name of a note: its title, else the first non-blank line of its body, else "Ghi chú trống". */
export function noteLabel(title: string, body: string): string {
  return title.trim() || body.split('\n').map((l) => l.trim()).find(Boolean) || 'Ghi chú trống';
}

/** Text the Copy button puts on the clipboard: title and body on separate lines, skipping blanks. */
export function noteCopyText(title: string, body: string): string {
  return [title, body].filter((s) => s.trim()).join('\n');
}

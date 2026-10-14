'use client';
import { useEffect, useRef, useState } from 'react';

const LINES = [
  'Tên thẻ: bước 1, bước 2',
  '5/10 = hạn',
  '@c Na = người',
  '#event = tag',
  '!urgent = nhóm',
  'Gõ trùng tên thẻ đang mở = thêm bước vào thẻ đó',
];

export function QuickAddHelp() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // capture phase: keep the drawer's Esc handler from also firing
      setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="Cú pháp nhập nhanh"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="size-9 rounded-lg border border-line bg-surface text-sm font-semibold text-muted hover:text-fg"
      >
        ?
      </button>
      {open && (
        <div role="dialog" aria-label="Cú pháp nhập nhanh" className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg">
          <ul className="space-y-1">
            {LINES.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

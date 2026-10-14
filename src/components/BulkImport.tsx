'use client';
import { useState, useTransition } from 'react';
import { bulkImportAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast } from './Toast';

export function BulkImport() {
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">
        Dán nhiều dòng (vd. từ sticky note). Dòng chỉ có tên nhóm như <b>Urgent</b>, <b>Later</b> sẽ chuyển các dòng sau vào nhóm đó.
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full rounded border border-line bg-bg p-2 font-mono text-sm" />
      <button
        disabled={pending || !text.trim()}
        onClick={() =>
          start(async () => {
            const r = await safeAction(bulkImportAction(text));
            if (!r.ok) return toast.show(r.error, 'error');
            const { cards, steps, failed } = r.data;
            setText(failed.join('\n'));
            toast.show(`Đã nhập ${cards} thẻ, ${steps} bước`);
            if (failed.length) toast.show(`Lỗi ${failed.length} dòng: ${failed.slice(0, 3).join(' | ')}`, 'error');
          })
        }
        className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? 'Đang nhập…' : 'Nhập'}
      </button>
    </div>
  );
}

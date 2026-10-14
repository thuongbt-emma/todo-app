'use client';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { formatShort } from '@/lib/dates';
import { usePathname } from 'next/navigation';
import { clearIfSubmitted, sameTitle } from '@/lib/quick-add/input';
import { parseQuickAdd } from '@/lib/quick-add/parse';
import { quickAddAction, undoQuickAddAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { QuickAddHelp } from './QuickAddHelp';
import { useToast, useUndo } from './Toast';

type Props = { groups: { id: string; name: string; color: string }[]; today: string; openTitles: string[] };

export function QuickAdd({ groups, today, openTitles }: Props) {
  const [input, setInput] = useState('');
  const [groupId, setGroupId] = useState(groups[1]?.id ?? groups[0]?.id ?? '');
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const undo = useUndo();
  const pathname = usePathname();
  const preview = useMemo(
    () => (input.trim() ? parseQuickAdd(input, today, groups.map((g) => g.name)) : null),
    [input, today, groups],
  );

  const previewGroupId = preview?.groupName ? groups.find((g) => g.name === preview.groupName)?.id : undefined;
  const selectedGroupId = previewGroupId ?? groupId;
  const mergeTarget = preview?.title ? openTitles.find((t) => sameTitle(t, preview.title)) : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        if (document.querySelector('[role="dialog"]')) return;
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending || !preview?.title) return;
    const submitted = input;
    start(async () => {
      const r = await safeAction(quickAddAction(submitted, selectedGroupId));
      if (!r.ok) return toast.show(r.error, 'error');
      setInput(clearIfSubmitted(submitted));
      ref.current?.focus();
      const receipt = r.data;
      if (pathname === '/board') window.dispatchEvent(new CustomEvent('emma:card-added', { detail: receipt.cardId }));
      undo.push(
        receipt.created ? `Đã thêm "${receipt.cardTitle}"` : `Đã thêm ${receipt.stepIds.length} bước vào "${receipt.cardTitle}"`,
        () => undoQuickAddAction(receipt),
      );
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <select value={selectedGroupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Nhóm" className="rounded-lg border border-line bg-surface px-2 text-sm">
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          data-undo-when-empty
          placeholder="AP27: final 5/10, submit @c Na 6/10 #event   (phím N)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2"
        />
        <QuickAddHelp />
      </div>
      {preview?.title && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <span className="font-semibold text-fg">{preview.title}</span>
          {preview.groupName && <span className="rounded bg-surface-2 px-1.5">→ {preview.groupName}</span>}
          {preview.tags.map((t) => <span key={t} className="rounded bg-surface-2 px-1.5">#{t}</span>)}
          {preview.steps.map((s, i) => (
            <span key={i} className="rounded border border-line px-1.5">
              {s.text}{s.person && ` · @${s.person}`}{s.dueDate && ` · ${formatShort(s.dueDate)}`}
            </span>
          ))}
          {mergeTarget && <span className="text-warn">→ thêm vào thẻ có sẵn &quot;{mergeTarget}&quot;</span>}
          {preview.unknownGroup && <span className="text-warn">⚠ không có nhóm &quot;{preview.unknownGroup}&quot;</span>}
          <span className="ml-auto">Enter để lưu</span>
        </div>
      )}
    </form>
  );
}

'use client';
import { useTransition } from 'react';
import { between } from '@/lib/order';
import { createItemAction, deleteItemAction, updateItemAction, type ActionResult } from '@/lib/todo/actions';
import { PALETTE } from '@/lib/todo/palette';
import { safeAction } from '@/lib/todo/safe-action';
import type { TaxonomyKind } from '@/lib/todo/taxonomy';
import { ColorInput } from './ColorInput';
import { useToast } from './Toast';

type Item = { id: string; name: string; color: string; order?: number };

export function TaxonomyEditor({ kind, items, usage = {} }: { kind: TaxonomyKind; items: Item[]; usage?: Record<string, number> }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const act = (p: Promise<ActionResult<unknown>>) =>
    start(async () => {
      const r = await safeAction(p);
      if (!r.ok) toast.show(r.error, 'error');
    });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const beyond = items[j + dir]?.order ?? null;
    const order = dir === -1 ? between(beyond, items[j].order!) : between(items[j].order!, beyond);
    act(updateItemAction(kind, items[i].id, { order }));
  };
  return (
    <div className={`space-y-1.5 ${pending ? 'opacity-70' : ''}`}>
      {items.map((it, i) => {
        const count = usage[it.id] ?? 0;
        const inUse = kind !== 'group' && count > 0;
        const fallback = items.find((o) => o.id !== it.id);
        const onDelete = () => {
          if (inUse) return;
          const msg = kind === 'group' && fallback
            ? `Xoá nhóm "${it.name}"? Các thẻ đã xong sẽ chuyển sang nhóm "${fallback.name}".`
            : `Xoá "${it.name}"?`;
          if (confirm(msg)) act(deleteItemAction(kind, it.id));
        };
        return (
        <div key={it.id} className="flex items-center gap-2 text-sm">
          <ColorInput value={it.color} onCommit={(color) => act(updateItemAction(kind, it.id, { color }))} className="h-7 w-9" ariaLabel="Màu" />
          <input
            key={it.name}
            defaultValue={it.name}
            onBlur={(e) => e.target.value !== it.name && act(updateItemAction(kind, it.id, { name: e.target.value }))}
            className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1"
            aria-label="Tên"
          />
          <span className="shrink-0 text-xs text-muted">{count} {kind === 'person' ? 'bước' : kind === 'tag' ? 'chỗ' : 'thẻ'}</span>
          {kind === 'group' && (
            <>
              <button onClick={() => move(i, -1)} aria-label="Lên" className="text-muted">↑</button>
              <button onClick={() => move(i, 1)} aria-label="Xuống" className="text-muted">↓</button>
            </>
          )}
          <button
            onClick={onDelete}
            aria-label="Xoá"
            aria-disabled={inUse || undefined}
            title={inUse ? `Đang dùng ở ${count} chỗ — đổi tên thay vì xoá` : undefined}
            className={`text-danger ${inUse ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            ✕
          </button>
        </div>
        );
      })}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('name') as HTMLInputElement;
          if (!input.value.trim()) return;
          act(createItemAction(kind, input.value, PALETTE[items.length % PALETTE.length]));
          input.value = '';
        }}
      >
        <input name="name" placeholder="+ Thêm mới" className="w-full rounded border border-dashed border-line bg-transparent px-2 py-1 text-sm" />
      </form>
    </div>
  );
}

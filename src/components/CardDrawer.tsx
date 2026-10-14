'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { dateToDay } from '@/lib/dates';
import {
  addStepFromTextAction, deleteCardAction, deleteStepAction, moveCardAction,
  moveStepAction, reopenCardAction, restoreCardAction, restoreStepAction, updateCardAction, updateStepAction, type ActionResult,
} from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import type { CardWithRelations } from '@/lib/todo/queries';
import { canReorder, reorderTarget, sortStepsForDisplay } from '@/lib/todo/step-order';
import { withParam } from './FilterBar';
import { StepToggle } from './StepToggle';
import { useToast, useUndo } from './Toast';
import { useCompleteCard } from './useCompleteCard';

type Item = { id: string; name: string; color: string };
type Props = { card: CardWithRelations; groups: Item[]; tags: Item[]; people: Item[] };

export function CardDrawer({ card, groups, tags, people }: Props) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const toast = useToast();
  const undo = useUndo();
  const [pending, start] = useTransition();
  const { complete, pending: completing } = useCompleteCard(card);
  const openCount = card.steps.filter((s) => !s.doneAt).length;
  const close = () => router.replace(path + withParam(sp, 'card', null), { scroll: false });
  const act = (p: Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      const r = await safeAction(p);
      if (!r.ok) toast.show(r.error, 'error');
      else after?.();
    });

  const [menuFor, setMenuFor] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // re-subscribes each render so the handlers always see the current menu/close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menuFor) setMenuFor(null);
      else {
        const el = document.activeElement as HTMLElement | null;
        if (el && ['INPUT', 'TEXTAREA'].includes(el.tagName) && el.closest('[role="dialog"]')) el.blur(); // blur saves the edit
        close();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (menuFor && !(e.target as HTMLElement).closest('[data-step-menu]')) setMenuFor(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  });

  const tagIds = new Set(card.tags.map((t) => t.tagId));
  // Optimistic ticks (doneAt = tick time, null = unticked) so a step moves to/from the bottom right away.
  const [ticked, setTicked] = useState<ReadonlyMap<string, Date | null>>(new Map());
  const [seenSteps, setSeenSteps] = useState(card.steps);
  if (seenSteps !== card.steps) {
    setSeenSteps(card.steps);
    setTicked(new Map());
  }
  const tick = (s: CardWithRelations['steps'][number], done: boolean) =>
    setTicked((m) => {
      const next = new Map(m);
      if (done === !!s.doneAt) next.delete(s.id);
      else next.set(s.id, done ? new Date() : null);
      return next;
    });
  const view = sortStepsForDisplay(card.steps.map((s) => ({ ...s, doneAt: ticked.has(s.id) ? ticked.get(s.id)! : s.doneAt })));
  const saved = new Map(card.steps.map((s) => [s.id, s]));
  // Lên/Xuống only within the step's bucket (same due day / no due / done): across buckets the order is fixed.
  const neighbour = (i: number, dir: -1 | 1) => {
    const j = view[i + dir];
    return j && canReorder(view, view[i].id, j.id) ? j : null;
  };
  const swap = (i: number, dir: -1 | 1) => {
    const j = neighbour(i, dir);
    const target = j && reorderTarget(view, view[i].id, j.id);
    if (target) act(moveStepAction(view[i].id, target.order));
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={close}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={card.title}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-surface p-5 shadow-xl ${pending ? 'opacity-80' : ''}`}
      >
        <div className="flex items-start gap-2">
          <input
            ref={titleRef}
            key={card.title}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            defaultValue={card.title}
            onBlur={(e) => e.target.value !== card.title && act(updateCardAction(card.id, { title: e.target.value }))}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
            aria-label="Tiêu đề"
          />
          <button onClick={close} aria-label="Đóng" className="flex size-10 shrink-0 items-center justify-center text-muted sm:size-8">✕</button>
        </div>

        {card.completedAt && <p className="rounded bg-surface-2 px-3 py-2 text-sm">Thẻ đã hoàn thành.</p>}

        <label className="flex items-center gap-2 text-sm">
          <span className="w-16 text-muted">Nhóm</span>
          <select
            value={card.groupId}
            onChange={(e) => {
              const to = groups.find((g) => g.id === e.target.value);
              const { groupId: prevGroupId, order: prevOrder } = card;
              act(moveCardAction(card.id, e.target.value, null), () => {
                if (to) undo.push(`Đã chuyển "${card.title}" sang ${to.name}`, () => moveCardAction(card.id, prevGroupId, prevOrder));
              });
            }}
            className="flex-1 rounded border border-line bg-bg px-2 py-1"
          >
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="w-16 text-muted">Tag</span>
          {tags.map((t) => {
            const on = tagIds.has(t.id);
            const next = on ? [...tagIds].filter((x) => x !== t.id) : [...tagIds, t.id];
            return (
              <button
                key={t.id}
                onClick={() => act(updateCardAction(card.id, { tagIds: next }))}
                className={`min-h-10 rounded-full border px-2 text-xs sm:min-h-0 ${on ? 'text-white' : 'border-line text-muted'}`}
                style={on ? { background: t.color, borderColor: t.color } : undefined}
              >
                #{t.name}
              </button>
            );
          })}
        </div>

        <textarea
          key={card.note}
          defaultValue={card.note}
          placeholder="Ghi chú…"
          rows={3}
          onBlur={(e) => e.target.value !== card.note && act(updateCardAction(card.id, { note: e.target.value }))}
          className="rounded border border-line bg-bg p-2 text-sm"
        />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Các bước</h3>
          <ul className="space-y-2">
            {view.map((v, i) => {
              const s = saved.get(v.id)!;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 rounded border border-line p-2 text-sm">
                  <label className="-m-1 flex size-10 shrink-0 cursor-pointer items-center justify-center sm:size-6">
                    <StepToggle stepId={s.id} done={!!s.doneAt} label={s.text} doneAt={s.doneAt} onChange={(d) => tick(s, d)} />
                  </label>
                  <input
                    key={s.text}
                    defaultValue={s.text}
                    onBlur={(e) => e.target.value !== s.text && act(updateStepAction(s.id, { text: e.target.value }))}
                    className={`min-w-0 flex-1 bg-transparent outline-none ${v.doneAt ? 'text-muted line-through' : ''}`}
                    aria-label="Nội dung bước"
                  />
                  <div className="flex w-full items-center gap-2 pl-10 sm:pl-6">
                    <input
                      type="date"
                      value={s.dueDate ? dateToDay(s.dueDate) : ''}
                      onChange={(e) => act(updateStepAction(s.id, { dueDate: e.target.value || null }))}
                      className="rounded border border-line bg-bg px-1 text-xs"
                      aria-label="Deadline"
                    />
                    <select
                      value={s.personId ?? ''}
                      onChange={(e) => act(updateStepAction(s.id, { personId: e.target.value || null }))}
                      className="rounded border border-line bg-bg px-1 text-xs"
                      aria-label="Người"
                    >
                      <option value="">— người —</option>
                      {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div data-step-menu className="relative ml-auto">
                      <button
                        type="button"
                        aria-label="Thao tác bước"
                        aria-haspopup="menu"
                        aria-expanded={menuFor === s.id}
                        onClick={() => setMenuFor(menuFor === s.id ? null : s.id)}
                        className="flex size-10 items-center justify-center rounded text-muted hover:text-fg sm:size-8"
                      >
                        ⋯
                      </button>
                      {menuFor === s.id && (
                        <div role="menu" className="absolute right-0 z-10 mt-1 w-32 rounded-lg border border-line bg-surface py-1 shadow-lg">
                          <button role="menuitem" disabled={!neighbour(i, -1)} onClick={() => { setMenuFor(null); swap(i, -1); }} className="block min-h-10 w-full px-3 text-left disabled:opacity-40 sm:min-h-8">Lên</button>
                          <button role="menuitem" disabled={!neighbour(i, 1)} onClick={() => { setMenuFor(null); swap(i, 1); }} className="block min-h-10 w-full px-3 text-left disabled:opacity-40 sm:min-h-8">Xuống</button>
                          <button
                            role="menuitem"
                            onClick={() => { setMenuFor(null); act(deleteStepAction(s.id), () => undo.push(`Đã xoá bước "${s.text}"`, () => restoreStepAction(s.id))); }}
                            className="block min-h-10 w-full px-3 text-left text-danger sm:min-h-8"
                          >
                            Xoá bước
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('step') as HTMLInputElement;
              act(addStepFromTextAction(card.id, input.value), () => (input.value = ''));
            }}
          >
            <input name="step" placeholder="Thêm bước… (vd: gửi file @c Na 6/10)" className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
          </form>
        </section>

        {!card.completedAt && openCount > 0 && (
          <p className="mt-auto text-sm text-muted">Hoàn thành sẽ đánh dấu xong {openCount} bước còn lại.</p>
        )}
        <div className={`${!card.completedAt && openCount > 0 ? '' : 'mt-auto '}flex gap-2 pt-2`}>
          {card.completedAt ? (
            <button onClick={() => act(reopenCardAction(card.id))} className="rounded-lg border border-line px-3 py-1.5 text-sm">Mở lại</button>
          ) : (
            <button disabled={completing} onClick={() => complete(close)} className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white disabled:opacity-60">Hoàn thành thẻ</button>
          )}
          <button onClick={() => act(deleteCardAction(card.id), () => {
              undo.push(`Đã chuyển "${card.title}" vào thùng rác`, () => restoreCardAction(card.id));
              close();
            })} className="ml-auto rounded-lg px-3 py-1.5 text-sm text-danger">
            Chuyển vào thùng rác
          </button>
        </div>
      </aside>
    </div>
  );
}

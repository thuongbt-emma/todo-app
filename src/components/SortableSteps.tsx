'use client';
import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, type Modifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { moveStepAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { canReorder, reorderTarget, type SortableStep } from '@/lib/todo/step-order';
import { useToast, useUndo } from './Toast';

type Step = SortableStep & { text: string };

const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/**
 * Per-card DndContext for reordering steps by their handle. Lives inside the Board's card DndContext:
 * the handle stops its pointer/touch events so the outer card drag never starts from it.
 * `steps` carry the optimistic state (order, done); `visibleIds` are the rows on screen in display order.
 * A drop only counts within one bucket (same due day / no due / done); anything else snaps back with a hint.
 * `onReorder(id, order)` applies an optimistic order; `onReorder(id, null)` reverts it.
 */
export function SortableSteps({
  cardId, steps, visibleIds, onReorder, className, children,
}: {
  cardId: string;
  steps: readonly Step[];
  visibleIds: string[];
  onReorder: (id: string, order: number | null) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const undo = useUndo();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const id = String(active.id);
    const overId = String(over.id);
    if (!canReorder(steps, id, overId)) {
      const done = steps.some((s) => (s.id === id || s.id === overId) && s.doneAt);
      toast.show(done ? 'Bước đã xong luôn nằm cuối' : 'Bước có hạn được xếp theo ngày — đổi hạn để đổi vị trí');
      return;
    }
    const target = reorderTarget(steps, id, overId);
    const step = steps.find((s) => s.id === id);
    if (!target || !step) return;
    const oldOrder = step.order;
    onReorder(id, target.order);
    void safeAction(moveStepAction(id, target.order)).then((r) => {
      if (!r.ok) {
        onReorder(id, null);
        toast.show('Chưa lưu được, thử lại', 'error');
        return;
      }
      undo.push(`Đã đổi thứ tự bước "${step.text}"`, () => moveStepAction(id, oldOrder));
    });
  };

  return (
    <DndContext id={`steps-${cardId}`} sensors={sensors} collisionDetection={closestCenter} modifiers={[vertical]} onDragEnd={onDragEnd}>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <ul className={className}>{children}</ul>
      </SortableContext>
    </DndContext>
  );
}

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** A step <li> that moves with its "⋮⋮" handle; the rest of the row keeps its own clicks (and the card drag). */
export function SortableStepRow({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      className={`group/step relative ${className ?? ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined, opacity: isDragging ? 0.7 : undefined }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        aria-label="Kéo để đổi thứ tự"
        onPointerDown={(e) => {
          listeners?.onPointerDown?.(e);
          e.stopPropagation();
        }}
        onMouseDown={stop}
        onTouchStart={stop}
        onKeyDown={(e) => {
          listeners?.onKeyDown?.(e);
          // Once dragging, the keyboard sensor listens on document, so later keys must bubble.
          if (!isDragging) e.stopPropagation();
        }}
        className="-ml-1 flex shrink-0 cursor-grab touch-none select-none items-center justify-center self-stretch rounded px-0.5 text-xs leading-5 text-muted opacity-0 hover:bg-surface-2 hover:text-fg focus-visible:opacity-100 group-hover/step:opacity-100 group-focus-within/step:opacity-100 active:cursor-grabbing [@media(hover:none)]:min-h-10 [@media(hover:none)]:min-w-10 [@media(hover:none)]:opacity-100"
      >
        ⋮⋮
      </button>
      {children}
    </li>
  );
}

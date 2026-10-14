'use client';
import {
  closestCorners, DndContext, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';
import { between } from '@/lib/order';
import { moveCardAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import type { BoardGroup, CardWithRelations } from '@/lib/todo/queries';
import { CardItem } from './CardItem';
import { useToast, useUndo } from './Toast';

function SortableCard({ card, today }: { card: CardWithRelations; today: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <div ref={setNodeRef} data-card-id={card.id} className="rounded-xl" style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}>
      <CardItem card={card} today={today} />
    </div>
  );
}

function Column({ group, today }: { group: BoardGroup; today: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `group:${group.id}` });
  return (
    <section className="flex w-72 shrink-0 snap-start flex-col rounded-xl bg-surface-2 p-2">
      <header className="mb-2 flex items-center gap-2 px-1">
        <span className="size-2.5 rounded-full" style={{ background: group.color }} />
        <h2 className="font-semibold">{group.name}</h2>
        <span className="text-xs text-muted">{group.cards.length}</span>
      </header>
      <SortableContext items={group.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={`flex min-h-16 flex-1 flex-col gap-[var(--gap)] rounded-lg ${isOver ? 'ring-2 ring-accent/40' : ''}`}>
          {group.cards.map((c) => <SortableCard key={c.id} card={c} today={today} />)}
        </div>
      </SortableContext>
    </section>
  );
}

export function BoardView({ groups, today }: { groups: BoardGroup[]; today: string }) {
  const [columns, setColumns] = useState(groups);
  const [seen, setSeen] = useState(groups);
  if (seen !== groups) {
    setSeen(groups);
    setColumns(groups);
  }
  useEffect(() => {
    const onAdded = (e: Event) => {
      const id = String((e as CustomEvent).detail);
      let tries = 0;
      const find = () => {
        const el = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
        if (!el) {
          if (++tries < 20) window.setTimeout(find, 100);
          return;
        }
        el.scrollIntoView({ block: 'nearest' });
        el.classList.add('ring-2', 'ring-accent');
        window.setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 1500);
      };
      find();
    };
    window.addEventListener('emma:card-added', onAdded);
    return () => window.removeEventListener('emma:card-added', onAdded);
  }, []);
  const toast = useToast();
  const undo = useUndo();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const cardId = String(active.id);
    const overId = String(over.id);
    if (cardId === overId) return;
    const from = columns.find((g) => g.cards.some((c) => c.id === cardId));
    const to = overId.startsWith('group:')
      ? columns.find((g) => g.id === overId.slice(6))
      : columns.find((g) => g.cards.some((c) => c.id === overId));
    if (!from || !to) return;

    const card = from.cards.find((c) => c.id === cardId)!;
    const rest = to.cards.filter((c) => c.id !== cardId);
    let index = overId.startsWith('group:') ? rest.length : rest.findIndex((c) => c.id === overId);
    if (from.id === to.id && !overId.startsWith('group:')) {
      const oldIdx = from.cards.findIndex((c) => c.id === cardId);
      const overIdx = from.cards.findIndex((c) => c.id === overId);
      if (overIdx > oldIdx) index += 1; // dropping onto a card below: land after it
    }
    const order = between(rest[index - 1]?.order ?? null, rest[index]?.order ?? null);
    const moved = { ...card, groupId: to.id, order };

    const previous = columns;
    setColumns((cols) =>
      cols.map((g) => {
        const cards = g.cards.filter((c) => c.id !== cardId);
        if (g.id === to.id) cards.splice(index, 0, moved);
        return { ...g, cards };
      }),
    );
    void safeAction(moveCardAction(cardId, to.id, order)).then((r) => {
      if (!r.ok) {
        setColumns(previous);
        toast.show('Chưa lưu được, thử lại', 'error');
        return;
      }
      if (from.id !== to.id) {
        undo.push(`Đã chuyển "${card.title}" sang ${to.name}`, () => moveCardAction(cardId, from.id, card.order));
      }
    });
  };

  return (
    <DndContext id="board" sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="flex snap-x gap-3 overflow-x-auto pb-4">
        {columns.map((g) => <Column key={g.id} group={g} today={today} />)}
      </div>
    </DndContext>
  );
}

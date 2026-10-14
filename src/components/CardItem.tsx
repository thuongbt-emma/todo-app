'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { dateToDay, dueTone, formatShort } from '@/lib/dates';
import type { CardWithRelations } from '@/lib/todo/queries';
import { sortStepsForDisplay } from '@/lib/todo/step-order';
import { AddStepInline } from './AddStepInline';
import { withParam } from './FilterBar';
import { InlineStepText } from './InlineStepText';
import { useShowDone } from './ShowDone';
import { SortableStepRow, SortableSteps } from './SortableSteps';
import { StepToggle } from './StepToggle';
import { useCompleteCard } from './useCompleteCard';

const TONE = { overdue: 'text-danger font-semibold', soon: 'text-warn font-semibold', normal: 'text-muted' } as const;

export function DueBadge({ day, today }: { day: string; today: string }) {
  return <span className={`text-xs ${TONE[dueTone(day, today)]}`}>{formatShort(day)}</span>;
}

export function CardItem({ card, today, variant = 'card' }: { card: CardWithRelations; today: string; variant?: 'card' | 'row' }) {
  const sp = useSearchParams();
  const showDone = useShowDone();
  const [expanded, setExpanded] = useState(false);
  const { complete, pending } = useCompleteCard(card);
  // Ticks show (strike-through, count, chip, position) before the server round trip; cleared when fresh props arrive.
  // Value is the optimistic doneAt: the tick time, or null for an untick.
  const [ticked, setTicked] = useState<ReadonlyMap<string, Date | null>>(new Map());
  // Dragged steps take their new order before the server round trip; cleared the same way.
  const [moved, setMoved] = useState<ReadonlyMap<string, number>>(new Map());
  const [seenSteps, setSeenSteps] = useState(card.steps);
  if (seenSteps !== card.steps) {
    setSeenSteps(card.steps);
    setTicked(new Map());
    setMoved(new Map());
  }
  // The optimistic view, in display order: a tick drops the step to the bottom, an untick returns it to its date slot.
  const steps = sortStepsForDisplay(
    card.steps.map((s) => ({
      ...s,
      order: moved.get(s.id) ?? s.order,
      doneAt: ticked.has(s.id) ? ticked.get(s.id)! : s.doneAt,
    })),
  );
  const saved = new Map(card.steps.map((s) => [s.id, s]));
  const tick = (s: CardWithRelations['steps'][number], done: boolean) =>
    setTicked((m) => {
      const next = new Map(m);
      if (done === !!s.doneAt) next.delete(s.id); // back to the saved state (e.g. a failed save reverting)
      else next.set(s.id, done ? new Date() : null);
      return next;
    });
  const reorder = (id: string, order: number | null) =>
    setMoved((m) => {
      const next = new Map(m);
      if (order === null) next.delete(id);
      else next.set(id, order);
      return next;
    });
  const open = steps.filter((s) => !s.doneAt);
  // Hiding follows the saved state, so a step ticked while hidden-mode is on leaves once the save lands.
  const visible = showDone ? steps : steps.filter((s) => !saved.get(s.id)?.doneAt);
  const showChip = card.steps.length > 0 && open.length === 0 && !card.completedAt;
  const doneCount = card.steps.length - open.length;
  const nextDue = open.map((s) => (s.dueDate ? dateToDay(s.dueDate) : null)).filter((d): d is string => !!d).sort()[0];

  return (
    <div className={`rounded-lg border border-line bg-surface ${variant === 'card' ? 'p-[var(--pad)] shadow-sm' : 'px-[var(--pad)] py-1.5'}`}>
      <div className="flex items-baseline gap-2">
        {variant === 'row' && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Thu gọn các bước' : 'Mở các bước'}
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-xs text-muted hover:text-fg"
          >
            {expanded ? '▾' : '▸'} {card.steps.length > 0 ? `${card.steps.length} bước` : 'Thêm bước'}
          </button>
        )}
        <Link href={withParam(sp, 'card', card.id)} scroll={false} className="min-w-0 flex-1 truncate font-medium hover:underline">
          {card.title}
        </Link>
        {nextDue && <DueBadge day={nextDue} today={today} />}
        {card.steps.length > 0 && <span className="text-xs text-muted">{doneCount}/{card.steps.length}</span>}
      </div>
      {card.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {card.tags.map(({ tag }) => (
            <span key={tag.id} className="rounded px-1.5 text-[11px] text-white" style={{ background: tag.color }}>#{tag.name}</span>
          ))}
        </div>
      )}
      {(variant === 'card' || expanded) && (
        <div className={variant === 'row' ? 'pl-2' : ''}>
          {visible.length > 0 && (
            <SortableSteps cardId={card.id} steps={steps} visibleIds={visible.map((s) => s.id)} onReorder={reorder} className="mt-1 space-y-[var(--gap)]">
              {visible.map((v) => {
                const s = saved.get(v.id)!;
                const done = !!v.doneAt;
                return (
                  <SortableStepRow key={s.id} id={s.id} className="flex items-start gap-2 text-sm">
                    <StepToggle stepId={s.id} done={!!s.doneAt} label={s.text} doneAt={s.doneAt} onChange={(d) => tick(s, d)} />
                    <InlineStepText step={s} today={today} done={done} renderDue={(day) => (done ? <span className="text-xs text-muted">{formatShort(day)}</span> : <DueBadge day={day} today={today} />)} />
                  </SortableStepRow>
                );
              })}
            </SortableSteps>
          )}
          <AddStepInline cardId={card.id} />
        </div>
      )}
      {showChip && (
        <button
          type="button"
          disabled={pending}
          onClick={() => complete()}
          className="mt-2 min-h-8 rounded-lg border border-accent px-3 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-60"
        >
          ✓ Hoàn thành thẻ
        </button>
      )}
    </div>
  );
}

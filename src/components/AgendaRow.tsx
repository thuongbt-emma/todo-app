'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AgendaItem } from '@/lib/todo/queries';
import { DueBadge } from './CardItem';
import { withParam } from './FilterBar';
import { StepToggle } from './StepToggle';

type Props = { item: AgendaItem; today: string; lingering?: boolean; onToggle?: (done: boolean) => void };

export function AgendaRow({ item, today, lingering = false, onToggle }: Props) {
  const sp = useSearchParams();
  return (
    <li className="flex items-start gap-2 rounded-lg border border-line bg-surface px-[var(--pad)] py-1.5 text-sm">
      <StepToggle stepId={item.stepId} done={lingering} label={item.text} onChange={onToggle} />
      <div className={`min-w-0 flex-1 ${lingering ? 'text-muted line-through' : ''}`}>
        <span>{item.text}</span>
        {item.person && <span className="ml-1 text-xs text-muted">@{item.person}</span>}
        <Link href={withParam(sp, 'card', item.cardId)} scroll={false} className="ml-2 inline-flex items-center gap-1 text-xs text-muted hover:underline">
          <span className="size-2 rounded-full" style={{ background: item.groupColor }} />
          {item.cardTitle}
        </Link>
      </div>
      {item.dueDate && <DueBadge day={item.dueDate} today={today} />}
    </li>
  );
}

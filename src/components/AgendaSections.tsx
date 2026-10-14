'use client';
import { Suspense, useState } from 'react';
import type { AgendaItem } from '@/lib/todo/queries';
import { AGENDA_BUCKETS, type AgendaBucket } from '@/lib/todo/agenda';
import { AgendaRow } from './AgendaRow';
import { useLinger } from './useLinger';

type Ghost = { item: AgendaItem; bucket: AgendaBucket; index: number };

/** Renders agenda buckets; a just-ticked step stays in place (struck through) for 4s even after the server drops it. */
export function AgendaSections({ agenda, today }: { agenda: Record<AgendaBucket, AgendaItem[]>; today: string }) {
  const [ghosts, setGhosts] = useState<ReadonlyMap<string, Ghost>>(new Map());
  const linger = useLinger((id) => setGhosts((m) => {
    if (!m.has(id)) return m;
    const n = new Map(m);
    n.delete(id);
    return n;
  }));

  const lists = {} as Record<AgendaBucket, AgendaItem[]>;
  for (const { key } of AGENDA_BUCKETS) lists[key] = [...agenda[key]];
  for (const [id, g] of ghosts) {
    if (!linger.ids.has(id)) continue;
    if (AGENDA_BUCKETS.some(({ key }) => agenda[key].some((i) => i.stepId === id))) continue;
    lists[g.bucket].splice(Math.min(g.index, lists[g.bucket].length), 0, g.item);
  }
  const onToggle = (bucket: AgendaBucket, index: number, item: AgendaItem, done: boolean) => {
    setGhosts((m) => {
      const n = new Map(m);
      if (done) n.set(item.stepId, { item, bucket, index });
      else n.delete(item.stepId);
      return n;
    });
    linger.onToggle(item.stepId, done);
  };

  const empty = AGENDA_BUCKETS.every(({ key }) => lists[key].length === 0);
  return (
    <>
      {AGENDA_BUCKETS.map(({ key, label }) =>
        lists[key].length === 0 ? null : (
          <section key={key} className="space-y-[var(--gap)]">
            <h2 className={`font-semibold ${key === 'overdue' ? 'text-danger' : ''}`}>
              {label} <span className="text-xs font-normal text-muted">{lists[key].length}</span>
            </h2>
            <ul className="space-y-[var(--gap)]">
              <Suspense>
                {lists[key].map((item, i) => (
                  <AgendaRow
                    key={item.stepId}
                    item={item}
                    today={today}
                    lingering={linger.ids.has(item.stepId)}
                    onToggle={(done) => onToggle(key, i, item, done)}
                  />
                ))}
              </Suspense>
            </ul>
          </section>
        ),
      )}
      {empty && <p className="text-muted">Không còn bước nào đang mở 🎉</p>}
    </>
  );
}

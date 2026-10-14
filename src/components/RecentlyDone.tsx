'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TZ } from '@/lib/dates';
import { withParam } from './FilterBar';
import { LogReopen } from './LogReopen';

export type RecentItem = { id: string; title: string; completedAt: string; groupColor: string };

const KEY = 'emma-todo:recent-open';
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', hourCycle: 'h23' });
const when = (iso: string) => {
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute} ${p.day}/${p.month}`;
};

export function RecentlyDone({ items }: { items: RecentItem[] }) {
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted state after hydration
      if (localStorage.getItem(KEY) === '1') setOpen(true);
    } catch {}
  }, []);
  if (items.length === 0) return null;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch {}
  };
  return (
    <section className="mt-4 rounded-xl bg-surface-2 p-2">
      <button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2 px-1 text-left font-semibold">
        <span aria-hidden>{open ? '▾' : '▸'}</span>Đã xong gần đây ({items.length})
      </button>
      {open && (
        <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.groupColor }} />
              <Link href={path + withParam(new URLSearchParams(sp), 'card', c.id)} scroll={false} className="min-w-0 flex-1 truncate hover:underline">{c.title}</Link>
              <span className="text-xs text-muted">{when(c.completedAt)}</span>
              <LogReopen cardId={c.id} title={c.title} completedAt={c.completedAt} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

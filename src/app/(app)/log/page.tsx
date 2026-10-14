import Link from 'next/link';
import { DrawerSlot } from '@/components/DrawerSlot';
import { LogReopen } from '@/components/LogReopen';
import { addDays, formatShort, isValidDay, todayVN, TZ } from '@/lib/dates';
import { groupLog } from '@/lib/todo/log';
import { getLog } from '@/lib/todo/queries';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
const time = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default async function LogPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayVN();
  const to = isValidDay(sp.to) ? sp.to : today;
  const from = isValidDay(sp.from) ? sp.from : addDays(to, -29);
  const q = str(sp.q);
  const by = str(sp.by) === 'week' ? 'week' : 'day';
  const entries = await getLog({ from, to, q });
  const groups = groupLog(entries, by);

  const label = (key: string) =>
    by === 'week'
      ? `Tuần ${formatShort(key)} – ${formatShort(addDays(key, 6))}`
      : `${WEEKDAY[new Date(`${key}T00:00:00Z`).getUTCDay()]}, ${formatShort(key)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <form className="flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col">Từ<input type="date" name="from" defaultValue={from} className="rounded border border-line bg-surface px-2 py-1" /></label>
        <label className="flex flex-col">Đến<input type="date" name="to" defaultValue={to} className="rounded border border-line bg-surface px-2 py-1" /></label>
        <label className="flex min-w-40 flex-1 flex-col">Tìm<input name="q" defaultValue={q} placeholder="AP27, POSM…" className="rounded border border-line bg-surface px-2 py-1" /></label>
        <select name="by" defaultValue={by} className="rounded border border-line bg-surface px-2 py-1.5">
          <option value="day">Theo ngày</option>
          <option value="week">Theo tuần</option>
        </select>
        <button className="rounded bg-accent px-3 py-1.5 text-white">Xem</button>
      </form>

      <p className="text-sm text-muted">
        {entries.filter((e) => e.kind === 'step').length} bước và {entries.filter((e) => e.kind === 'card').length} thẻ đã xong
      </p>

      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="mb-1 text-sm font-semibold">{label(g.key)} <span className="font-normal text-muted">· {g.entries.length}</span></h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {g.entries.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-baseline gap-2 px-3 py-1.5 text-sm">
                <span aria-hidden>{e.kind === 'card' ? '★' : '✓'}</span>
                <span className={`min-w-0 flex-1 ${e.kind === 'card' ? 'font-semibold' : ''}`}>
                  {e.kind === 'card' ? (
                    <Link href={`?${new URLSearchParams({ from, to, q, by, card: e.cardId })}`} scroll={false} className="hover:underline">{e.text}</Link>
                  ) : e.text}
                  {e.kind === 'step' && (
                    <Link href={`?${new URLSearchParams({ from, to, q, by, card: e.cardId })}`} scroll={false} className="ml-2 text-xs text-muted hover:underline">
                      {e.cardTitle}
                    </Link>
                  )}
                </span>
                {e.kind === 'card' && <LogReopen cardId={e.cardId} title={e.cardTitle} completedAt={e.doneAt.toISOString()} />}
                <span className="text-xs text-muted">{time.format(e.doneAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && <p className="text-muted">Chưa có việc nào xong trong khoảng này.</p>}
      <DrawerSlot searchParams={sp} />
    </div>
  );
}

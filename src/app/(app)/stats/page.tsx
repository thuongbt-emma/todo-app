import Link from 'next/link';
import { StatsChart } from '@/components/StatsChart';
import { formatShort, todayVN } from '@/lib/dates';
import { customRange, presetRange, type RangePreset } from '@/lib/todo/stats';
import { getStats } from '@/lib/todo/stats-query';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'week', label: 'Tuần này' },
  { key: 'month', label: 'Tháng này' },
  { key: 'quarter', label: 'Quý này' },
];

export default async function StatsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayVN();
  // Invalid, reversed or > 731-day custom ranges fall back to the preset.
  const range = customRange(sp.from, sp.to);
  const custom = range !== null;
  const preset = (PRESETS.find((p) => p.key === sp.preset)?.key ?? 'month') as RangePreset;
  const { from, to } = range ?? presetRange(preset, today);
  const stats = await getStats(from, to, today);
  const maxTag = stats.topTags[0]?.count ?? 1;

  const tiles: { label: string; value: number; tone?: string; icon?: string }[] = [
    { label: 'Bước đã xong', value: stats.stepsDone },
    { label: 'Thẻ hoàn thành', value: stats.cardsDone },
    { label: 'Xong trễ hạn', value: stats.lateDone, tone: 'text-warn', icon: '⚠' },
    { label: 'Đang quá hạn', value: stats.openOverdue, tone: 'text-danger', icon: '●' },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end gap-2 text-sm">
        {PRESETS.map((p) => (
          <Link key={p.key} href={`?preset=${p.key}`} className={`rounded-md px-3 py-1.5 ${!custom && p.key === preset ? 'bg-accent text-white' : 'bg-surface-2'}`}>
            {p.label}
          </Link>
        ))}
        <form className="ml-auto flex items-end gap-2">
          <input type="date" name="from" defaultValue={from} className="rounded border border-line bg-surface px-2 py-1" aria-label="Từ" />
          <input type="date" name="to" defaultValue={to} className="rounded border border-line bg-surface px-2 py-1" aria-label="Đến" />
          <button className="rounded bg-surface-2 px-3 py-1.5">Xem</button>
        </form>
      </div>
      <p className="text-sm text-muted">{formatShort(from)} – {formatShort(to)}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-surface p-4">
            <div className={`text-3xl font-semibold tabular-nums ${t.tone ?? ''}`}>
              {t.icon && <span aria-hidden className="mr-1 text-base">{t.icon}</span>}
              {t.value}
            </div>
            <div className="text-sm text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Theo tuần</h2>
        <StatsChart data={stats.perWeek} />
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Theo tag (số việc xong)</h2>
        {stats.topTags.length === 0 && <p className="text-sm text-muted">Chưa có việc nào gắn tag.</p>}
        <ul className="space-y-1.5">
          {stats.topTags.map((t) => (
            <li key={t.name} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate">#{t.name}</span>
              <span className="h-2 rounded bg-accent" style={{ width: `${(t.count / maxTag) * 100}%`, maxWidth: 'calc(100% - 10rem)' }} />
              <span className="tabular-nums text-muted">{t.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

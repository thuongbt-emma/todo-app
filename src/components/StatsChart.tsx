'use client';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Stats } from '@/lib/todo/stats';

const tick = { fill: 'var(--muted)', fontSize: 12 };

export function StatsChart({ data }: { data: Stats['perWeek'] }) {
  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
              itemStyle={{ color: 'var(--text)' }}
              labelStyle={{ color: 'var(--text)' }}
              labelFormatter={(l) => `Tuần ${l}`}
            />
            <Legend formatter={(v) => <span style={{ color: 'var(--text)' }}>{v}</span>} />
            <Bar dataKey="steps" name="Bước xong" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} stroke="var(--surface)" strokeWidth={2} />
            <Bar dataKey="cards" name="Thẻ hoàn thành" fill="var(--muted)" radius={[4, 4, 0, 0]} maxBarSize={28} stroke="var(--surface)" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">Xem dạng bảng</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr><th className="py-1 font-normal">Tuần</th><th className="font-normal">Bước xong</th><th className="font-normal">Thẻ hoàn thành</th></tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.week} className="border-t border-line"><td className="py-1">{r.label}</td><td>{r.steps}</td><td>{r.cards}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

'use client';
import { useTransition } from 'react';
import { updateSettingsAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import type { AppSettings } from '@/lib/todo/taxonomy';
import { ColorInput } from './ColorInput';
import { useToast } from './Toast';

const OPTIONS = {
  theme: [['system', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']],
  density: [['cozy', 'Thoáng'], ['compact', 'Gọn']],
  defaultView: [['board', 'Board'], ['list', 'List'], ['agenda', 'Theo ngày']],
} as const;
const LABELS = { theme: 'Giao diện', density: 'Hiển thị', defaultView: 'Màn mặc định' } as const;

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [, start] = useTransition();
  const toast = useToast();
  const save = (data: Partial<AppSettings>) =>
    start(async () => {
      const r = await safeAction(updateSettingsAction(data));
      if (!r.ok) toast.show(r.error, 'error');
    });
  return (
    <div className="space-y-3">
      {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => (
        <div key={key} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-28 text-muted">{LABELS[key]}</span>
          {OPTIONS[key].map(([value, label]) => (
            <button
              key={value}
              onClick={() => save({ [key]: value })}
              className={`rounded-md px-3 py-1 ${settings[key] === value ? 'bg-accent text-white' : 'bg-surface-2'}`}
            >
              {label}
            </button>
          ))}
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <span className="w-28 text-muted">Màu nhấn</span>
        <ColorInput value={settings.accent} onCommit={(accent) => save({ accent })} className="h-8 w-12" />
      </label>
    </div>
  );
}

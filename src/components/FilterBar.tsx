'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type Item = { id: string; name: string; color: string };

export function withParam(sp: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(sp);
  if (value) next.set(key, value);
  else next.delete(key);
  const s = next.toString();
  return s ? `?${s}` : '?';
}

export function FilterBar({ tags, people }: { tags: Item[]; people: Item[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const selected = (key: string) => new Set((sp.get(key) ?? '').split(',').filter(Boolean));

  const toggle = (key: 'tags' | 'people', id: string) => {
    const set = selected(key);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    router.replace(path + withParam(sp, key, [...set].join(',') || null));
  };

  if (!tags.length && !people.length) return null;
  const chip = (key: 'tags' | 'people', item: Item, prefix: string) => {
    const on = selected(key).has(item.id);
    return (
      <button
        key={item.id}
        onClick={() => toggle(key, item.id)}
        className={`rounded-full border px-2.5 py-0.5 text-xs ${on ? 'text-white' : 'border-line text-muted'}`}
        style={on ? { background: item.color, borderColor: item.color } : undefined}
      >
        {prefix}{item.name}
      </button>
    );
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => chip('tags', t, '#'))}
      {people.map((p) => chip('people', p, '@'))}
    </div>
  );
}

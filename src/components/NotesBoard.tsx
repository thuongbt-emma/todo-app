'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createNoteAction } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { FilterBar, withParam } from './FilterBar';
import { NoteCard, type NoteView } from './NoteCard';
import { useToast } from './Toast';

type Item = { id: string; name: string; color: string };
type Props = { notes: NoteView[]; tags: Item[]; filtered: boolean };

export function NotesBoard({ notes, tags, filtered }: Props) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const toast = useToast();
  const [pending, start] = useTransition();
  const urlQ = sp.get('q') ?? '';
  const [query, setQuery] = useState(urlQ);
  // true from a keystroke until its debounced URL push fires; the URL never overwrites the box meanwhile
  const [typing, setTyping] = useState(false);
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [createdIds, setCreatedIds] = useState<ReadonlySet<string>>(new Set());

  // ?q= changed by navigation (back/forward): resync the box from the URL
  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ);
    if (!typing && urlQ.trim() !== query.trim()) setQuery(urlQ);
  }

  const cancelDebounce = () => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = null;
  };
  useEffect(() => cancelDebounce, []);

  // only the user's typing pushes to ?q=, 250ms after the last keystroke
  const onSearch = (value: string) => {
    setQuery(value);
    setTyping(true);
    cancelDebounce();
    debounce.current = setTimeout(() => {
      debounce.current = null;
      setTyping(false);
      const current = new URLSearchParams(window.location.search);
      const q = value.trim();
      if (q === (current.get('q') ?? '').trim()) return;
      router.replace(path + withParam(current, 'q', q || null), { scroll: false });
    }, 250);
  };

  const create = () =>
    start(async () => {
      const r = await safeAction(createNoteAction());
      if (!r.ok) {
        toast.show(r.error, 'error');
        return;
      }
      const id = r.data.id;
      setCreatedIds((s) => new Set(s).add(id));
      setFreshId(id);
      setEditingId(id);
      // a blank note never matches a search or tag filter, so show everything
      if (filtered) {
        cancelDebounce();
        setTyping(false);
        setQuery('');
        router.replace(path, { scroll: false });
      }
    });

  // the note just created sits at the top of the grid until it is left
  const ordered = freshId ? [...notes.filter((n) => n.id === freshId), ...notes.filter((n) => n.id !== freshId)] : notes;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={create} disabled={pending} className="min-h-10 rounded-md bg-accent px-3 text-sm font-medium text-white disabled:opacity-60 sm:min-h-8">
          + Ghi chú mới
        </button>
        <input
          type="search"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm ghi chú…"
          aria-label="Tìm ghi chú"
          className="min-h-10 min-w-0 flex-1 rounded-md border border-line bg-bg px-3 text-sm sm:min-h-8 sm:max-w-xs"
        />
      </div>
      <FilterBar tags={tags} people={[]} />
      {ordered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {filtered ? 'Không có ghi chú nào khớp bộ lọc.' : 'Chưa có ghi chú. Lưu địa chỉ, số điện thoại, mẫu tin nhắn… ở đây.'}
        </p>
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordered.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              tags={tags}
              editing={editingId === n.id}
              isNew={createdIds.has(n.id)}
              fresh={freshId === n.id}
              onEdit={() => setEditingId(n.id)}
              onLeave={() => {
                setEditingId((cur) => (cur === n.id ? null : cur));
                if (freshId === n.id) setFreshId(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

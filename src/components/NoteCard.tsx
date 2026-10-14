'use client';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { noteCopyText, noteLabel } from '@/lib/text/note-label';
import { splitPhones } from '@/lib/text/phone';
import { deleteNoteAction, discardNoteIfEmptyAction, restoreNoteAction, updateNoteAction, type ActionResult } from '@/lib/todo/actions';
import { safeAction } from '@/lib/todo/safe-action';
import { useToast, useUndo } from './Toast';

export type NoteView = { id: string; title: string; body: string; pinned: boolean; tagIds: string[] };
type Item = { id: string; name: string; color: string };
type Props = {
  note: NoteView;
  tags: Item[];
  editing: boolean;
  /** created this session: discarded if still empty when left */
  isNew: boolean;
  /** just created via "+ Ghi chú mới": open with the cursor in the title */
  fresh: boolean;
  onEdit: () => void;
  onLeave: () => void;
};

const grow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

export function NoteCard({ note, tags, editing, isNew, fresh, onEdit, onLeave }: Props) {
  const toast = useToast();
  const undo = useUndo();
  const [menu, setMenu] = useState(false);
  const [tagOverride, setTagOverride] = useState<string[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const focusField = useRef<'title' | 'body'>('title');
  const saved = useRef({ title: note.title, body: note.body });
  // actions on one note run in order, so a pending save always lands before the discard check
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const tagIds = tagOverride ?? note.tagIds;
  // optimistic pin: holds until the server's note.pinned moves off `from`; the button is disabled
  // while the request is in flight so a double-click can't send the same value twice
  const [pinReq, setPinReq] = useState<{ from: boolean; to: boolean; pending: boolean } | null>(null);
  const pinLive = pinReq !== null && pinReq.from === note.pinned;
  const pinned = pinLive ? pinReq.to : note.pinned;
  const pinPending = pinLive && pinReq.pending;

  const enqueue = (fn: () => Promise<ActionResult<unknown>>) => {
    const p = chain.current.then(async () => {
      const r = await safeAction(fn());
      if (!r.ok) toast.show(r.error, 'error');
      return r;
    });
    chain.current = p;
    return p;
  };

  useEffect(() => {
    if (!editing) saved.current = { title: note.title, body: note.body };
  }, [editing, note.title, note.body]);

  useLayoutEffect(() => {
    if (!editing) return;
    grow(titleRef.current);
    grow(bodyRef.current);
    const el = fresh || focusField.current === 'title' ? titleRef.current : bodyRef.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [editing, fresh]);

  const saveField = (field: 'title' | 'body') => {
    const el = field === 'title' ? titleRef.current : bodyRef.current;
    if (!el || el.value === saved.current[field]) return;
    const value = el.value;
    saved.current[field] = value;
    void enqueue(() => updateNoteAction(note.id, { [field]: value }));
  };

  const current = () => ({ title: titleRef.current?.value ?? note.title, body: bodyRef.current?.value ?? note.body });

  const leave = (discard = true) => {
    const { title, body } = current();
    saveField('title');
    saveField('body');
    setTagOverride(null);
    onLeave();
    if (discard && isNew && !title.trim() && !body.trim() && !tagIds.length) void enqueue(() => discardNoteIfEmptyAction(note.id));
  };

  // re-subscribes each render so the handlers always see the current state
  useEffect(() => {
    if (!editing && !menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (menu) setMenu(false);
      else leave();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (menu && !t.closest('[data-note-menu]')) setMenu(false);
      if (editing && !rootRef.current?.contains(t)) leave();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  });

  const startEdit = (field: 'title' | 'body') => {
    focusField.current = field;
    onEdit();
  };

  const toggleTag = (id: string) => {
    const next = tagIds.includes(id) ? tagIds.filter((t) => t !== id) : [...tagIds, id];
    setTagOverride(next);
    void enqueue(() => updateNoteAction(note.id, { tagIds: next }));
  };

  const copy = async () => {
    const { title, body } = editing ? current() : note;
    try {
      if (!navigator.clipboard) throw new Error('no clipboard');
      await navigator.clipboard.writeText(noteCopyText(title, body));
      toast.show('Đã copy');
    } catch {
      toast.show('Không copy được', 'error');
    }
  };

  const trash = () => {
    setMenu(false);
    const { title, body } = editing ? current() : note;
    if (editing) leave(false);
    const name = noteLabel(title, body);
    void enqueue(() => deleteNoteAction(note.id)).then((r) => {
      if (r.ok) undo.push(`Đã chuyển ghi chú "${name}" vào thùng rác`, () => restoreNoteAction(note.id));
    });
  };

  // the ref also stops a second click landing in the same task, before the disabled state renders
  const pinBusy = useRef(false);
  const togglePin = () => {
    if (pinPending || pinBusy.current) return;
    pinBusy.current = true;
    const req = { from: note.pinned, to: !pinned };
    setPinReq({ ...req, pending: true });
    void enqueue(() => updateNoteAction(note.id, { pinned: req.to })).then((r) => {
      pinBusy.current = false;
      setPinReq(r.ok ? { ...req, pending: false } : null);
    });
  };

  const chipStyle =(t: Item, on: boolean) => ({
    className: `rounded-full border px-2.5 py-0.5 text-xs ${on ? 'text-white' : 'border-line text-muted'}`,
    style: on ? { background: t.color, borderColor: t.color } : undefined,
  });

  const isEmpty = !note.title.trim() && !note.body.trim();

  return (
    <div ref={rootRef} data-note={note.id} className={`flex flex-col gap-2 rounded-xl border bg-surface p-3 ${editing ? 'border-accent' : 'border-line'}`}>
      {editing ? (
        <>
          <textarea
            ref={titleRef}
            rows={1}
            defaultValue={note.title}
            placeholder="Tiêu đề"
            aria-label="Tiêu đề"
            onInput={(e) => grow(e.currentTarget)}
            onBlur={() => saveField('title')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault();
                bodyRef.current?.focus();
              }
            }}
            className="w-full resize-none overflow-hidden bg-transparent font-semibold outline-none"
          />
          <textarea
            ref={bodyRef}
            rows={3}
            defaultValue={note.body}
            placeholder="Nội dung"
            aria-label="Nội dung"
            onInput={(e) => grow(e.currentTarget)}
            onBlur={() => saveField('body')}
            className="w-full resize-none overflow-hidden bg-transparent text-sm outline-none"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <button key={t.id} type="button" aria-pressed={tagIds.includes(t.id)} onClick={() => toggleTag(t.id)} {...chipStyle(t, tagIds.includes(t.id))}>
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          tabIndex={0}
          aria-label={`Sửa ghi chú ${noteLabel(note.title, note.body)}`}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('a')) return;
            startEdit((e.target as HTMLElement).closest('[data-field="body"]') ? 'body' : 'title');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target === e.currentTarget) startEdit('title');
          }}
          className="flex min-h-16 cursor-text flex-col gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {note.title.trim() && <h3 className="font-semibold break-words">{note.title}</h3>}
          {note.body && (
            <p data-field="body" className="text-sm break-words whitespace-pre-wrap">
              {splitPhones(note.body).map((s, i) =>
                s.type === 'phone' ? (
                  <a key={i} href={`tel:${s.tel}`} onClick={(e) => e.stopPropagation()} className="text-accent underline">
                    {s.value}
                  </a>
                ) : (
                  <Fragment key={i}>{s.value}</Fragment>
                ),
              )}
            </p>
          )}
          {isEmpty && <p className="text-sm text-muted">Ghi chú trống</p>}
          {note.tagIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">{tags.filter((t) => note.tagIds.includes(t.id)).map((t) => <span key={t.id} {...chipStyle(t, true)}>#{t.name}</span>)}</div>
          )}
        </div>
      )}
      <div className="mt-auto flex items-center justify-end gap-1 text-sm">
        <button type="button" onClick={copy} className="min-h-10 rounded px-2 text-muted hover:bg-surface-2 hover:text-fg sm:min-h-8">
          Copy
        </button>
        <button
          type="button"
          aria-label="Ghim"
          aria-pressed={pinned}
          disabled={pinPending}
          onClick={togglePin}
          className={`flex size-10 items-center justify-center rounded hover:bg-surface-2 disabled:cursor-wait sm:size-8 ${pinned ? '' : 'opacity-40 grayscale'}`}
        >
          📌
        </button>
        <div data-note-menu className="relative">
          <button
            type="button"
            aria-label="Thao tác ghi chú"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
            className="flex size-10 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-fg sm:size-8"
          >
            ⋯
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 z-10 mt-1 w-48 rounded-lg border border-line bg-surface py-1 shadow-lg">
              <button role="menuitem" onClick={trash} className="block min-h-10 w-full px-3 text-left text-danger sm:min-h-8">
                Chuyển vào thùng rác
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

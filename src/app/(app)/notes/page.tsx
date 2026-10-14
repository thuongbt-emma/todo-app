import { Suspense } from 'react';
import { NotesBoard } from '@/components/NotesBoard';
import { listNotes } from '@/lib/todo/notes';
import { getTaxonomy } from '@/lib/todo/queries';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function NotesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = one(sp.q);
  const tagIds = one(sp.tags).split(',').filter(Boolean);
  const [notes, { tags }] = await Promise.all([listNotes({ q, tagIds }), getTaxonomy()]);
  return (
    <Suspense>
      <NotesBoard
        notes={notes.map((n) => ({ id: n.id, title: n.title, body: n.body, pinned: n.pinned, tagIds: n.tags.map((t) => t.tagId) }))}
        tags={tags.map(({ id, name, color }) => ({ id, name, color }))}
        filtered={Boolean(q.trim() || tagIds.length)}
      />
    </Suspense>
  );
}

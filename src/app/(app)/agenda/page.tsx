import { Suspense } from 'react';
import { AgendaSections } from '@/components/AgendaSections';
import { DrawerSlot } from '@/components/DrawerSlot';
import { FilterBar } from '@/components/FilterBar';
import { todayVN } from '@/lib/dates';
import { getAgenda, getTaxonomy, parseFilter } from '@/lib/todo/queries';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AgendaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const today = todayVN();
  const [agenda, { tags, people }] = await Promise.all([getAgenda(parseFilter(sp), today), getTaxonomy()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Suspense><FilterBar tags={tags} people={people} /></Suspense>
      <AgendaSections agenda={agenda} today={today} />
      <DrawerSlot searchParams={sp} />
    </div>
  );
}

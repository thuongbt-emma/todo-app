import { Suspense } from 'react';
import { BoardView } from '@/components/BoardView';
import { DrawerSlot } from '@/components/DrawerSlot';
import { RecentlyDone } from '@/components/RecentlyDone';
import { FilterBar } from '@/components/FilterBar';
import { ShowDoneGate, ShowDoneProvider, ShowDoneToggle } from '@/components/ShowDone';
import { todayVN } from '@/lib/dates';
import { getBoard, getRecentlyCompleted, getTaxonomy, parseFilter } from '@/lib/todo/queries';
import { getSettings } from '@/lib/todo/taxonomy';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BoardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [groups, { tags, people }, recent, settings] = await Promise.all([
    getBoard(parseFilter(sp)), getTaxonomy(), getRecentlyCompleted(new Date()), getSettings(),
  ]);
  return (
    <ShowDoneProvider initial={settings.showDone}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <ShowDoneToggle />
          <Suspense><FilterBar tags={tags} people={people} /></Suspense>
        </div>
        <Suspense><BoardView groups={groups} today={todayVN()} /></Suspense>
        <ShowDoneGate>
          <Suspense>
            <RecentlyDone items={recent.map((c) => ({ id: c.id, title: c.title, completedAt: c.completedAt.toISOString(), groupColor: c.groupColor }))} />
          </Suspense>
        </ShowDoneGate>
        <DrawerSlot searchParams={sp} />
      </div>
    </ShowDoneProvider>
  );
}

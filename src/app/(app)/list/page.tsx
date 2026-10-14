import { Suspense } from 'react';
import { CardItem } from '@/components/CardItem';
import { DrawerSlot } from '@/components/DrawerSlot';
import { FilterBar } from '@/components/FilterBar';
import { ShowDoneProvider, ShowDoneToggle } from '@/components/ShowDone';
import { todayVN } from '@/lib/dates';
import { getBoard, getTaxonomy, parseFilter } from '@/lib/todo/queries';
import { getSettings } from '@/lib/todo/taxonomy';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ListPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [groups, { tags, people }, settings] = await Promise.all([getBoard(parseFilter(sp)), getTaxonomy(), getSettings()]);
  const today = todayVN();
  return (
    <ShowDoneProvider initial={settings.showDone}>
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <ShowDoneToggle />
          <Suspense><FilterBar tags={tags} people={people} /></Suspense>
        </div>
        {groups.map((g) => (
          <section key={g.id} className="space-y-[var(--gap)]">
            <h2 className="flex items-center gap-2 font-semibold">
              <span className="size-2.5 rounded-full" style={{ background: g.color }} />
              {g.name} <span className="text-xs font-normal text-muted">{g.cards.length}</span>
            </h2>
            {g.cards.length === 0 && <p className="text-sm text-muted">Trống</p>}
            <Suspense>{g.cards.map((c) => <CardItem key={c.id} card={c} today={today} variant="row" />)}</Suspense>
          </section>
        ))}
        <DrawerSlot searchParams={sp} />
      </div>
    </ShowDoneProvider>
  );
}

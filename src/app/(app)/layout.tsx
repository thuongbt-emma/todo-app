import { Suspense } from 'react';
import { Nav } from '@/components/Nav';
import { authDisabled } from '@/lib/auth/config';
import { QuickAdd } from '@/components/QuickAdd';
import { ToastProvider } from '@/components/Toast';
import { todayVN } from '@/lib/dates';
import { getOpenCardTitles, getTaxonomy, getTrashCount } from '@/lib/todo/queries';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ groups }, openTitles, trashCount] = await Promise.all([getTaxonomy(), getOpenCardTitles(), getTrashCount()]);
  return (
    <ToastProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 p-4">
        <Suspense><Nav showLogout={!authDisabled()} trashCount={trashCount} /></Suspense>
        <QuickAdd groups={groups.map(({ id, name, color }) => ({ id, name, color }))} today={todayVN()} openTitles={openTitles} />
        <main>{children}</main>
      </div>
    </ToastProvider>
  );
}

'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logoutAction } from '@/app/login/actions';

// `more`: below 640px these live in the ⋯ menu instead of the tab row
const LINKS = [
  { href: '/board', label: 'Board' },
  { href: '/list', label: 'List', more: true },
  { href: '/agenda', label: 'Theo ngày' },
  { href: '/log', label: 'Nhật ký' },
  { href: '/notes', label: 'Ghi chú' },
  { href: '/stats', label: 'Thống kê', more: true },
  { href: '/settings', label: 'Cài đặt', more: true },
];
const FILTERED = new Set(['/board', '/list', '/agenda']);

export function Nav({ showLogout = true, trashCount = 0 }: { showLogout?: boolean; trashCount?: number }) {
  const path = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  // keep tag/person filters when moving between the three task views
  const keep = new URLSearchParams();
  if ([...FILTERED].some((f) => path.startsWith(f))) for (const k of ['tags', 'people']) if (sp.get(k)) keep.set(k, sp.get(k)!);
  const suffix = keep.size ? `?${keep}` : '';
  const href = (h: string) => (FILTERED.has(h) ? h + suffix : h);
  const label = (l: (typeof LINKS)[number]) => (l.href === '/settings' && trashCount > 0 ? `${l.label} · ${trashCount}` : l.label);
  const active = (h: string) => path.startsWith(h);
  const moreActive = LINKS.some((l) => l.more && active(l.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-nav-more]')) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto sm:gap-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={href(l.href)}
            className={`shrink-0 rounded-md px-2 py-1.5 text-sm sm:px-3 ${l.more ? 'hidden sm:block' : ''} ${active(l.href) ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2'}`}
          >
            {label(l)}
          </Link>
        ))}
      </div>
      <div data-nav-more className="relative shrink-0 sm:hidden">
        <button
          type="button"
          aria-label="Thêm"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={`relative flex size-10 items-center justify-center rounded-md text-sm ${moreActive ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2'}`}
        >
          ⋯
          {trashCount > 0 && <span aria-hidden className="absolute top-1 right-1 size-2 rounded-full bg-danger" />}
        </button>
        {open && (
          <div role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-line bg-surface py-1 shadow-lg">
            {LINKS.filter((l) => l.more).map((l) => (
              <Link
                key={l.href}
                role="menuitem"
                href={href(l.href)}
                onClick={() => setOpen(false)}
                className={`flex min-h-10 items-center px-3 text-sm ${active(l.href) ? 'font-semibold text-accent' : ''}`}
              >
                {label(l)}
              </Link>
            ))}
            {showLogout && (
              <form action={logoutAction}>
                <button role="menuitem" className="flex min-h-10 w-full items-center px-3 text-left text-sm text-muted">Thoát</button>
              </form>
            )}
          </div>
        )}
      </div>
      {/* below 640px "Thoát" lives in the ⋯ menu so the tab row fits a 360px phone */}
      {showLogout && (
        <form action={logoutAction} className="ml-auto hidden shrink-0 sm:block">
          <button className="px-2 text-sm text-muted hover:text-fg">Thoát</button>
        </form>
      )}
    </nav>
  );
}

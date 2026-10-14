import type { Metadata } from 'next';
import './globals.css';
import { getSettings } from '@/lib/todo/taxonomy';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'To-do' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="vi" data-theme={s.theme} data-density={s.density} style={{ '--accent': s.accent } as React.CSSProperties}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

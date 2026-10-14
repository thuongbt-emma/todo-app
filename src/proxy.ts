import { NextResponse, type NextRequest } from 'next/server';
import { authDisabled } from '@/lib/auth/config';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === '/login' || request.nextUrl.pathname.startsWith('/login/');
  if (authDisabled()) {
    if (!isLogin) return NextResponse.next();
    const home = request.nextUrl.clone();
    home.pathname = '/';
    home.search = '';
    return NextResponse.redirect(home);
  }
  if (isLogin) return NextResponse.next();
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '');
  if (ok) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  // /login is included so it can be redirected away when AUTH_DISABLED=true; proxy() passes it through otherwise.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

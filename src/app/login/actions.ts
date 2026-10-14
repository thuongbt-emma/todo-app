'use server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { authDisabled } from '@/lib/auth/config';
import { verifyPassword } from '@/lib/auth/password';
import { clientKey, loginLimiter } from '@/lib/auth/rate-limit';
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth/session';

export async function loginAction(_prev: string | null, formData: FormData): Promise<string | null> {
  if (authDisabled()) redirect('/');
  const ip = clientKey((await headers()).get('x-forwarded-for'));
  if (loginLimiter.isLocked(ip)) return 'Sai quá nhiều lần. Thử lại sau 10 phút.';
  const password = String(formData.get('password') ?? '');
  if (!verifyPassword(password, process.env.APP_PASSWORD_HASH ?? '')) {
    loginLimiter.recordFailure(ip);
    return 'Mật khẩu không đúng.';
  }
  loginLimiter.reset(ip);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(process.env.SESSION_SECRET ?? ''), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
  redirect('/');
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}

import 'server-only';
import { cookies } from 'next/headers';
import { authDisabled } from './config';
import { SESSION_COOKIE, verifySessionToken } from './session';

export async function isAuthed(): Promise<boolean> {
  if (authDisabled()) return true;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, process.env.SESSION_SECRET ?? '');
}

export async function assertAuthed(): Promise<void> {
  if (!(await isAuthed())) throw new Error('Phiên đăng nhập đã hết, hãy đăng nhập lại');
}

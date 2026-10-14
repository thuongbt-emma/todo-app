// Web Crypto only, so it runs in proxy.ts too
export const SESSION_COOKIE = 'pt_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_TTL_MS);
  return `${exp}.${await sign(exp, secret)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < now) return false;
  return timingSafeEqual(await sign(exp, secret), sig);
}

/** Constant-time string compare (Web Crypto has no timingSafeEqual; runs in proxy.ts too). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

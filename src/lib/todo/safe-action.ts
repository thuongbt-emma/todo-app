import type { ActionResult } from './actions';

/** Wraps a server-action call so a network failure or thrown error becomes an ActionResult. */
export async function safeAction<T>(p: Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await p;
  } catch {
    return { ok: false, error: 'Chưa lưu được, thử lại' };
  }
}

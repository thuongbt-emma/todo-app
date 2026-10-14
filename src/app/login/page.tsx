'use client';
import { useActionState } from 'react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [error, action, pending] = useActionState(loginAction, null);
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-4">
      <form action={action} className="w-full max-w-xs space-y-3 rounded-xl border border-line bg-surface p-6">
        <h1 className="text-lg font-semibold">To-do của Emma</h1>
        <input
          name="password" type="password" autoFocus required placeholder="Mật khẩu"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-accent py-2 font-medium text-white disabled:opacity-60">
          {pending ? 'Đang vào…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

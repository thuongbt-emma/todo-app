import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createSessionToken } from '@/lib/auth/session';

const dbAccess = vi.hoisted(() => [] as string[]);
const session = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (session.token ? { value: session.token } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({
  prisma: new Proxy(
    {},
    {
      get(_t, prop) {
        dbAccess.push(String(prop));
        throw new Error(`unexpected DB access: prisma.${String(prop)}`);
      },
    },
  ),
}));

const SESSION_MESSAGE = 'Phiên đăng nhập đã hết, hãy đăng nhập lại';

// Plausible arguments for the known actions; any action added later falls back to dummy strings.
const ARGS: Record<string, unknown[]> = {
  quickAddAction: ['Gọi vendor #posm', 'g1'],
  addStepFromTextAction: ['c1', 'gửi file @Na 12/10'],
  undoAddStepAction: ['s1'],
  updateStepFromTextAction: ['s1', 'gửi file @Na 12/10'],
  updateCardAction: ['c1', { title: 't' }],
  moveCardAction: ['c1', 'g1', 1],
  completeCardAction: ['c1'],
  reopenCardAction: ['c1'],
  completeCardAtAction: ['c1', '2026-10-02T04:05:06.789Z'],
  undoQuickAddAction: [{ cardId: 'c1', cardTitle: 't', created: false, stepIds: ['s1'], addedTagIds: [], prevGroupId: null, prevOrder: null }],
  setStepDoneAtAction: ['s1', '2026-10-02T04:05:06.789Z'],
  deleteCardAction: ['c1'],
  restoreCardAction: ['c1'],
  updateStepAction: ['s1', { text: 't' }],
  toggleStepAction: ['s1', true],
  moveStepAction: ['s1', 1],
  deleteStepAction: ['s1'],
  restoreStepAction: ['s1'],
  createItemAction: ['tag', 'posm', '#123456'],
  updateItemAction: ['tag', 't1', { name: 'x' }],
  deleteItemAction: ['tag', 't1'],
  updateSettingsAction: [{ theme: 'dark', showDone: false }],
  bulkImportAction: ['Urgent\nGọi vendor'],
  createNoteAction: [],
  updateNoteAction: ['n1', { title: 't' }],
  discardNoteIfEmptyAction: ['n1'],
  deleteNoteAction: ['n1'],
  restoreNoteAction: ['n1'],
};

let actions: [string, (...args: unknown[]) => Promise<unknown>][];

beforeAll(async () => {
  process.env.SESSION_SECRET = 'a'.repeat(64);
  const mod: Record<string, unknown> = await import('@/lib/todo/actions');
  actions = Object.entries(mod).filter(
    (e): e is [string, (...args: unknown[]) => Promise<unknown>] => typeof e[1] === 'function',
  );
});

describe('server actions without a session', () => {
  it('discovers the exported actions', () => {
    expect(actions.length).toBeGreaterThanOrEqual(Object.keys(ARGS).length);
  });

  it('every action refuses with the session message and never touches the DB', async () => {
    for (const [name, fn] of actions) {
      const args = ARGS[name] ?? Array.from({ length: Math.max(fn.length, 1) }, () => 'x');
      const res = await fn(...args);
      expect(res, name).toEqual({ ok: false, error: SESSION_MESSAGE });
    }
    expect(dbAccess).toEqual([]);
  });
});

describe('input validation runs before any DB access', () => {
  afterEach(() => {
    session.token = undefined;
    dbAccess.length = 0;
  });

  it.each([
    ['quickAddAction', ['', 'g1']],
    ['quickAddAction', ['x'.repeat(2001), 'g1']],
    ['quickAddAction', ['Gọi vendor', '']],
    ['quickAddAction', [42, 'g1']],
    ['addStepFromTextAction', ['', 'gửi file']],
    ['addStepFromTextAction', ['c1', 'x'.repeat(501)]],
    ['addStepFromTextAction', ['c1', null]],
    ['undoAddStepAction', ['']],
    ['updateStepFromTextAction', ['', 'gửi file']],
    ['updateStepFromTextAction', ['s1', 'x'.repeat(501)]],
    ['updateStepFromTextAction', ['s1', null]],
    ['updateSettingsAction', [{ showDone: 'yes' }]],
  ] as [string, unknown[]][])('%s rejects bad input (case %#)', async (name, args) => {
    session.token = await createSessionToken(process.env.SESSION_SECRET!);
    const fn = actions.find(([n]) => n === name)![1];
    expect(await fn(...args)).toEqual({ ok: false, error: 'Dữ liệu không hợp lệ' });
    expect(dbAccess).toEqual([]);
  });
});

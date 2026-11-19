import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { useStudyData } from '../src/hooks/useStudyData';
import { rememberSession } from '../src/api/session';
import { readGuestStudy, writeGuestStudy } from '../src/study/guestData';
import type { GuestImportPreference } from '../src/study/guestData';
import type { StudyData } from '../src/api/study';
import type { Session } from '../src/api/account';

const guest: StudyData = {
  decks: [{ id: 'guest', title: 'Guest deck', subtitle: '', theme: 'peach', icon: 'language' }],
  cards: [{ id: 'guest-card', deckId: 'guest', front: 'Cloud', back: '구름', kind: 'word', dueAt: '2030-01-01T00:00:00Z', repetitions: 5 }],
  logs: [{ id: 'guest-review', cardId: 'guest-card', rating: 'good', date: '2026-11-18T10:00:00Z', mode: 'scheduled' }],
};
const account: StudyData = {
  decks: [{ id: 'remote', title: 'Account deck', subtitle: '', theme: 'blue', icon: 'book' }],
  cards: [{ id: 'remote-card', deckId: 'remote', front: 'Question', back: 'Answer', dueAt: '2031-01-01T00:00:00Z', repetitions: 7 }],
  logs: [],
};
const session = (): Session => ({ account: { id: 'account', email: 'person@example.com' },
  accessToken: 'a'.repeat(43), expiresAt: new Date(Date.now() + 900_000).toISOString() });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
let root: Root;
let node: HTMLDivElement;
let state: ReturnType<typeof useStudyData>;
let signedIn: boolean;
let imported: boolean;
function Probe() { state = useStudyData(); return null; }
async function render() { await act(async () => root.render(<LanguageProvider><Probe /></LanguageProvider>)); }
const importRequests = () => vi.mocked(fetch).mock.calls.filter(([path]) => String(path).endsWith('/study/import'));

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', { locks: undefined });
  rememberSession(null); localStorage.clear(); sessionStorage.clear();
  writeGuestStudy({ changed: true, data: structuredClone(guest) });
  signedIn = false; imported = false;
  vi.stubGlobal('fetch', vi.fn(async (path, options) => {
    const url = String(path);
    if (url.endsWith('/auth/refresh')) return signedIn ? json(session()) : json({ code: 'SESSION_EXPIRED' }, 401);
    if (/\/auth\/(login|signup|google)$/.test(url)) { signedIn = true; return json(session()); }
    if (url.endsWith('/auth/logout')) { signedIn = false; return new Response(null, { status: 204 }); }
    if (url.endsWith('/auth/me')) return json(session().account);
    if (url.endsWith('/study/import')) {
      expect(JSON.parse(String(options?.body))).toEqual(guest);
      imported = true;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/study')) return json(imported ? { decks: [...account.decks, ...guest.decks], cards: [...account.cards, ...guest.cards] } : account);
    throw new Error('Unexpected test API');
  }));
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); rememberSession(null); node.remove(); });

async function signIn(method: 'login' | 'signup' | 'google', preference: GuestImportPreference) {
  return method === 'google'
    ? state.connectGoogle({ credential: 'fixture', nonce: 'fixture' }, undefined, preference)
    : state.connect(method, 'person@example.com', 'dummy-password', preference);
}

describe('optional guest import during authentication', () => {
  it.each(['login', 'signup', 'google'] as const)('%s keeps the full guest records on-device when import is declined', async (method) => {
    const stored = localStorage.getItem('remory-guest-v2');
    await render();
    await act(async () => { expect(await signIn(method, 'keep')).toBe(false); });
    expect(state.account?.id).toBe('account');
    expect(state.decks).toEqual(account.decks); expect(state.cards).toEqual(account.cards);
    expect(importRequests()).toHaveLength(0);
    expect(localStorage.getItem('remory-guest-v2')).toBe(stored);
    await act(async () => state.disconnect());
    expect(state.account).toBeUndefined();
    expect(state.decks).toEqual(guest.decks); expect(state.cards).toEqual(guest.cards);
    expect(state.studyLogs).toEqual(guest.logs);
    expect(readGuestStudy().data).toEqual(guest);
  });

  it.each(['login', 'signup', 'google'] as const)('%s imports only with explicit selection and preserves existing account decks', async (method) => {
    await render();
    await act(async () => { expect(await signIn(method, 'import')).toBe(true); });
    expect(importRequests()).toHaveLength(1);
    expect(state.decks).toEqual([...account.decks, ...guest.decks]);
    expect(state.cards).toEqual([...account.cards, ...guest.cards]);
    expect(readGuestStudy().data).toEqual({ decks: [], cards: [], logs: [] });
  });

  it('does not silently import retained guest records after closing and reopening the app', async () => {
    await render();
    await act(async () => { await signIn('login', 'keep'); });
    await act(async () => root.unmount());
    rememberSession(null);
    root = createRoot(node);
    await render();
    expect(state.account?.id).toBe('account');
    expect(state.decks).toEqual(account.decks);
    expect(importRequests()).toHaveLength(0);
    expect(readGuestStudy().data).toEqual(guest);
    await act(async () => state.disconnect());
    expect(state.cards).toEqual(guest.cards); expect(state.studyLogs).toEqual(guest.logs);
  });

  it('keeps records added in another tab while account login is still loading', async () => {
    await render();
    const fetcher = vi.mocked(fetch);
    const base = fetcher.getMockImplementation()!;
    let finish!: (response: Response) => void;
    fetcher.mockImplementation(async (path, options) => String(path).endsWith('/study')
      ? new Promise<Response>((resolve) => { finish = resolve; }) : base(path, options));
    let pending!: Promise<boolean>;
    await act(async () => { pending = signIn('login', 'keep'); });
    const latest: StudyData = { ...guest, logs: [...guest.logs,
      { id: 'new-review', cardId: 'guest-card', rating: 'again', date: '2026-11-19T10:00:00Z', mode: 'free' }] };
    await act(async () => {
      writeGuestStudy({ changed: true, data: latest });
      window.dispatchEvent(new StorageEvent('storage', { key: 'remory-guest-v2', storageArea: localStorage }));
    });
    await act(async () => { finish(json(account)); await pending; });
    expect(importRequests()).toHaveLength(0);
    await act(async () => state.disconnect());
    expect(state.studyLogs).toEqual(latest.logs);
    expect(readGuestStudy().data).toEqual(latest);
  });

  it('preserves retained records even when the account library cannot be loaded', async () => {
    await render();
    const fetcher = vi.mocked(fetch);
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (path, options) => String(path).endsWith('/study') ? json({}, 503) : base(path, options));
    await act(async () => { await expect(signIn('login', 'keep')).rejects.toThrow(); });
    expect(importRequests()).toHaveLength(0);
    expect(readGuestStudy().data).toEqual(guest);
  });
});

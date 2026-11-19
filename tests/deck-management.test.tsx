import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { useStudyData } from '../src/hooks/useStudyData';
import { rememberSession } from '../src/api/session';
import { readGuestStudy, writeGuestStudy } from '../src/study/guestData';
import type { Deck, StudyCard, ReviewLog } from '../src/types';

const deck = (id: string): Deck => ({ id, title: id, subtitle: '', theme: 'blue', icon: 'book' });
const card = (id: string, deckId: string): StudyCard => ({ id, deckId, front: id, back: 'Answer', kind: 'word',
  dueAt: '2030-12-01T10:00:00.000Z', repetitions: 7 });
const log = (cardId: string): ReviewLog => ({ id: `log-${cardId}`, cardId, rating: 'good', date: '2026-11-18T10:00:00.000Z', mode: 'scheduled' });
const data = () => ({ decks: [deck('first'), deck('other')], cards: [card('one', 'first'), card('two', 'other')], logs: [log('one'), log('two')] });
const session = { account: { id: 'account', email: 'person@example.com' }, accessToken: 'a'.repeat(43), expiresAt: new Date(Date.now() + 900_000).toISOString() };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const content = { title: 'New name', subtitle: 'New description', theme: 'peach' as const };
let root: Root;
let node: HTMLDivElement;
let state: ReturnType<typeof useStudyData>;
function Probe() { state = useStudyData(); return null; }
async function render() { await act(async () => root.render(<LanguageProvider><Probe /></LanguageProvider>)); }
function guest() {
  writeGuestStudy({ changed: true, data: data() });
  vi.stubGlobal('fetch', vi.fn(async () => response({ code: 'SESSION_EXPIRED' }, 401)));
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', { locks: undefined });
  rememberSession(null);
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (path) => {
    if (String(path).endsWith('/auth/refresh')) return response(session);
    if (String(path).endsWith('/auth/me')) return response(session.account);
    if (String(path).endsWith('/study')) return response(data());
    throw new Error('Unexpected test API');
  }));
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); rememberSession(null); node.remove(); });

describe('deck management across guest and account storage', () => {
  it('persists guest edits without changing cards, schedules, review history or deck identity', async () => {
    guest(); await render();
    const before = readGuestStudy().data;
    await act(async () => { expect(await state.editDeck('first', content)).toBe(true); });
    const after = readGuestStudy().data;
    expect(after.decks[0]).toEqual({ ...before.decks[0], ...content });
    expect(after.cards).toEqual(before.cards);
    expect(after.logs).toEqual(before.logs);
    expect(state.cards).toEqual(before.cards);
    expect(state.studyLogs).toEqual(before.logs);
  });

  it('removes only a guest deck and its dependent cards and logs, including the last deck', async () => {
    guest(); await render();
    await act(async () => { expect(await state.deleteDeck('first')).toBe(true); });
    expect(readGuestStudy().data).toEqual({ decks: [deck('other')], cards: [card('two', 'other')], logs: [log('two')] });
    await act(async () => { expect(await state.deleteDeck('other')).toBe(true); });
    expect(state.decks).toEqual([]); expect(state.cards).toEqual([]); expect(state.studyLogs).toEqual([]);
    expect(readGuestStudy().data).toEqual({ decks: [], cards: [], logs: [] });
  });

  it('does not recreate a missing guest deck when editing', async () => {
    guest(); await render();
    await act(async () => { expect(await state.editDeck('missing', content)).toBe(false); });
    expect(readGuestStudy().data).toEqual(data());
    expect(state.syncError).toContain('덱');
  });

  it('keeps the last guest state if saving to the device fails', async () => {
    guest(); await render();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    await act(async () => { expect(await state.deleteDeck('first')).toBe(false); });
    expect(state.decks).toEqual(data().decks);
    expect(state.cards).toEqual(data().cards);
    expect(readGuestStudy().data).toEqual(data());
  });

  it('sends only editable deck fields and preserves loaded account cards', async () => {
    await render();
    const originalCards = state.cards;
    const fetcher = vi.mocked(fetch);
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (path, options) => {
      if (String(path).endsWith('/study/decks/first')) {
        expect(options?.method).toBe('PATCH');
        expect(JSON.parse(String(options?.body))).toEqual(content);
        return response({ ...deck('first'), ...content });
      }
      return base(path, options);
    });
    await act(async () => { expect(await state.editDeck('first', content)).toBe(true); });
    expect(state.decks[0]).toEqual({ ...deck('first'), ...content });
    expect(state.cards).toBe(originalCards);
  });

  it('removes account cards with their deck and refreshes calendar/statistics queries', async () => {
    await render();
    const version = state.activityVersion;
    const fetcher = vi.mocked(fetch);
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (path, options) => {
      if (String(path).endsWith('/study/decks/first')) {
        expect(options?.method).toBe('DELETE');
        return new Response(null, { status: 204 });
      }
      return base(path, options);
    });
    await act(async () => { expect(await state.deleteDeck('first')).toBe(true); });
    expect(state.decks).toEqual([deck('other')]);
    expect(state.cards).toEqual([card('two', 'other')]);
    expect(state.activityVersion).toBe(version + 1);
  });

  it('preserves account data and reports an error when the server cannot confirm deletion', async () => {
    await render();
    const fetcher = vi.mocked(fetch);
    const base = fetcher.getMockImplementation()!;
    fetcher.mockImplementation(async (path, options) => String(path).endsWith('/study/decks/first')
      ? response({}, 503) : base(path, options));
    await act(async () => { expect(await state.deleteDeck('first')).toBe(false); });
    expect(state.decks).toEqual(data().decks); expect(state.cards).toEqual(data().cards);
    expect(state.activityVersion).toBe(0); expect(state.syncError).not.toBe('');
  });
});

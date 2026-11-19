import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { DeckDetailPage } from '../src/pages/DeckDetailPage';
import { EditDeckModal } from '../src/components/dialogs/EditDeckModal';
import { filterCards, emptyCardFilters } from '../src/study/cardFilters';
import { rememberSession } from '../src/api/session';
import type { Deck, ReviewLog, StudyCard } from '../src/types';

const deck: Deck = { id: 'deck', title: 'Words', subtitle: 'Daily practice', theme: 'blue', icon: 'language' };
const cards: StudyCard[] = [
  { id: 'a', deckId: 'deck', kind: 'word', front: 'Apple', back: '사과', dueAt: '2000-01-01T00:00:00Z', repetitions: 2 },
  { id: 'b', deckId: 'deck', kind: 'word', front: 'Garden', back: '정원', dueAt: '2035-01-01T00:00:00Z', repetitions: 4 },
  { id: 'c', deckId: 'deck', kind: 'choice', front: 'Pick a fruit', back: 'Pear', choices: ['Pear', 'Peach', 'Lemon'], dueAt: '2000-01-01T00:00:00Z', repetitions: 1 },
];
let root: Root;
let node: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('BroadcastChannel', undefined);
  rememberSession(null); localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); rememberSession(null); node.remove(); });
async function render(token?: string, logs: ReviewLog[] = []) {
  await act(async () => root.render(<LanguageProvider><DeckDetailPage deck={deck} cards={cards}
    logs={logs} activityVersion={0} token={token} saving={false}
    back={vi.fn()} onAdd={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onEditDeck={vi.fn()}
    onDeleteDeck={vi.fn()} onStudy={vi.fn()} onFreeReview={vi.fn()} /></LanguageProvider>));
}
async function click(element: Element | null) {
  expect(element).not.toBeNull(); await act(async () => (element as HTMLElement).click());
}
async function choose(index: number, label: string) {
  await click(node.querySelectorAll('[role="combobox"]')[index]);
  await click([...node.querySelectorAll('[role="option"]')].find((option) => option.textContent === label) ?? null);
}
async function search(value: string) {
  const input = node.querySelector('input[type="search"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const visible = () => [...node.querySelectorAll('.list-card-content strong')].map((element) => element.textContent);

describe('card discovery and deck editing', () => {
  it('searches answers and choices while preserving card indices, and resets empty results', async () => {
    await render();
    await search('사과'); expect(visible()).toEqual(['Apple']);
    await search('lemon'); expect(visible()).toEqual(['Pick a fruit']);
    expect(node.querySelector('.list-index')?.textContent).toBe('03');
    await search('no match'); expect(visible()).toEqual([]);
    expect(node.textContent).toContain('조건에 맞는 카드가 없어요.');
    await click(node.querySelector('.card-search-empty button'));
    expect(visible()).toEqual(['Apple', 'Garden', 'Pick a fruit']);
  });

  it('combines type and review status without changing the deck or card data', async () => {
    const before = structuredClone(cards);
    await render();
    await choose(0, '단어와 예문');
    await choose(1, '복습 예정');
    expect(visible()).toEqual(['Garden']);
    await choose(1, '지금 복습할 카드');
    expect(visible()).toEqual(['Apple']);
    expect(cards).toEqual(before);
  });

  it('loads account history only when the frequently-missed filter is selected', async () => {
    const account = { id: 'account', email: 'person@example.com' };
    rememberSession({ account, accessToken: 'a'.repeat(43), expiresAt: new Date(Date.now() + 900_000).toISOString() });
    vi.stubGlobal('fetch', vi.fn(async (path) => {
      const url = new URL(String(path), 'http://localhost');
      expect(url.pathname).toBe('/api/v1/study/stats');
      expect(url.searchParams.get('period')).toBe('all');
      expect(url.searchParams.get('deckId')).toBe('deck');
      return new Response(JSON.stringify({ cards: [{ id: 'c', counts: { again: 3 } }, { id: 'a', counts: { again: 1 } }] }), { status: 200 });
    }));
    await render('a'.repeat(43)); expect(fetch).not.toHaveBeenCalled();
    await choose(1, '자주 틀린 카드');
    expect(fetch).toHaveBeenCalledTimes(1); expect(visible()).toEqual(['Pick a fruit']);
    expect(node.textContent).toContain('2회 이상');
  });

  it('prefills the shared deck form and submits only editable fields', async () => {
    const save = vi.fn();
    await act(async () => root.render(<LanguageProvider><EditDeckModal deck={deck} saving={false} onClose={vi.fn()} onSave={save} /></LanguageProvider>));
    const inputs = [...node.querySelectorAll('input')];
    expect(inputs.map((input) => input.value)).toEqual(['Words', 'Daily practice']);
    await click(node.querySelector('[aria-label="라벤더"]'));
    await act(async () => node.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(save).toHaveBeenCalledWith({ title: 'Words', subtitle: 'Daily practice', theme: 'lavender' });
    expect(node.textContent).toContain('복습일은 그대로');
  });

  it('uses guest review history for the same frequently-missed threshold', async () => {
    await render(undefined, [
      { id: '1', cardId: 'a', rating: 'again', date: '2026-11-01', mode: 'scheduled' },
      { id: '2', cardId: 'a', rating: 'again', date: '2026-11-02', mode: 'free' },
      { id: '3', cardId: 'b', rating: 'again', date: '2026-11-03', mode: 'focus' },
      { id: '4', cardId: 'c', rating: 'hard', date: '2026-11-03', mode: 'scheduled' },
    ]);
    await choose(1, '자주 틀린 카드');
    expect(visible()).toEqual(['Apple']);
  });

  it('shows a retry instead of empty results when account history cannot be loaded', async () => {
    const account = { id: 'account', email: 'person@example.com' };
    rememberSession({ account, accessToken: 'a'.repeat(43), expiresAt: new Date(Date.now() + 900_000).toISOString() });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cards: [{ id: 'a', counts: { again: 2 } }] }), { status: 200 })));
    await render('a'.repeat(43));
    await choose(1, '자주 틀린 카드');
    expect(node.querySelector('[role="alert"]')?.textContent).toContain('불러오지 못했어요');
    expect(node.querySelector('.card-search-empty')).toBeNull();
    await click(node.querySelector('.card-query-state button'));
    expect(visible()).toEqual(['Apple']);
  });

  it('normalizes full-width search text and treats the exact due time as due now', () => {
    const now = Date.parse(cards[0].dueAt);
    expect(filterCards(cards, { ...emptyCardFilters, search: 'ＡＰＰＬＥ 사과', status: 'due' }, new Set(), now).map((card) => card.id)).toEqual(['a']);
    expect(filterCards(cards, { ...emptyCardFilters, status: 'upcoming' }, new Set(), now).map((card) => card.id)).toEqual(['b']);
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { useReviewSession } from '../src/hooks/useReviewSession';
import type { Deck, StudyCard } from '../src/types';

const mocked = vi.hoisted(() => ({ study: vi.fn() }));
vi.mock('../src/hooks/useStudyData', () => ({ useStudyData: mocked.study }));

const decks: Deck[] = [
  { id: 'a', title: 'Language', subtitle: '', theme: 'peach', icon: 'language' },
  { id: 'b', title: 'Development', subtitle: '', theme: 'lavender', icon: 'code' },
  { id: 'c', title: 'History', subtitle: '', theme: 'butter', icon: 'history' },
];
const card = (id: string, deckId: string, due = true): StudyCard => ({ id, deckId,
  front: id, back: `Answer for ${id}`, kind: 'basic', repetitions: 2,
  dueAt: due ? '2000-01-01T00:00:00Z' : '2035-01-01T00:00:00Z' });
const allCards = [card('language-due', 'a'), card('language-later', 'a', false),
  card('code-one', 'b'), card('code-two', 'b'), card('history-later', 'c', false)];

let root: Root;
let node: HTMLDivElement;
let data: { decks: Deck[]; cards: StudyCard[] };
const record = vi.fn();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  localStorage.clear(); sessionStorage.clear();
  data = { decks: [...decks], cards: [...allCards] };
  record.mockReset().mockResolvedValue(true);
  mocked.study.mockImplementation(() => ({ ...data, studyLogs: [], lastReviewByCard: new Map([['code-one', { id: 'previous', cardId: 'code-one',
      date: '2020-11-20T10:30:00Z', rating: 'hard', mode: 'free' }]]), recordReview: record,
    account: undefined, token: undefined, saving: false, activityVersion: 0,
    restoring: false, restoreError: false, syncError: '', guestPending: false }));
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });

async function render() { await act(async () => root.render(<LanguageProvider><App /></LanguageProvider>)); }
function byText(text: string) {
  return [...node.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);
}
async function click(element: Element | undefined | null) {
  expect(element).toBeTruthy();
  await act(async () => (element as HTMLElement).click());
  // jsdom does not run CSS animations; finish the existing sheet exit transition.
  const closing = node.querySelector('.modal-layer[data-closing]');
  if (closing) await act(async () => {
    for (const type of ['animationend', 'webkitAnimationEnd']) {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'animationName', { value: 'modal-dimmer-out' });
      closing.dispatchEvent(event);
    }
  });
}
const chooseDeck = (title: string) => click([...node.querySelectorAll('.review-deck-option')]
  .find((button) => button.textContent?.includes(title)));
async function rememberCurrent() {
  await click(byText('정답 확인하기'));
  await click([...node.querySelectorAll('.rating')].find((button) => button.textContent?.includes('보통')));
}

describe('deck-scoped review', () => {
  it('shows a text-only Review button and asks which deck before starting', async () => {
    await render();
    const action = node.querySelector('.hero-action')!;
    expect(action.textContent).toBe('복습하기'); expect(action.querySelector('svg')).toBeNull();
    await click(action);
    expect(node.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('복습할 덱');
    const choices = [...node.querySelectorAll('.review-deck-option')] as HTMLButtonElement[];
    expect(choices.map((button) => button.textContent)).toEqual([
      'Language복습할 카드 1장', 'Development복습할 카드 2장', 'History반복 학습 · 카드 1장',
    ]);
    expect(choices.map((button) => button.disabled)).toEqual([false, false, false]);
    expect(choices[2].getAttribute('aria-label')).toBe('History 반복 학습하기, 카드 1장');
    expect(record).not.toHaveBeenCalled();
  });

  it('reviews only the chosen deck and returns to selection after completion', async () => {
    await render(); await click(node.querySelector('.hero-action')); await chooseDeck('Development');
    expect(node.querySelector('[role="dialog"]')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Development');
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('code-one');
    expect(node.querySelector('.flashcard .card-review-history')?.textContent).toContain(' · 어려움');
    expect(node.querySelector('.flashcard time')?.getAttribute('datetime')).toBe('2020-11-20T10:30:00Z');
    expect(node.querySelector('.floating-add')).toBeNull();
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 2');
    await click(byText('정답 확인하기'));
    expect(node.querySelector('.flashcard')?.nextElementSibling).toBe(node.querySelector('.rating-section'));
    await click([...node.querySelectorAll('.rating')].find((button) => button.textContent?.includes('보통')));
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('code-two');
    expect(node.querySelector('.flashcard .card-review-history')?.textContent).toBe('첫 학습');
    await rememberCurrent();
    expect(record.mock.calls.map(([id, rating, mode, , firstRecall]) => ({ id, rating, mode, firstRecall }))).toEqual([
      { id: 'code-one', rating: 'good', mode: 'scheduled', firstRecall: 'self_recalled' },
      { id: 'code-two', rating: 'good', mode: 'scheduled', firstRecall: 'self_recalled' },
    ]);
    expect(node.querySelector('.completion')).not.toBeNull();
    expect(node.querySelector('.completion .big-primary')?.textContent).toContain('학습 캘린더 보기');
    expect(node.querySelector('.completion')?.textContent).not.toContain('놓친 카드');
    await click(byText('남은 복습'));
    expect(node.querySelector('.review-deck-picker')).not.toBeNull();
  });

  it('offers one focused pass over only the cards missed in the completed review', async () => {
    const missedChoice: StudyCard = {
      ...card('missed-choice', 'b'), kind: 'choice', back: 'Right', choices: ['Right', 'Wrong', 'Other'],
    };
    data.cards = [card('missed-basic', 'b'), card('known', 'b'), missedChoice, card('unseen', 'a')];
    await render(); await click(node.querySelector('.hero-action')); await chooseDeck('Development');
    await click(byText('정답 확인하기'));
    await click(node.querySelector('.rating-again'));
    await rememberCurrent();
    await click(byText('Wrong'));
    await click(node.querySelector('.rating-good'));

    const completionScroll = node.querySelector<HTMLElement>('.app-scroll')!;
    completionScroll.scrollTop = 400;
    await click(byText('놓친 카드 2장 다시 풀기'));
    expect(node.querySelector('.app-scroll')?.scrollTop).toBe(0);
    expect(node.querySelector('.review-top h1')?.textContent).toBe('집중 복습');
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Development');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 2');
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('missed-basic');
    await click(byText('정답 확인하기'));
    await click(node.querySelector('.rating-again'));
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('missed-choice');
    await click(byText('Right'));
    await click(node.querySelector('.rating-good'));

    expect(record.mock.calls.slice(3)).toEqual([
      ['missed-basic', 'again', 'focus', expect.any(String), undefined],
      ['missed-choice', 'good', 'focus', expect.any(String), undefined],
    ]);
    expect(node.querySelector('.completion')?.textContent).toContain('집중 복습을 마쳤어요!');
    expect(node.querySelector('.completion')?.textContent).not.toContain('놓친 카드');
  });

  it('uses the same deck selection from the bottom navigation', async () => {
    await render(); await click(byText('복습')); await chooseDeck('Language');
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Language');
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('language-due');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 1');
  });

  it('starts directly from a deck detail using only that deck', async () => {
    await render();
    await click([...node.querySelectorAll('.deck-tile')].find((button) => button.textContent?.includes('Development')));
    await click(byText('복습 시작'));
    expect(node.querySelector('.review-deck-picker')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Development');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 2');
  });

  it('starts the sole deck directly while excluding cards not yet due', async () => {
    data = { decks: [decks[0]], cards: allCards.filter((card) => card.deckId === 'a') };
    await render(); await click(node.querySelector('.hero-action'));
    expect(node.querySelector('.review-deck-picker')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Language');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 1');
  });

  it('shows an empty review with a deck-creation action when there are no decks', async () => {
    data = { decks: [], cards: [] };
    await render(); await click(byText('복습'));
    expect(node.querySelector('.empty-review')).not.toBeNull();
    expect(byText('첫 덱 만들기')).toBeTruthy();
    expect(record).not.toHaveBeenCalled();
  });

  it('starts free review of a future-only deck even while other decks have due cards', async () => {
    await render(); await click(node.querySelector('.hero-action')); await chooseDeck('History');
    expect(node.querySelector('[role="dialog"]')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('History');
    expect(node.querySelector('.review-top h1')?.textContent).toBe('반복 학습');
    expect(node.querySelector('.flashcard-content h2')?.textContent).toBe('history-later');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 1');
    await rememberCurrent();
    expect(record).toHaveBeenCalledWith('history-later', 'good', 'free', expect.any(String), undefined);
  });

  it('starts the selected deck directly in free mode when every deck has no due cards', async () => {
    data.cards = allCards.map((card) => ({ ...card, dueAt: '2035-01-01T00:00:00Z' }));
    await render(); await click(byText('복습'));
    expect([...node.querySelectorAll('.review-deck-option')].every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
    await chooseDeck('Development');
    expect(node.querySelector('[role="dialog"]')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Development');
    expect(node.querySelector('.review-top h1')?.textContent).toBe('반복 학습');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 2');
    await rememberCurrent(); await rememberCurrent();
    expect(record.mock.calls.map(([id, , mode]) => ({ id, mode }))).toEqual([
      { id: 'code-one', mode: 'free' }, { id: 'code-two', mode: 'free' },
    ]);
  });

  it('also starts free review directly when the only deck has no due cards', async () => {
    data = { decks: [decks[0]], cards: allCards.filter((card) => card.deckId === 'a')
      .map((card) => ({ ...card, dueAt: '2035-01-01T00:00:00Z' })) };
    await render(); await click(byText('복습'));
    expect(node.querySelector('.review-deck-picker')).toBeNull();
    expect(node.querySelector('.review-deck-name')?.textContent).toBe('Language');
    expect(node.querySelector('.review-top h1')?.textContent).toBe('반복 학습');
    expect(node.querySelector('.review-index')?.textContent).toContain('/ 2');
  });

  it('keeps decks with no cards disabled while allowing other decks', async () => {
    data.cards = allCards.filter((card) => card.deckId !== 'c');
    await render(); await click(node.querySelector('.hero-action'));
    const choices = [...node.querySelectorAll('.review-deck-option')] as HTMLButtonElement[];
    expect(choices.map((button) => button.disabled)).toEqual([false, false, true]);
    expect(choices[2].textContent).toBe('History아직 카드가 없어요.');
    expect(choices[2].getAttribute('aria-label')).toBe('History, 아직 카드가 없어요.');
    await chooseDeck('History');
    expect(node.querySelector('.review-deck-picker')).not.toBeNull();
    expect(record).not.toHaveBeenCalled();
  });

  it.each([
    ['Wrong', 'choice_incorrect'],
    ['Right', 'choice_correct'],
    ['정답 확인하기', 'choice_revealed'],
  ])('keeps the first choice result after turning the card back and choosing again (%s)', async (initial, outcome) => {
    data = { decks: [decks[0]], cards: [{ ...card('choice', 'a'), kind: 'choice', back: 'Right', choices: ['Right', 'Wrong', 'Other'] }] };
    await render(); await click(node.querySelector('.hero-action'));
    await click(byText(initial));
    await click(node.querySelector('.flashcard'));
    await click(byText('Right'));
    await click(node.querySelector('.rating-good'));
    expect(record).toHaveBeenCalledWith('choice', 'good', 'scheduled', expect.any(String), outcome);
    expect(Boolean(byText('놓친 카드 1장 다시 풀기'))).toBe(outcome === 'choice_incorrect');
  });

  it('retries the same first recall result when saving fails', async () => {
    data = { decks: [decks[0]], cards: [allCards[0]] };
    record.mockResolvedValueOnce(false);
    await render(); await click(node.querySelector('.hero-action'));
    await click(byText('정답 확인하기'));
    expect(node.querySelector('.rating-section p')?.textContent).toContain('정답을 보기 전');
    await click(node.querySelector('.rating-again'));
    await click(node.querySelector('.rating-again'));
    expect(record.mock.calls[0]).toEqual(['language-due', 'again', 'scheduled', expect.any(String), 'self_missed']);
    expect(record.mock.calls[1]).toEqual(record.mock.calls[0]);
    expect(byText('놓친 카드 1장 다시 풀기')).toBeTruthy();
  });

  it('never broadens an empty or unknown deck ID into all decks', async () => {
    let state!: ReturnType<typeof useReviewSession>;
    function Probe() { state = useReviewSession(allCards, record); return null; }
    await act(async () => root.render(<Probe />));
    await act(async () => state.start('a'));
    expect(state.total).toBe(1);
    await act(async () => state.start('unknown'));
    expect(state.total).toBe(0); expect(state.current).toBeUndefined();
    await act(async () => state.start(''));
    expect(state.total).toBe(0);
  });
});

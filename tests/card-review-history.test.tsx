import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CardReviewHistory } from '../src/components/CardReviewHistory';
import { useStudyData } from '../src/hooks/useStudyData';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import { rememberSession } from '../src/api/session';
import { readGuestStudy, writeGuestStudy } from '../src/study/guestData';
import { latestReviewsByCard } from '../src/study/latestReviews';
import { nextReviewAt } from '../src/study/reviewScheduler';
import type { Locale } from '../src/i18n/messages';
import type { ReviewLog, StudyCard } from '../src/types';

const deck = { id: 'deck', title: 'Words', subtitle: '', theme: 'peach' as const, icon: 'language' };
const card: StudyCard = { id: 'card', deckId: deck.id, front: 'Bloom', back: '꽃이 피다',
  kind: 'word', dueAt: '2035-01-01T00:00:00Z', repetitions: 0 };
const log = (id: string, date: string, rating: ReviewLog['rating'] = 'good', mode: ReviewLog['mode'] = 'scheduled'): ReviewLog =>
  ({ id, cardId: card.id, date, rating, mode });
const older = log('old', '2020-11-18T03:00:00Z', 'again');
const recent = log('recent', '2020-11-20T04:30:00Z', 'hard', 'free');
const session = { account: { id: 'account', email: 'person@example.com' }, accessToken: 'a'.repeat(43),
  expiresAt: new Date(Date.now() + 900_000).toISOString() };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { 'Content-Type': 'application/json' } });
let root: Root;
let node: HTMLDivElement;
let study: ReturnType<typeof useStudyData>;
let serverReview = recent;
function Probe() { study = useStudyData(); return null; }
async function renderStudy() { await act(async () => root.render(<LanguageProvider><Probe /></LanguageProvider>)); }
async function renderHistory(review?: ReviewLog, locale: Locale = 'ko') {
  localStorage.setItem('remory-locale', JSON.stringify(locale));
  await act(async () => root.render(<LanguageProvider key={locale}><CardReviewHistory review={review} /></LanguageProvider>));
}
function guest(logs = [recent, older]) {
  writeGuestStudy({ changed: true, data: { decks: [deck], cards: [card], logs } });
  vi.stubGlobal('fetch', vi.fn(async () => json({ code: 'SESSION_EXPIRED' }, 401)));
}
function account(latestReviews = [recent]) {
  vi.stubGlobal('fetch', vi.fn(async (path) => {
    const url = String(path);
    if (url.endsWith('/auth/refresh')) return json(session);
    if (url.endsWith('/auth/me')) return json(session.account);
    if (url.endsWith('/study')) return json({ decks: [deck], cards: [card], latestReviews });
    if (url.endsWith('/study/reviews')) return json({ progress: { id: card.id, dueAt: card.dueAt, repetitions: card.repetitions }, review: serverReview });
    if (url.endsWith('/auth/logout') || url.endsWith('/study/cards/card') || url.endsWith('/study/decks/deck')) return new Response(null, { status: 204 });
    throw new Error('Unexpected test API');
  }));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', { locks: undefined });
  rememberSession(null); localStorage.clear(); sessionStorage.clear();
  serverReview = recent;
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); rememberSession(null); node.remove(); });

describe('last study shown on a card', () => {
  beforeEach(() => {
    const date = new Date(recent.date);
    vi.spyOn(Date, 'now').mockReturnValue(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3, 12).getTime());
  });
  it('finds the latest timestamp across scheduled, free and focus reviews regardless of array order', () => {
    const focus = log('focus', '2020-11-21T05:00:00Z', 'easy', 'focus');
    const other = { ...log('other', '2025-01-01T00:00:00Z'), cardId: 'another-card' };
    const latest = latestReviewsByCard([focus, other, older, recent]);
    expect(latest.get(card.id)).toEqual(focus);
    expect(latest.get(other.cardId)).toEqual(other);
  });

  it('ignores invalid stored dates and resolves identical timestamps consistently', () => {
    const low = { ...recent, id: 'a' };
    const high = { ...recent, id: 'z', rating: 'easy' as const };
    expect(latestReviewsByCard([high, low, log('invalid', 'invalid')]).get(card.id)).toEqual(high);
  });

  it.each([
    ['ko', '첫 학습', '3일 전 학습', '어려움'],
    ['en', 'First review', 'Studied 3 days ago', 'Hard'],
    ['ja', '初めての学習', '3日前に学習', '難しい'],
    ['zh-CN', '首次学习', '3天前学习', '困难'],
  ] as const)('shows a short study note in %s', async (locale, first, when, rating) => {
    await renderHistory(undefined, locale);
    expect(node.textContent).toContain(first); expect(node.querySelector('time')).toBeNull();
    await renderHistory(recent, locale);
    // CLDR versions differ on the space before the Japanese day marker.
    const text = node.querySelector('.card-review-history')?.textContent?.replace(/(\d)\s+日/g, '$1日');
    expect(text).toBe(`${when} · ${rating}`);
    expect(node.querySelector('.card-review-history')?.getAttribute('title')).toContain('2020');
    expect(node.querySelector('aside, svg')).toBeNull();
    expect(node.querySelector('time')?.dateTime).toBe(recent.date);
  });

  it('shows each of the four saved ratings as plain text', async () => {
    for (const [rating, label] of [['again', '다시'], ['hard', '어려움'], ['good', '보통'], ['easy', '쉬움']] as const) {
      await renderHistory({ ...recent, rating });
      expect(node.querySelector('.card-review-history')?.textContent).toBe(`3일 전 학습 · ${label}`);
    }
  });
});

describe('relative study date at the local day boundary', () => {
  it('shows yesterday after midnight even if the review was only ten minutes ago', async () => {
    const yesterday = new Date(2020, 10, 22, 23, 55);
    vi.spyOn(Date, 'now').mockReturnValue(new Date(2020, 10, 23, 0, 5).getTime());
    await renderHistory({ ...recent, date: yesterday.toISOString() });
    expect(node.querySelector('time')?.textContent).toBe('어제 학습');
  });
});

describe('last study across guest and account storage', () => {
  it('reads guest history even for a card with no scheduled-review repetitions', async () => {
    guest(); await renderStudy();
    expect(study.cards[0].repetitions).toBe(0);
    expect(study.lastReviewByCard.get(card.id)).toEqual(recent);
  });

  it.each(['free', 'focus'] as const)('updates and restores a %s review without changing the schedule', async (mode) => {
    guest(); await renderStudy();
    await act(async () => { expect(await study.recordReview(card.id, 'easy', mode, 'new')).toBe(true); });
    const saved = study.lastReviewByCard.get(card.id)!;
    expect(saved.id).toBe('new'); expect(saved.rating).toBe('easy'); expect(saved.mode).toBe(mode);
    expect(study.cards).toEqual([card]); expect(readGuestStudy().data.cards).toEqual([card]);
    await act(async () => root.render(<LanguageProvider><span /></LanguageProvider>));
    await renderStudy();
    expect(study.lastReviewByCard.get(card.id)).toEqual(saved);
  });

  it('stores a guest first recall with repeat practice history without counting it toward the schedule', async () => {
    guest(); await renderStudy();
    await act(async () => { expect(await study.recordReview(card.id, 'again', 'scheduled', 'follow-up', 'self_missed')).toBe(true); });
    const stored = readGuestStudy().data;
    const followUp = stored.logs.find((review) => review.id === 'follow-up')!;
    expect(followUp.firstRecall).toBe('self_missed');
    expect(stored.logs).toContainEqual(recent);
    expect(stored.cards[0].dueAt).toBe(nextReviewAt([older], followUp));
  });

  it('restores account history without using guest history with matching card IDs', async () => {
    guest([log('guest-only', '2030-11-22T07:00:00Z')]); account(); await renderStudy();
    expect(study.account?.id).toBe('account'); expect(study.studyLogs).toEqual([]);
    expect(study.lastReviewByCard.get(card.id)).toEqual(recent);
  });

  it('updates account history using the confirmed server review time and preserves free-review progress', async () => {
    account(); await renderStudy();
    serverReview = log('saved', '2021-06-01T07:12:00Z', 'easy', 'free');
    await act(async () => { expect(await study.recordReview(card.id, 'easy', 'free', 'saved')).toBe(true); });
    expect(study.lastReviewByCard.get(card.id)).toEqual(serverReview);
    expect(study.cards).toEqual([card]);
  });

  it('does not replace newer account history when an older saved review is retried', async () => {
    account(); await renderStudy(); serverReview = older;
    await act(async () => { expect(await study.recordReview(card.id, 'again', 'scheduled', older.id)).toBe(true); });
    expect(study.lastReviewByCard.get(card.id)).toEqual(recent);
  });

  it.each(['card', 'deck'] as const)('removes the stored last review when its account %s is deleted', async (target) => {
    account(); await renderStudy();
    await act(async () => { expect(await (target === 'card' ? study.deleteCard(card.id) : study.deleteDeck(deck.id))).toBe(true); });
    expect(study.lastReviewByCard.size).toBe(0);
  });

  it('restores the device’s own last review on logout without leaking account history', async () => {
    guest([older]); account(); await renderStudy();
    expect(study.lastReviewByCard.get(card.id)).toEqual(recent);
    await act(async () => { await study.disconnect(); });
    expect(study.account).toBeUndefined(); expect(study.lastReviewByCard.get(card.id)).toEqual(older);
  });
});

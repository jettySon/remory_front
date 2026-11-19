import type { DailyCounts, RatingCounts } from '../study/insights';
import type { CardContent, CardDraft, Deck, DeckContent, Rating, ReviewLog, ReviewMode, StudyCard } from '../types';
import { request } from './request';

export type StudyLibrary = { decks: Deck[]; cards: StudyCard[] };
export type StudyData = StudyLibrary & { logs: ReviewLog[] };
export type NewCard = CardDraft & { id: string };
type ReviewProgress = Pick<StudyCard, 'id' | 'dueAt' | 'repetitions'>;
export type NewReview = { id: string; cardId: string; rating: Rating; mode: ReviewMode };
export type StudyReport = {
  totals: { total: number; free: number };
  decks: { id: string; counts: RatingCounts }[];
  cards: { id: string; counts: RatingCounts; latestRating: Rating }[];
  week: DailyCounts;
};

export const fetchStudy = (token: string, signal?: AbortSignal) =>
  request<StudyLibrary>('/study', 'GET', token, undefined, signal);
export const importStudy = (token: string, data: StudyData) =>
  request<void>('/study/import', 'POST', token, data);
export const saveDeck = (token: string, deck: Deck) => request<Deck>('/study/decks', 'POST', token, deck);
export const editStudyDeck = (token: string, deckId: string, content: DeckContent) =>
  request<Deck>(`/study/decks/${encodeURIComponent(deckId)}`, 'PATCH', token, content);
export const deleteStudyDeck = (token: string, deckId: string) =>
  request<void>(`/study/decks/${encodeURIComponent(deckId)}`, 'DELETE', token);
export const saveCards = (token: string, deckId: string, cards: NewCard[]) =>
  request<StudyCard[]>(`/study/decks/${encodeURIComponent(deckId)}/cards`, 'POST', token, { cards });
export const editStudyCard = (token: string, cardId: string, content: CardContent) =>
  request<StudyCard>(`/study/cards/${encodeURIComponent(cardId)}`, 'PATCH', token, content);
export const deleteStudyCard = (token: string, cardId: string) =>
  request<void>(`/study/cards/${encodeURIComponent(cardId)}`, 'DELETE', token);
export const saveReview = (token: string, review: NewReview) =>
  request<{ progress: ReviewProgress; review: ReviewLog }>('/study/reviews', 'POST', token, review);

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export function activityPath(from: string, to: string) {
  return `/study/activity?${new URLSearchParams({ from, to, zone })}`;
}

export function statsPath(period: string, deckId: string | null) {
  const params = new URLSearchParams({ period, zone });
  if (deckId) params.set('deckId', deckId);
  return `/study/stats?${params}`;
}

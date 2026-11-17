import type { Deck, Rating, ReviewLog, StudyCard } from '../types';
import { localDay } from './review';

export const reviewRatings = ['again', 'hard', 'good', 'easy'] as const;

export type RatingCounts = Record<Rating, number> & { total: number };
export type DailyCounts = Partial<Record<string, RatingCounts>>;

function emptyCounts(): RatingCounts {
  return { total: 0, again: 0, hard: 0, good: 0, easy: 0 };
}

function record(counts: RatingCounts, rating: Rating) {
  counts.total += 1;
  counts[rating] += 1;
}

export function getReviewInsights(decks: Deck[], cards: StudyCard[], logs: ReviewLog[], days: number | null) {
  const since = new Date();
  if (days !== null) since.setDate(since.getDate() - days + 1);
  const firstDay = days === null ? null : localDay(since);
  const cardCounts = new Map<string, RatingCounts>();
  const latest = new Map<string, ReviewLog>();
  const deckCounts = new Map<string, RatingCounts>();
  const deckIds = new Set(decks.map((deck) => deck.id));
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  for (const log of logs) {
    if (firstDay !== null && localDay(log.date) < firstDay) continue;
    const card = cardsById.get(log.cardId);
    if (!card || !deckIds.has(card.deckId)) continue;
    const cardCount = cardCounts.get(card.id) ?? emptyCounts();
    record(cardCount, log.rating);
    cardCounts.set(card.id, cardCount);
    const deckCount = deckCounts.get(card.deckId) ?? emptyCounts();
    record(deckCount, log.rating);
    deckCounts.set(card.deckId, deckCount);
    const previous = latest.get(card.id);
    if (!previous || Date.parse(log.date) >= Date.parse(previous.date)) latest.set(card.id, log);
  }

  function rank(a: RatingCounts, b: RatingCounts) {
    return b.again - a.again || b.again / b.total - a.again / a.total || b.hard - a.hard;
  }

  return {
    decks: decks
      .flatMap((deck) => {
        const counts = deckCounts.get(deck.id);
        return counts ? [{ deck, ...counts }] : [];
      })
      .sort(rank),
    cards: cards
      .flatMap((card) => {
        const counts = cardCounts.get(card.id);
        if (!counts?.again) return [];
        return [{ card, ...counts, latestRating: latest.get(card.id)?.rating }];
      })
      .sort(rank),
  };
}

export function weekDays() {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    return { key: localDay(date), label: `${date.getMonth() + 1}/${date.getDate()}`, weekday: date.getDay() };
  });
}

export function weekWithCounts(counts: DailyCounts | undefined) {
  return weekDays().map((day) => ({ ...day, counts: counts?.[day.key] ?? emptyCounts() }));
}

export function getReviewWeek(logs: ReviewLog[], cards: StudyCard[], deckId?: string) {
  const days = weekWithCounts(undefined);
  const byDay = new Map(days.map((day) => [day.key, day.counts]));
  const cardIds = deckId
    ? new Set(cards.filter((card) => card.deckId === deckId).map((card) => card.id))
    : null;
  for (const log of logs) {
    if (cardIds && !cardIds.has(log.cardId)) continue;
    const counts = byDay.get(localDay(log.date));
    if (counts) record(counts, log.rating);
  }
  return days;
}

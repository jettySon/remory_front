import { useMemo } from 'react';
import { useStoredState } from './useStoredState';
import { initialCards, initialDecks } from '../study/seed';
import type { CardDraft, Deck, Rating, ReviewLog, StudyCard } from '../types';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// The prototype uses fixed review intervals. These will be replaced by the server scheduler.
const delayMs: Record<Rating, number> = {
  again: 10 * 60_000,
  hard: 86_400_000,
  good: 3 * 86_400_000,
  easy: 7 * 86_400_000,
};

export function useStudyData() {
  const [decks, setDecks] = useStoredState<Deck[]>('recall-decks-v1', initialDecks);
  const [cards, setCards] = useStoredState<StudyCard[]>('recall-cards-v1', initialCards);
  const [logs, setLogs] = useStoredState<ReviewLog[]>('recall-logs-v1', []);

  const studyLogs = useMemo(
    () => logs.filter((log) => log.cardId !== 'seed' || !log.id.startsWith('seed-')),
    [logs],
  );

  function createDeck(deck: Omit<Deck, 'id'>) {
    const id = uid();
    setDecks((previous) => [...previous, { id, ...deck }]);
    return id;
  }

  function createCards(deckId: string, drafts: CardDraft[]) {
    const dueAt = new Date().toISOString();
    const newCards = drafts.map((draft) => ({ ...draft, id: uid(), deckId, dueAt, repetitions: 0 }));
    setCards((previous) => [...previous, ...newCards]);
  }

  function recordReview(cardId: string, rating: Rating) {
    const now = Date.now();
    const dueAt = new Date(now + delayMs[rating]).toISOString();
    const log = { id: uid(), cardId, rating, date: new Date(now).toISOString() };
    setCards((previous) =>
      previous.map((card) =>
        card.id === cardId ? { ...card, dueAt, repetitions: card.repetitions + 1 } : card,
      ),
    );
    setLogs((previous) => [...previous, log]);
  }

  return { decks, cards, studyLogs, createDeck, createCards, recordReview };
}

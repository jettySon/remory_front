import type { StudyData } from '../api/account';
import type { ReviewLog } from '../types';

const guestKey = 'remory-guest-v2';
const legacyExampleDeckIds = new Set(['english', 'java', 'history', 'general']);
const legacyExampleCardIds = new Set(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);

export type GuestStudy = { data: StudyData; changed: boolean };

export function newGuestStudy(): GuestStudy {
  return { data: { decks: [], cards: [], logs: [] }, changed: false };
}

export function isStudyLog(log: ReviewLog) {
  return log.cardId !== 'seed' || !log.id.startsWith('seed-');
}

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function readGuestStudy(): GuestStudy {
  const stored = readStorage<GuestStudy>(guestKey)?.data ?? {
    decks: readStorage<StudyData['decks']>('recall-decks-v1') ?? [],
    cards: readStorage<StudyData['cards']>('recall-cards-v1') ?? [],
    logs: readStorage<StudyData['logs']>('recall-logs-v1') ?? [],
  };
  const logs = stored.logs.filter(isStudyLog);
  const reviewedCardIds = new Set(logs.map((log) => log.cardId));
  // Keep examples that a person studied and example decks that hold their cards.
  const cards = stored.cards.filter(
    (card) => !legacyExampleCardIds.has(card.id) || reviewedCardIds.has(card.id),
  );
  const usedDeckIds = new Set(cards.map((card) => card.deckId));
  const decks = stored.decks.filter((deck) => !legacyExampleDeckIds.has(deck.id) || usedDeckIds.has(deck.id));
  return { data: { decks, cards, logs }, changed: Boolean(decks.length || cards.length || logs.length) };
}

export function writeGuestStudy(guest: GuestStudy) {
  localStorage.setItem(guestKey, JSON.stringify(guest));
}

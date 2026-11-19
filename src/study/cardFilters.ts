import type { CardKind, ReviewLog, StudyCard } from '../types';

export type CardFilters = {
  search: string;
  kind: 'all' | CardKind;
  status: 'all' | 'due' | 'upcoming' | 'missed';
};

export const emptyCardFilters: CardFilters = { search: '', kind: 'all', status: 'all' };

const normalize = (value: string) => value.normalize('NFKC').toLowerCase();
export const effectiveCardKind = (card: StudyCard) => card.kind ?? (card.choices?.length ? 'choice' : 'basic');

export function frequentlyMissedIds(logs: ReviewLog[]): Set<string> {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.rating === 'again') counts.set(log.cardId, (counts.get(log.cardId) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count >= 2).map(([id]) => id));
}

export function filterCards(cards: StudyCard[], filters: CardFilters, missed = new Set<string>(), now = Date.now()) {
  const terms = normalize(filters.search).trim().split(/\s+/).filter(Boolean);
  return cards.filter((card) => {
    if (filters.kind !== 'all' && effectiveCardKind(card) !== filters.kind) return false;
    const due = Date.parse(card.dueAt);
    if (filters.status === 'due' && !(due <= now)) return false;
    if (filters.status === 'upcoming' && !(due > now)) return false;
    if (filters.status === 'missed' && !missed.has(card.id)) return false;
    const text = normalize([card.front, card.back, ...(card.choices ?? [])].join(' '));
    return terms.every((term) => text.includes(term));
  });
}

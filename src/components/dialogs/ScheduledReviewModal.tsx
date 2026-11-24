import { useLanguage } from '../../i18n/LanguageProvider';
import { DeckIcon } from '../DeckVisuals';
import { Modal } from '../Modal';
import { isDue } from '../../study/review';
import type { Deck, StudyCard } from '../../types';

export function ScheduledReviewModal({ decks, cards, saving, onStart, onClose }: {
  decks: Deck[];
  cards: StudyCard[];
  saving: boolean;
  onStart: (deckId: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const counts = new Map<string, number>();
  const dueCounts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
    if (isDue(card)) dueCounts.set(card.deckId, (dueCounts.get(card.deckId) ?? 0) + 1);
  }
  const firstAvailable = decks.find((deck) => counts.has(deck.id))?.id;

  return (
    <Modal title={t('review.deck')} onClose={onClose}>
      <p className="review-deck-guide">{t('review.chooseGuide')}</p>
      <div className="review-deck-picker">
        {decks.map((deck) => {
          const count = counts.get(deck.id) ?? 0;
          const dueCount = dueCounts.get(deck.id) ?? 0;
          const description = dueCount
            ? t('review.dueInDeck', { count: dueCount })
            : count ? t('review.freeInDeck', { count }) : t('cards.empty');
          const actionLabel = dueCount
            ? t('review.chooseDeckAction', { deck: deck.title, count: dueCount })
            : count ? t('review.chooseFreeDeckAction', { deck: deck.title, count })
              : `${deck.title}, ${t('cards.empty')}`;
          return (
            <button key={deck.id} className={`review-deck-option ${deck.theme}`} type="button"
              autoFocus={deck.id === firstAvailable} disabled={saving || count === 0}
              aria-label={actionLabel}
              onClick={() => onStart(deck.id)}>
              <span className="review-deck-icon" aria-hidden="true"><DeckIcon icon={deck.icon} size={23} /></span>
              <span className="review-deck-copy"><strong>{deck.title}</strong>
                <small>{description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Modal } from '../Modal';
import SelectField from '../SelectField';
import type { Deck, StudyCard } from '../../types';

export function FreeReviewModal({
  decks,
  cards,
  onStart,
  onClose,
}: {
  decks: Deck[];
  cards: StudyCard[];
  onStart: (deckId: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
  const options = decks.flatMap((deck) => {
    const count = counts.get(deck.id);
    return count ? [{ value: deck.id, label: `${deck.title} · ${t('common.cards', { count })}` }] : [];
  });
  const [deckId, setDeckId] = useState(options[0]?.value ?? '');

  return (
    <Modal title={t('review.free')} onClose={onClose}>
      <div className="sheet-form">
        <p className="field-hint">
          {options.length
            ? t('review.freeGuide')
            : t('review.freeEmpty')}
        </p>
        {options.length > 0 && (
          <>
            <SelectField label={t('review.deck')} value={deckId} options={options} onChange={setDeckId} />
            <button className="big-primary form-submit" type="button" onClick={() => onStart(deckId)}>
              {t('review.start')} <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

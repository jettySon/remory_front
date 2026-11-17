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
  const counts = new Map<string, number>();
  for (const card of cards) counts.set(card.deckId, (counts.get(card.deckId) ?? 0) + 1);
  const options = decks.flatMap((deck) => {
    const count = counts.get(deck.id);
    return count ? [{ value: deck.id, label: `${deck.title} · ${count}장` }] : [];
  });
  const [deckId, setDeckId] = useState(options[0]?.value ?? '');

  return (
    <Modal title="자유 복습" onClose={onClose}>
      <div className="sheet-form">
        <p className="field-hint">
          {options.length
            ? '덱을 골라 전체 카드를 다시 볼 수 있어요. 기존 복습일은 그대로 유지돼요.'
            : '카드를 추가하면 자유 복습을 시작할 수 있어요.'}
        </p>
        {options.length > 0 && (
          <>
            <SelectField label="복습할 덱" value={deckId} options={options} onChange={setDeckId} />
            <button className="big-primary form-submit" type="button" onClick={() => onStart(deckId)}>
              복습 시작 <ArrowRight size={18} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

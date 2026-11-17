import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Cloud, Plus } from 'lucide-react';
import { DeckIcon } from '../components/DeckVisuals';
import { SectionHeading } from '../components/SectionHeading';
import { cardFields } from '../study/cards';
import { deckKinds } from '../study/decks';
import type { Deck, StudyCard } from '../types';

export function DeckDetailPage({
  deck,
  cards,
  back,
  onAdd,
  onStudy,
}: {
  deck: Deck;
  cards: StudyCard[];
  back: () => void;
  onAdd: () => void;
  onStudy: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="page">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={19} /> 학습 덱
      </button>
      <div className={`deck-detail-banner ${deck.theme}`}>
        <span className="detail-mini-art">
          <DeckIcon icon={deck.icon} size={38} />
        </span>
        <span className="detail-spark">✦</span>
        <span className="eyebrow-dark">
          {deckKinds.find((kind) => kind.icon === deck.icon)?.label ?? '일반'}
        </span>
        <h1>{deck.title}</h1>
        {deck.subtitle && <p>{deck.subtitle}</p>}
        <div className="detail-foot">
          <span>카드 {cards.length}장</span>
          <button onClick={onStudy}>
            복습하기 <ArrowRight size={17} />
          </button>
        </div>
      </div>
      <SectionHeading title="카드 목록" />
      <div className="card-list">
        {cards.map((card, i) => (
          <button
            key={card.id}
            className="card-list-row"
            onClick={() => setExpanded(expanded === card.id ? null : card.id)}
          >
            <span className="list-index">{String(i + 1).padStart(2, '0')}</span>
            <span className="list-card-content">
              <small>{cardFields[card.kind ?? 'basic'].label}</small>
              <strong>{card.front}</strong>
              {expanded === card.id && <small>{card.back}</small>}
            </span>
            <ChevronRight size={17} className={expanded === card.id ? 'rotated' : ''} />
          </button>
        ))}
      </div>
      {cards.length === 0 && (
        <div className="empty-state">
          <Cloud size={45} />
          <p>아직 카드가 없어요.</p>
        </div>
      )}
      <button className="soft-create" onClick={onAdd}>
        <span>
          <Plus size={20} />
        </span>
        카드 추가 <ArrowRight size={18} />
      </button>
    </div>
  );
}

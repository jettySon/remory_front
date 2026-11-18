import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Cloud, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { DeckIcon } from '../components/DeckVisuals';
import { SectionHeading } from '../components/SectionHeading';
import { cardFields } from '../study/cards';
import { deckKinds } from '../study/decks';
import { isDue } from '../study/review';
import type { Deck, StudyCard } from '../types';

export function DeckDetailPage({
  deck,
  cards,
  back,
  onAdd,
  onEdit,
  onDelete,
  onStudy,
  onFreeReview,
}: {
  deck: Deck;
  cards: StudyCard[];
  back: () => void;
  onAdd: () => void;
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onStudy: () => void;
  onFreeReview: () => void;
}) {
  const { locale, t } = useLanguage();
  const reviewDate = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="page">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={19} /> {t('nav.decks')}
      </button>
      <div className={`deck-detail-banner ${deck.theme}`}>
        <span className="detail-mini-art">
          <DeckIcon icon={deck.icon} size={38} />
        </span>
        <span className="detail-spark">✦</span>
        <span className="eyebrow-dark">
          {t(deckKinds.find((kind) => kind.icon === deck.icon)?.label ?? 'decks.kind.book')}
        </span>
        <h1>{deck.title}</h1>
        {deck.subtitle && <p>{deck.subtitle}</p>}
        <div className="detail-foot">
          <span>{t('common.cards', { count: cards.length })}</span>
          <button onClick={onStudy}>
            {t('review.start')} <ArrowRight size={17} />
          </button>
        </div>
      </div>
      {cards.length > 0 && (
        <button className="free-deck-action" type="button" onClick={onFreeReview}>
          <RotateCcw size={18} aria-hidden="true" />
          <span>
            <strong>{t('review.free')}</strong>
            <small>{t('decks.reviewAll', { count: cards.length })}</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
      <SectionHeading title={t('cards.list')} />
      <div className="card-list">
        {cards.map((card, i) => (
          <div className="card-list-item" key={card.id}>
            <button
              type="button"
              className="card-list-row"
              aria-expanded={expanded === card.id}
              onClick={() => setExpanded(expanded === card.id ? null : card.id)}
            >
              <span className="list-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="list-card-content">
                <small>{t(cardFields[card.kind ?? 'basic'].label)}</small>
                <strong>{card.front}</strong>
                {expanded === card.id && (
                  <>
                    <small>{card.back}</small>
                    {Boolean(card.choices?.length) && <small>{t('review.choices')} · {card.choices?.join(' · ')}</small>}
                    <small>
                      {isDue(card) ? (
                        t('review.dueNow')
                      ) : (
                        <>
                          {t('review.next')} ·{' '}
                          <time dateTime={card.dueAt}>{reviewDate.format(new Date(card.dueAt))}</time>
                        </>
                      )}
                    </small>
                  </>
                )}
              </span>
              <ChevronRight size={17} className={expanded === card.id ? 'rotated' : ''} />
            </button>
            {expanded === card.id && (
              <div className="card-list-actions">
                <button type="button" onClick={() => onEdit(card.id)}>
                  <Pencil size={15} aria-hidden="true" /> {t('common.edit')}
                </button>
                <button className="card-remove-action" type="button" onClick={() => onDelete(card.id)}>
                  <Trash2 size={15} aria-hidden="true" /> {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {cards.length === 0 && (
        <div className="empty-state">
          <Cloud size={45} />
          <p>{t('cards.empty')}</p>
        </div>
      )}
      <button className="soft-create" onClick={onAdd}>
        <span>
          <Plus size={20} />
        </span>
        {t('cards.add')} <ArrowRight size={18} />
      </button>
    </div>
  );
}

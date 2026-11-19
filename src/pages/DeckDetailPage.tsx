import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Cloud, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { CardSearchFilters } from '../components/CardSearchFilters';
import { filterCards, frequentlyMissedIds, emptyCardFilters, effectiveCardKind } from '../study/cardFilters';
import { statsPath, type StudyReport } from '../api/study';
import { useStudyQuery } from '../hooks/useStudyQuery';
import { DeckIcon } from '../components/DeckVisuals';
import { SectionHeading } from '../components/SectionHeading';
import { cardFields } from '../study/cards';
import { deckKinds } from '../study/decks';
import { isDue } from '../study/review';
import type { Deck, ReviewLog, StudyCard } from '../types';

export function DeckDetailPage({
  deck,
  cards,
  logs,
  token,
  activityVersion,
  saving,
  onEditDeck,
  onDeleteDeck,
  back,
  onAdd,
  onEdit,
  onDelete,
  onStudy,
  onFreeReview,
}: {
  deck: Deck;
  cards: StudyCard[];
  logs: ReviewLog[];
  token?: string;
  activityVersion: number;
  saving: boolean;
  onEditDeck: () => void;
  onDeleteDeck: () => void;
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
  const [filters, setFilters] = useState({ ...emptyCardFilters });
  const remote = useStudyQuery<StudyReport>(filters.status === 'missed' ? token : undefined,
    statsPath('all', deck.id), activityVersion);
  const missed = token
    ? new Set((remote.data?.cards ?? []).filter((card) => card.counts.again >= 2).map((card) => card.id))
    : frequentlyMissedIds(logs);
  const filtered = filterCards(cards, filters, missed);
  const waiting = filters.status === 'missed' && token && (remote.loading || remote.failed);
  const indices = new Map(cards.map((card, index) => [card.id, index + 1]));
  return (
    <div className="page">
      <div className="deck-detail-toolbar">
        <button className="back-link" onClick={back}><ArrowLeft size={19} /> {t('nav.decks')}</button>
        <div className="deck-manage-actions">
          <button type="button" aria-label={t('decks.edit')} title={t('decks.edit')} disabled={saving} onClick={onEditDeck}>
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label={t('decks.delete')} title={t('decks.delete')} disabled={saving} onClick={onDeleteDeck}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
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
      {cards.length > 0 && <CardSearchFilters filters={filters} onChange={(next) => {
        setFilters(next);
        setExpanded(null);
      }} />}
      {waiting ? (
        <div className="card-query-state" role={remote.failed ? 'alert' : 'status'}>
          <p>{t(remote.failed ? 'stats.failed' : 'stats.loading')}</p>
          {remote.failed && <button className="plain-link" type="button" onClick={remote.retry}>{t('common.retry')}</button>}
        </div>
      ) : <>
        {cards.length > 0 && <p className="card-results-count" role="status">
          {t('cards.results', { count: filtered.length, total: cards.length })}
        </p>}
        <div className="card-list">
          {filtered.map((card) => (
            <div className="card-list-item" key={card.id}>
              <button
                type="button"
                className="card-list-row"
                aria-expanded={expanded === card.id}
                onClick={() => setExpanded(expanded === card.id ? null : card.id)}
              >
                <span className="list-index">{String(indices.get(card.id)).padStart(2, '0')}</span>
                <span className="list-card-content">
                  <small>{t(cardFields[effectiveCardKind(card)].label)}</small>
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
        {cards.length > 0 && filtered.length === 0 && <div className="empty-state card-search-empty">
          <Cloud size={38} aria-hidden="true" />
          <p>{t('cards.noResults')}</p>
          <button className="plain-link" type="button" onClick={() => setFilters({ ...emptyCardFilters })}>{t('cards.resetFilters')}</button>
        </div>}
      </>}
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

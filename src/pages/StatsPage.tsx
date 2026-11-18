import { useLanguage } from '../i18n/LanguageProvider';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { Mascot } from '../components/Illustrations';
import { DeckIcon } from '../components/DeckVisuals';
import { RatingChart, RatingLegend } from '../components/RatingChart';
import SelectField from '../components/SelectField';
import { statsPath, type StudyReport } from '../api/study';
import { useStudyQuery } from '../hooks/useStudyQuery';
import { getReviewInsights, getReviewWeek, weekWithCounts } from '../study/insights';
import type { Deck, ReviewLog, StudyCard } from '../types';

export type StatsFilters = { period: 'all' | '7' | '30'; deckId: string | null };

const periods = [
  { value: 'all', label: 'stats.allTime' },
  { value: '7', label: 'stats.last7' },
  { value: '30', label: 'stats.last30' },
] as const;

export function StatsPage({
  logs,
  token,
  activityVersion,
  cards,
  decks,
  back,
  openDeck,
  startPractice,
  filters,
  onFilterChange,
}: {
  logs: ReviewLog[];
  token?: string;
  activityVersion: number;
  cards: StudyCard[];
  decks: Deck[];
  openDeck: (id: string) => void;
  startPractice: (ids: string[]) => void;
  filters: StatsFilters;
  onFilterChange: (filters: StatsFilters) => void;
  back: () => void;
}) {
  const { locale, t } = useLanguage();
  const { period, deckId } = filters;
  const [showAll, setShowAll] = useState(false);
  const selectedDeck = decks.find((deck) => deck.id === deckId);
  const remote = useStudyQuery<StudyReport>(
    token,
    statsPath(period, selectedDeck?.id ?? null),
    activityVersion,
  );
  const report = remote.data;
  const insights = useMemo(() => {
    if (!token) return getReviewInsights(decks, cards, logs, period === 'all' ? null : Number(period));
    const deckById = new Map(decks.map((deck) => [deck.id, deck]));
    const cardById = new Map(cards.map((card) => [card.id, card]));
    return {
      decks: (report?.decks ?? []).flatMap(({ id, counts }) => {
        const deck = deckById.get(id);
        return deck ? [{ deck, ...counts }] : [];
      }),
      cards: (report?.cards ?? []).flatMap(({ id, counts, latestRating }) => {
        const card = cardById.get(id);
        return card ? [{ card, ...counts, latestRating }] : [];
      }),
    };
  }, [token, decks, cards, logs, period, report]);
  const totalReviews = token ? report?.totals.total : logs.length;
  const freeReviews = (token ? report?.totals.free : logs.filter((log) => log.mode === 'free').length) ?? 0;
  const missedCards = selectedDeck
    ? insights.cards.filter((item) => item.card.deckId === selectedDeck.id)
    : insights.cards;
  const visibleCards = showAll ? missedCards : missedCards.slice(0, 5);
  const deckNames = new Map(decks.map((deck) => [deck.id, deck.title]));
  const week = token ? weekWithCounts(report?.week) : getReviewWeek(logs, cards, selectedDeck?.id);
  const chartDate = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' });
  const percent = new Intl.NumberFormat(locale, { style: 'percent' });
  const max = Math.max(...week.map((day) => day.counts.total), 1);
  const repeated = missedCards.filter((item) => item.again >= 2).length;
  const recovered = missedCards.filter(
    (item) => item.latestRating === 'good' || item.latestRating === 'easy',
  ).length;
  function changeFilters(next: StatsFilters) {
    onFilterChange(next);
    setShowAll(false);
  }

  return (
    <div className="page stats-page">
      <button className="back-link stats-back" onClick={back}>
        <ArrowLeft size={18} /> {t('stats.goHome')}
      </button>
      <h1>{t('stats.title')}</h1>
      <div className="stat-grid">
        <div className="stat-block lavender">
          <span>{t('stats.totalCards')}</span>
          <strong>
            {cards.length}
            <small>{t('common.cardUnit')}</small>
          </strong>
        </div>
        <div className="stat-block peach">
          <span>{t('stats.totalReviews')}</span>
          <strong>
            {totalReviews ?? '—'}
            <small>{t('common.reviewUnit')}</small>
          </strong>
          {freeReviews > 0 && <small>{t('stats.includesFree', { count: freeReviews })}</small>}
        </div>
      </div>

      <div className="stats-filters">
        <div className="stats-period" role="group" aria-label={t('stats.period')}>
          {periods.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => changeFilters({ period: value, deckId })}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <SelectField
          label={t('nav.decks')}
          value={selectedDeck?.id ?? ''}
          options={[
            { value: '', label: t('decks.all') },
            ...decks.map((deck) => ({ value: deck.id, label: deck.title })),
          ]}
          onChange={(id) => changeFilters({ period, deckId: id || null })}
        />
      </div>

      {remote.loading && (
        <p role="status" className="stats-surface insight-empty">
          {t('stats.loading')}
        </p>
      )}
      {remote.failed && (
        <div className="stats-surface insight-empty">
          <p role="alert">{t('stats.failed')}</p>
          <button type="button" className="plain-link" onClick={remote.retry}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {(!token || report) && (
        <>
          <section className="stats-section" aria-labelledby="stats-practice-title">
            <h2 id="stats-practice-title">{t('review.focus')}</h2>
            <div className="practice-feature">
              <div className="practice-feature-copy">
                <span>{selectedDeck?.title ?? t('decks.all')}</span>
                <p>
                  {t('stats.missed')}{' '}
                  <strong>
                    {missedCards.length}
                    <small>{t('common.cardUnit')}</small>
                  </strong>
                </p>
              </div>
              <Mascot className="practice-mascot" />
              {missedCards.length > 0 ? (
                <button
                  className="big-primary"
                  type="button"
                  onClick={() => startPractice(missedCards.map((item) => item.card.id))}
                >
                  {t('stats.focusStart')} <ArrowRight size={17} aria-hidden="true" />
                </button>
              ) : (
                <p className="insight-empty">
                  {insights.decks.length
                    ? t('stats.noMissed')
                    : t('stats.missedHint')}
                </p>
              )}
            </div>
            {missedCards.length > 0 && (
              <>
                <div className="practice-summary">
                  <div>
                    <strong>{t('common.cards', { count: repeated })}</strong>
                    <span>{t('stats.againTwice')}</span>
                  </div>
                  <div>
                    <strong>{t('common.cards', { count: recovered })}</strong>
                    <span>{t('stats.lastRecovered')}</span>
                  </div>
                </div>
                <p className="insight-guide">
                  {t('stats.focusHint')}
                </p>
              </>
            )}
          </section>

          <section className="stats-section" aria-labelledby="stats-trend-title">
            <h2 id="stats-trend-title">{t('stats.weekTrend')}</h2>
            <div className="stats-surface stats-trend">
              <div className="stats-chart-heading">
                <strong>{selectedDeck?.title ?? t('decks.all')}</strong>
                <span>{t('common.reviews', { count: week.reduce((sum, day) => sum + day.counts.total, 0) })}</span>
              </div>
              <div className="bar-chart rating-trend">
                {week.map(({ key, date, counts }) => (
                  <div className="bar-col" key={key}>
                    <span>{counts.total}</span>
                    <div className="bar-container">
                      {counts.total > 0 && (
                        <div className="trend-column" style={{ height: `${(counts.total / max) * 100}%` }}>
                          <RatingChart counts={counts} vertical />
                        </div>
                      )}
                    </div>
                    <span>{chartDate.format(date)}</span>
                  </div>
                ))}
              </div>
              <RatingLegend />
            </div>
          </section>

          <section className="stats-section" aria-labelledby="stats-decks-title">
            <h2 id="stats-decks-title">{t('stats.deckDistribution')}</h2>
            {insights.decks.length === 0 ? (
              <p className="stats-surface insight-empty">{t('stats.noPeriodReview')}</p>
            ) : (
              <ul className="insight-list">
                {insights.decks.map(({ deck, ...counts }) => (
                  <li
                    className={`stats-surface stats-deck-row ${selectedDeck?.id === deck.id ? 'is-selected' : ''}`}
                    key={deck.id}
                  >
                    <button
                      className="insight-deck"
                      type="button"
                      aria-pressed={selectedDeck?.id === deck.id}
                      onClick={() =>
                        changeFilters({ period, deckId: selectedDeck?.id === deck.id ? null : deck.id })
                      }
                    >
                      <span className={`stats-deck-icon ${deck.theme}`}>
                        <DeckIcon icon={deck.icon} size={18} />
                      </span>
                      <span className="stats-deck-text">
                        <strong>{deck.title}</strong>
                        <small>
                          {t('stats.againTotal', { again: counts.again, total: counts.total })}
                          {counts.hard > 0 && ` · ${t('stats.hardCount', { count: counts.hard })}`}
                        </small>
                      </span>
                      <span className="insight-rate">
                        {percent.format(counts.again / counts.total)}<small>{t('stats.againRate')}</small>
                      </span>
                    </button>
                    <RatingChart counts={counts} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {missedCards.length > 0 && (
            <section className="stats-section" aria-labelledby="stats-missed-title">
              <h2 id="stats-missed-title">{t('stats.missed')}</h2>
              <ol className="insight-list">
                {visibleCards.map(({ card, total, again, hard }) => (
                  <li className="insight-card stats-surface" key={card.id}>
                    <span className="insight-deck-name">{deckNames.get(card.deckId)}</span>
                    <strong>{card.front}</strong>
                    <span>
                      {t('stats.againTotal', { again, total })}{hard > 0 && ` · ${t('stats.hardCount', { count: hard })}`}
                    </span>
                    <details>
                      <summary>{t('stats.answer')}</summary>
                      <p>{card.back}</p>
                      <button type="button" onClick={() => openDeck(card.deckId)}>
                        {t('decks.open')} <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </details>
                  </li>
                ))}
              </ol>
              {missedCards.length > 5 && (
                <button className="insight-more" type="button" onClick={() => setShowAll(!showAll)}>
                  {showAll ? t('stats.top5') : t('stats.allMissed', { count: missedCards.length })}
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

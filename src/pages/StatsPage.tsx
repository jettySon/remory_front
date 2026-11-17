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
  { value: 'all', label: '전체 기간' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
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
        <ArrowLeft size={18} /> 홈으로
      </button>
      <h1>학습 통계</h1>
      <div className="stat-grid">
        <div className="stat-block lavender">
          <span>전체 카드</span>
          <strong>
            {cards.length}
            <small>장</small>
          </strong>
        </div>
        <div className="stat-block peach">
          <span>누적 복습</span>
          <strong>
            {totalReviews ?? '—'}
            <small>회</small>
          </strong>
          {freeReviews > 0 && <small>자유 복습 {freeReviews}회 포함</small>}
        </div>
      </div>

      <div className="stats-filters">
        <div className="stats-period" role="group" aria-label="집계 기간">
          {periods.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => changeFilters({ period: value, deckId })}
            >
              {label}
            </button>
          ))}
        </div>
        <SelectField
          label="학습 덱"
          value={selectedDeck?.id ?? ''}
          options={[
            { value: '', label: '전체 덱' },
            ...decks.map((deck) => ({ value: deck.id, label: deck.title })),
          ]}
          onChange={(id) => changeFilters({ period, deckId: id || null })}
        />
      </div>

      {remote.loading && (
        <p role="status" className="stats-surface insight-empty">
          학습 통계를 불러오는 중이에요.
        </p>
      )}
      {remote.failed && (
        <div className="stats-surface insight-empty">
          <p role="alert">학습 통계를 불러오지 못했어요.</p>
          <button type="button" className="plain-link" onClick={remote.retry}>
            다시 불러오기
          </button>
        </div>
      )}
      {(!token || report) && (
        <>
          <section className="stats-section" aria-labelledby="stats-practice-title">
            <h2 id="stats-practice-title">집중 복습</h2>
            <div className="practice-feature">
              <div className="practice-feature-copy">
                <span>{selectedDeck?.title ?? '전체 덱'}</span>
                <p>
                  다시 볼 카드{' '}
                  <strong>
                    {missedCards.length}
                    <small>장</small>
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
                  집중 복습 시작 <ArrowRight size={17} aria-hidden="true" />
                </button>
              ) : (
                <p className="insight-empty">
                  {insights.decks.length
                    ? '아직 다시 볼 카드가 없어요.'
                    : '복습하면 다시 볼 카드가 여기에 모여요.'}
                </p>
              )}
            </div>
            {missedCards.length > 0 && (
              <>
                <div className="practice-summary">
                  <div>
                    <strong>{repeated}장</strong>
                    <span>‘다시’ 2회 이상</span>
                  </div>
                  <div>
                    <strong>{recovered}장</strong>
                    <span>마지막 평가가 보통·쉬움</span>
                  </div>
                </div>
                <p className="insight-guide">
                  ‘다시’를 많이 고른 카드부터 복습해요. 집중 복습 결과는 통계에 기록되며 기존 복습 일정은
                  유지돼요.
                </p>
              </>
            )}
          </section>

          <section className="stats-section" aria-labelledby="stats-trend-title">
            <h2 id="stats-trend-title">최근 7일 복습 추세</h2>
            <div className="stats-surface stats-trend">
              <div className="stats-chart-heading">
                <strong>{selectedDeck?.title ?? '전체 덱'}</strong>
                <span>복습 {week.reduce((sum, day) => sum + day.counts.total, 0)}회</span>
              </div>
              <div className="bar-chart rating-trend">
                {week.map(({ key, label, counts }) => (
                  <div className="bar-col" key={key}>
                    <span>{counts.total}</span>
                    <div className="bar-container">
                      {counts.total > 0 && (
                        <div className="trend-column" style={{ height: `${(counts.total / max) * 100}%` }}>
                          <RatingChart counts={counts} vertical />
                        </div>
                      )}
                    </div>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <RatingLegend />
            </div>
          </section>

          <section className="stats-section" aria-labelledby="stats-decks-title">
            <h2 id="stats-decks-title">덱별 평가 분포</h2>
            {insights.decks.length === 0 ? (
              <p className="stats-surface insight-empty">선택한 기간에 복습 기록이 없어요.</p>
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
                          다시 {counts.again}회 / 전체 {counts.total}회
                          {counts.hard > 0 && ` · 어려움 ${counts.hard}회`}
                        </small>
                      </span>
                      <span className="insight-rate">
                        {Math.round((counts.again / counts.total) * 100)}%<small>다시 비율</small>
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
              <h2 id="stats-missed-title">다시 볼 카드</h2>
              <ol className="insight-list">
                {visibleCards.map(({ card, total, again, hard }) => (
                  <li className="insight-card stats-surface" key={card.id}>
                    <span className="insight-deck-name">{deckNames.get(card.deckId)}</span>
                    <strong>{card.front}</strong>
                    <span>
                      다시 {again}회 / 전체 {total}회{hard > 0 && ` · 어려움 ${hard}회`}
                    </span>
                    <details>
                      <summary>정답 보기</summary>
                      <p>{card.back}</p>
                      <button type="button" onClick={() => openDeck(card.deckId)}>
                        덱 열기 <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    </details>
                  </li>
                ))}
              </ol>
              {missedCards.length > 5 && (
                <button className="insight-more" type="button" onClick={() => setShowAll(!showAll)}>
                  {showAll ? '상위 5장만 보기' : `카드 ${missedCards.length}장 모두 보기`}
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

import { ArrowRight, BarChart3, Check, ChevronRight } from 'lucide-react';
import { DeckTile } from '../components/DeckVisuals';
import { Mascot, Star } from '../components/Illustrations';
import { SectionHeading } from '../components/SectionHeading';
import { type DailyCounts, weekDays } from '../study/insights';
import { isDue, today } from '../study/review';
import type { Deck, Page, StudyCard } from '../types';

function WeekRow({ activity }: { activity?: DailyCounts }) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const days = weekDays().map(({ key, weekday }) => ({
    date: key,
    label: weekdays[weekday],
    n: activity?.[key]?.total ?? 0,
  }));
  return (
    <div className="week-calendar">
      {days.map((d, i) => (
        <div className="week-day" key={d.date}>
          <span>{d.label}</span>
          <div className={`week-dot tone-${i % 5} ${d.n ? 'active' : ''}`}>
            {d.n ? <Check size={14} strokeWidth={2.4} /> : <span className="week-blank" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage({
  decks,
  cards,
  activity,
  openDeck,
  go,
  startReview,
  onFreeReview,
  onCreate,
}: {
  decks: Deck[];
  cards: StudyCard[];
  activity?: DailyCounts;
  openDeck: (id: string) => void;
  go: (p: Page) => void;
  startReview: (deckId?: string) => void;
  onFreeReview: () => void;
  onCreate: () => void;
}) {
  const due = cards.filter(isDue).length;
  const completed = activity?.[today()]?.total ?? 0;
  const hasCards = cards.length > 0;
  const isCreateDeck = !hasCards && decks.length === 0;
  const actionLabel = hasCards ? '자유 복습' : decks.length ? '첫 카드 추가' : '덱 만들기';
  return (
    <div className="page home-page">
      <section className="hero" aria-labelledby="home-hero-title">
        <div className="hero-orb orb-a" />
        <div className="hero-orb orb-b" />
        <div className="hero-scene">
          <span className="hero-cloud" aria-hidden="true" />
          <Mascot className="hero-mascot" />
          <Star className="hero-star first" />
          <Star className="hero-star second" />
        </div>
        <div className="hero-content">
          <div>
            <h1 id="home-hero-title" lang={hasCards ? undefined : 'en'}>
              {hasCards ? '오늘의 복습' : <>Little by <span>little.</span></>}
            </h1>
            <p>
              {due > 0
                ? '잊기 전에 한 번 더 떠올려 봐요.'
                : hasCards
                  ? '지금 예정된 복습이 없어요.'
                  : '오늘 배운 것부터 한 장씩.'}
            </p>
          </div>
          <button
            className={isCreateDeck ? 'hero-action hero-create-deck' : 'hero-action'}
            type="button"
            onClick={due > 0 ? () => startReview() : hasCards ? onFreeReview : onCreate}
            aria-label={due > 0 ? `복습할 카드 ${due}장, 복습 시작하기` : undefined}
          >
            {due > 0 ? (
              <span className="hero-count">{due}<span>장</span></span>
            ) : actionLabel}
            {!isCreateDeck && (
              <span className="hero-action-arrow" aria-hidden="true">
                <ArrowRight size={15} strokeWidth={1.8} />
              </span>
            )}
          </button>
        </div>
      </section>
      <section className="week-section">
        <SectionHeading title="최근 7일 복습" />
        <WeekRow activity={activity} />
      </section>
      {decks.length > 0 && (
        <section>
          <SectionHeading title="나의 작은 공부방" action="전체 보기" onClick={() => go('decks')} />
          <div className="deck-grid">
            {decks.slice(0, 4).map((d) => (
              <DeckTile
                key={d.id}
                deck={d}
                count={cards.filter((c) => c.deckId === d.id).length}
                onClick={() => openDeck(d.id)}
              />
            ))}
          </div>
        </section>
      )}
      <button className="stat-shortcut" onClick={() => go('stats')}>
        <span className="stat-icon">
          <BarChart3 size={21} />
        </span>
        <span>
          <strong>학습 통계</strong>
          <small>{completed ? `오늘 ${completed}장 복습했어요.` : '오늘 복습한 카드가 없어요.'}</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

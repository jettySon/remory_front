import { ArrowRight, BarChart3, Check, ChevronRight } from 'lucide-react';
import { DeckTile } from '../components/DeckVisuals';
import { Mascot, Star } from '../components/Illustrations';
import { SectionHeading } from '../components/SectionHeading';
import { isDue, localDay, today } from '../study/review';
import type { Deck, Page, ReviewLog, StudyCard } from '../types';

function WeekRow({ logs }: { logs: ReviewLog[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date();
    dt.setHours(12, 0, 0, 0);
    dt.setDate(dt.getDate() - (6 - i));
    return {
      label: ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()],
      date: localDay(dt),
      n: logs.filter((l) => localDay(l.date) === localDay(dt)).length,
    };
  });
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
  logs,
  openDeck,
  go,
  startReview,
}: {
  decks: Deck[];
  cards: StudyCard[];
  logs: ReviewLog[];
  openDeck: (id: string) => void;
  go: (p: Page) => void;
  startReview: (deckId?: string) => void;
}) {
  const due = cards.filter(isDue).length;
  const completed = logs.filter((l) => localDay(l.date) === today()).length;
  return (
    <div className="page home-page">
      <section className="hero" aria-label="오늘의 복습">
        <div className="hero-orb orb-a" />
        <div className="hero-orb orb-b" />
        <Star className="hero-star first" />
        <Star className="hero-star second" />
        <span className="hero-petal p1">✿</span>
        <span className="hero-petal p2">✧</span>
        <Mascot className="hero-mascot" />
        <div className="hero-content">
          <h1>오늘의 복습</h1>
          <p>잊기 전에 한 번 더 떠올려 봐요.</p>
        </div>
        <button
          className="hero-action-card"
          type="button"
          onClick={() => startReview()}
          aria-label={`복습할 카드 ${due}장, ${due ? '복습 시작하기' : '복습 확인하기'}`}
        >
          <svg
            className="hero-action-cloud"
            viewBox="0 0 190 72"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="review-cloud-fill" x1="0" y1="0" x2="0" y2="100%">
                <stop className="review-cloud-light" />
                <stop className="review-cloud-shade" offset="1" />
              </linearGradient>
            </defs>
            <path
              d="M28 66C13 66 4 56 4 42c0-12 9-22 21-24C34 7 50 4 63 11c12-11 30-13 44-4 15-6 32-1 40 9 11-2 22 3 26 13 8 2 13 9 13 17 0 11-9 20-22 20Z"
              fill="url(#review-cloud-fill)"
            />
          </svg>
          <span className="hero-count">
            <span>복습할 카드</span>
            <strong>
              {due}
              <small>장</small>
            </strong>
          </span>
          <ArrowRight className="hero-action-icon" size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </section>
      <section className="week-section">
        <SectionHeading title="최근 7일 복습" />
        <WeekRow logs={logs} />
      </section>
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

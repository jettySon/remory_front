import { useLanguage } from '../i18n/LanguageProvider';
import { ArrowRight, BarChart3, Check, ChevronRight } from 'lucide-react';
import { formatWeekday } from '../i18n/messages';
import { DeckTile } from '../components/DeckVisuals';
import { Mascot, Star } from '../components/Illustrations';
import { SectionHeading } from '../components/SectionHeading';
import { type DailyCounts, weekDays } from '../study/insights';
import { isDue, today } from '../study/review';
import type { Deck, Page, StudyCard } from '../types';

function WeekRow({ activity }: { activity?: DailyCounts }) {
  const { locale } = useLanguage();
  const days = weekDays().map(({ key, date }) => ({
    date: key,
    label: formatWeekday(date, locale),
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
  const { t } = useLanguage();
  const due = cards.filter(isDue).length;
  const completed = activity?.[today()]?.total ?? 0;
  const hasCards = cards.length > 0;
  const isCreateDeck = !hasCards && decks.length === 0;
  const actionLabel = hasCards ? t('review.free') : decks.length ? t('cards.addFirst') : t('decks.create');
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
              {hasCards ? t('home.todayReview') : <>Little by <span>little.</span></>}
            </h1>
            <p>
              {due > 0
                ? t('home.reviewHint')
                : hasCards
                  ? t('home.noScheduled')
                  : t('home.firstHint')}
            </p>
          </div>
          <button
            className={isCreateDeck ? 'hero-action hero-create-deck' : 'hero-action'}
            type="button"
            onClick={due > 0 ? () => startReview() : hasCards ? onFreeReview : onCreate}
            aria-label={due > 0 ? t('home.dueAction', { count: due }) : undefined}
          >
            {due > 0 ? (
              <span className="hero-count">
                {due}<span>{t('home.dueUnit', { count: due })}</span>
              </span>
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
        <SectionHeading title={t('home.recentWeek')} />
        <WeekRow activity={activity} />
      </section>
      {decks.length > 0 && (
        <section>
          <SectionHeading title={t('decks.room')} action={t('home.seeAll')} onClick={() => go('decks')} />
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
          <strong>{t('stats.title')}</strong>
          <small>{completed ? t('home.reviewedToday', { count: completed }) : t('home.noReviewToday')}</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

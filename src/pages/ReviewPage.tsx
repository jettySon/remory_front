import { useLanguage } from '../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowRight, Flower2, RotateCcw, Sparkles } from 'lucide-react';
import { Mascot, Star } from '../components/Illustrations';
import { cardFields } from '../study/cards';
import type { DeckTheme, Rating, ReviewMode, StudyCard } from '../types';

export function ReviewPage({
  current,
  theme,
  progress,
  total,
  finished,
  empty,
  flipped,
  flip,
  rate,
  pendingRating,
  saving,
  restart,
  onCalendar,
  mode,
  onStats,
  onFreeReview,
  emptyAction,
}: {
  current?: StudyCard;
  theme?: DeckTheme;
  progress: number;
  total: number;
  finished: boolean;
  empty: boolean;
  flipped: boolean;
  flip: () => void;
  saving: boolean;
  rate: (r: Rating) => void;
  pendingRating?: Rating;
  restart: () => void;
  onCalendar: () => void;
  mode: ReviewMode;
  onStats: () => void;
  onFreeReview: () => void;
  emptyAction?: { label: string; onClick: () => void };
}) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<string>();
  const title = t(`review.${mode}`);
  if (finished)
    return (
      <div className="page completion">
        <div className="completion-art">
          <div className="completion-orb" />
          <span className="float-star one">✦</span>
          <span className="float-star two">✧</span>
          <Mascot />
        </div>
        <h1>{t(`review.completed.${mode}`)}</h1>
        <div className="completion-reward">
          <Flower2 size={22} />
          <span>{t('review.completedCount', { count: total })}</span>
          <Sparkles size={18} />
        </div>
        <button className="big-primary" onClick={onCalendar}>
          {t('review.openCalendar')} <ArrowRight size={19} />
        </button>
        <button
          className="plain-link"
          onClick={mode === 'focus' ? onStats : mode === 'free' ? onFreeReview : restart}
        >
          {
            { focus: t('review.backToStats'), free: t('review.freePick'), scheduled: t('review.checkRemaining') }[
              mode
            ]
          }
        </button>
        {mode === 'scheduled' && (
          <button className="plain-link" onClick={onFreeReview}>
            {t('review.free')}
          </button>
        )}
      </div>
    );
  if (empty || !current)
    return (
      <div className="page empty-review">
        <div className="completion-art smaller">
          <Mascot />
        </div>
        <h1>{t('review.empty')}</h1>
        <button className="big-primary" onClick={emptyAction?.onClick ?? onFreeReview}>
          {emptyAction?.label ?? t('review.free')} <ArrowRight size={19} />
        </button>
        <button className="plain-link" onClick={onCalendar}>
          {t('review.openCalendar')}
        </button>
      </div>
    );
  return (
    <div className="page review-page">
      <div className="review-top">
        <h1>{title}</h1>
        <span className="review-index">
          {progress + 1} <small>/ {total}</small>
        </span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((progress + 1) / total) * 100}%` }} />
      </div>
      <p className="review-instruction">
        {current.choices ? t('review.pickAnswer') : t('review.thinkFirst')}
      </p>
      <button
        className={`flashcard ${theme ?? ''} ${flipped ? 'flipped' : ''}`}
        onClick={flip}
        aria-label={flipped ? t('review.showQuestion') : t('review.showAnswer')}
      >
        <span className="flashcard-top">
          <span>{flipped ? t('cards.field.correct') : t(cardFields[current.kind ?? 'basic'].label)}</span>
          <Star />
        </span>
        <div className="flashcard-content" key={flipped ? 'answer' : 'question'}>
          <span className="flashcard-emoji">{flipped ? '✦' : '☁'}</span>
          <h2>{flipped ? current.back : current.front}</h2>
        </div>
        <span className="flashcard-bottom">
          {flipped ? t('review.showQuestion') : t('review.tapReveal')} <RotateCcw size={15} />
        </span>
      </button>
      {current.choices && (
        <div className="review-options" aria-label={t('review.choices')}>
          {current.choices.map((option) => (
            <button
              type="button"
              key={option}
              disabled={flipped}
              aria-pressed={choice === option}
              onClick={() => {
                setChoice(option);
                flip();
              }}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {flipped && choice && (
        <p role="status">{choice === current.back ? t('review.correct') : t('review.selectedAnswer', { answer: choice })}</p>
      )}
      {!flipped ? (
        <button className="big-primary reveal-btn" onClick={flip}>
          {t('review.showAnswer')} <ArrowRight size={19} />
        </button>
      ) : (
        <div className="rating-section">
          <p>{t('review.ratingPrompt')}</p>
          <div className="rating-grid">
            {(['again', 'hard', 'good', 'easy'] as Rating[]).map((r) => (
              <button
                className={`rating rating-${r}`}
                key={r}
                disabled={saving || Boolean(pendingRating && pendingRating !== r)}
                onClick={() => rate(r)}
              >
                <span>{t(`review.rating.${r}`)}</span>
                <small>
                  {t(`review.hint.${r}`)}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

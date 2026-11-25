import { useLanguage } from '../i18n/LanguageProvider';
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, PenLine } from 'lucide-react';
import { Mascot, Star } from '../components/Illustrations';
import { CardReviewHistory } from '../components/CardReviewHistory';
import { ReviewCompletion } from '../components/ReviewCompletion';
import { ReviewAnswerFeedback, ReviewAnswerInput } from '../components/ReviewAnswerInput';
import { cardFields, getTypeableAnswer } from '../study/cards';
import type { DeckTheme, Rating, ReviewLog, ReviewMode, StudyCard } from '../types';

export function ReviewPage({
  current,
  lastReview,
  theme,
  deckTitle,
  progress,
  total,
  finished,
  missedCount,
  onMissedPractice,
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
  lastReview?: ReviewLog;
  theme?: DeckTheme;
  deckTitle?: string;
  progress: number;
  total: number;
  finished: boolean;
  missedCount: number;
  onMissedPractice: () => void;
  empty: boolean;
  flipped: boolean;
  flip: (answer?: string) => void;
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
  const [answerEntry, setAnswerEntry] = useState<'closed' | 'open' | 'revealed'>('closed');
  const [enteredAnswer, setEnteredAnswer] = useState<string>();
  const answerCard = useRef<HTMLButtonElement>(null);
  const answerId = useId();

  useEffect(() => {
    if (flipped && enteredAnswer !== undefined) answerCard.current?.focus({ preventScroll: true });
  }, [flipped, enteredAnswer]);

  function flipCard() {
    setAnswerEntry('revealed');
    flip();
  }
  const title = t(`review.${mode}`);
  if (finished)
    return (
      <ReviewCompletion
        deckTitle={deckTitle}
        total={total}
        mode={mode}
        missedCount={missedCount}
        saving={saving}
        onMissedPractice={onMissedPractice}
        onCalendar={onCalendar}
        onRemaining={restart}
        onStats={onStats}
        onFreeReview={onFreeReview}
      />
    );
  if (empty || !current)
    return (
      <div className="page empty-review">
        <div className="completion-art smaller">
          <Mascot />
        </div>
        {deckTitle && <p className="review-deck-name">{deckTitle}</p>}
        <h1>{t('review.empty')}</h1>
        <button className="big-primary" onClick={emptyAction?.onClick ?? onFreeReview}>
          {emptyAction?.label ?? t('review.free')} <ArrowRight size={19} />
        </button>
        <button className="plain-link" onClick={onCalendar}>
          {t('review.openCalendar')}
        </button>
      </div>
    );
  const choices = current.choices ?? [];
  const typeableAnswer = getTypeableAnswer(current);
  const recallPrompt = typeableAnswer ? 'review.recallFirst' : 'review.thinkFirst';
  const instruction = choices.length ? 'review.pickAnswer' : recallPrompt;
  const canType = Boolean(typeableAnswer) && answerEntry !== 'revealed';
  const comparison = flipped && enteredAnswer !== undefined && typeableAnswer
    ? { ...typeableAnswer, answer: enteredAnswer }
    : undefined;
  const explanation = flipped ? current.explanation?.trim() : undefined;
  const expectedId = answerId + '-expected';
  const explanationId = answerId + '-explanation';
  const description = [
    comparison || explanation ? expectedId : '',
    comparison ? answerId : '',
    explanation ? explanationId : '',
  ].filter(Boolean).join(' ');
  const ratingPrompt = mode === 'scheduled' && !choices.length ? 'review.firstRecallPrompt' : 'review.ratingPrompt';
  return (
    <div className="page review-page">
      <div className="review-top">
        <div>
          {deckTitle && <p className="review-deck-name">{deckTitle}</p>}
          <h1>{title}</h1>
        </div>
        <span className="review-index">
          {progress + 1} <small>/ {total}</small>
        </span>
      </div>
      <div className="progress-track">
        <div style={{ width: `${((progress + 1) / total) * 100}%` }} />
      </div>
      <p className="review-instruction">
        {t(instruction)}
      </p>
      <button
        className={`flashcard ${theme ?? ''} ${flipped ? 'flipped' : ''}`}
        ref={answerCard}
        onClick={flipCard}
        aria-label={flipped ? t('review.showQuestion') : t('review.showAnswer')}
        aria-describedby={description || undefined}
      >
        <span className="flashcard-top">
          <span>{flipped ? t('cards.field.correct') : t(cardFields[current.kind ?? 'basic'].label)}</span>
          <Star />
        </span>
        <div className={`flashcard-content${comparison ? ' has-answer-comparison' : ''}`} key={flipped ? 'answer' : 'question'}>
          <span className="flashcard-emoji">{flipped ? '✦' : '☁'}</span>
          <h2 id={description ? expectedId : undefined}>
            {flipped ? comparison?.expected ?? current.back : current.front}
          </h2>
          {comparison && <ReviewAnswerFeedback id={answerId} {...comparison} />}
          {explanation && (
            <span className="flashcard-explanation" id={explanationId}>
              <strong>{t('cards.field.explanation')}</strong>
              <span dir="auto">{explanation}</span>
            </span>
          )}
        </div>
        <span className="flashcard-bottom">
          <CardReviewHistory review={lastReview} />
        </span>
      </button>
      {choices.length > 0 && (
        <div className="review-options" aria-label={t('review.choices')}>
          {choices.map((option) => (
            <button
              type="button"
              key={option}
              disabled={flipped}
              aria-pressed={choice === option}
              onClick={() => {
                setChoice(option);
                flip(option);
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
      {!flipped && canType && answerEntry === 'open' ? (
        <ReviewAnswerInput
          onCompare={(answer) => {
            setEnteredAnswer(answer);
            flipCard();
          }}
          onReveal={flipCard}
        />
      ) : !flipped ? (
        <div className={canType ? 'review-reveal-actions' : undefined}>
          <button className="big-primary reveal-btn" type="button" onClick={flipCard}>
            {t('review.showAnswer')} <ArrowRight size={19} aria-hidden="true" />
          </button>
          {canType && (
            <button className="review-type-answer" type="button" onClick={() => setAnswerEntry('open')}>
              <PenLine size={16} aria-hidden="true" /> {t('review.typeAnswer')}
            </button>
          )}
        </div>
      ) : (
        <div className="rating-section">
          <p>{t(ratingPrompt)}</p>
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

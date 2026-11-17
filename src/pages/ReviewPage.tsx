import { useState } from 'react';
import { ArrowRight, Flower2, RotateCcw, Sparkles } from 'lucide-react';
import { Mascot, Star } from '../components/Illustrations';
import { cardFields } from '../study/cards';
import { ratingLabels } from '../study/review';
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
  const [choice, setChoice] = useState<string>();
  const title = { scheduled: '카드 복습', focus: '집중 복습', free: '자유 복습' }[mode];
  if (finished)
    return (
      <div className="page completion">
        <div className="completion-art">
          <div className="completion-orb" />
          <span className="float-star one">✦</span>
          <span className="float-star two">✧</span>
          <Mascot />
        </div>
        <h1>{mode === 'scheduled' ? '복습을 마쳤어요!' : `${title}을 마쳤어요!`}</h1>
        <div className="completion-reward">
          <Flower2 size={22} />
          <span>카드 {total}장 복습 완료</span>
          <Sparkles size={18} />
        </div>
        <button className="big-primary" onClick={onCalendar}>
          학습 캘린더 보기 <ArrowRight size={19} />
        </button>
        <button
          className="plain-link"
          onClick={mode === 'focus' ? onStats : mode === 'free' ? onFreeReview : restart}
        >
          {
            { focus: '학습 통계로 돌아가기', free: '자유 복습할 덱 고르기', scheduled: '남은 복습 확인하기' }[
              mode
            ]
          }
        </button>
        {mode === 'scheduled' && (
          <button className="plain-link" onClick={onFreeReview}>
            자유 복습
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
        <h1>지금 복습할 카드가 없어요.</h1>
        <button className="big-primary" onClick={emptyAction?.onClick ?? onFreeReview}>
          {emptyAction?.label ?? '자유 복습'} <ArrowRight size={19} />
        </button>
        <button className="plain-link" onClick={onCalendar}>
          학습 캘린더 보기
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
        {current.choices ? '보기에서 정답을 골라 보세요.' : '답을 떠올린 뒤 카드를 뒤집어 보세요.'}
      </p>
      <button
        className={`flashcard ${theme ?? ''} ${flipped ? 'flipped' : ''}`}
        onClick={flip}
        aria-label={flipped ? '질문 다시 보기' : '정답 확인하기'}
      >
        <span className="flashcard-top">
          <span>{flipped ? '정답' : cardFields[current.kind ?? 'basic'].label}</span>
          <Star />
        </span>
        <div className="flashcard-content">
          <span className="flashcard-emoji">{flipped ? '✦' : '☁'}</span>
          <h2>{flipped ? current.back : current.front}</h2>
        </div>
        <span className="flashcard-bottom">
          {flipped ? '질문 다시 보기' : '눌러서 정답 보기'} <RotateCcw size={15} />
        </span>
      </button>
      {current.choices && (
        <div className="review-options" aria-label="보기">
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
        <p role="status">{choice === current.back ? '정답이에요!' : '선택한 답 · ' + choice}</p>
      )}
      {!flipped ? (
        <button className="big-primary reveal-btn" onClick={flip}>
          정답 확인하기 <ArrowRight size={19} />
        </button>
      ) : (
        <div className="rating-section">
          <p>답이 얼마나 잘 떠올랐나요?</p>
          <div className="rating-grid">
            {(['again', 'hard', 'good', 'easy'] as Rating[]).map((r) => (
              <button
                className={`rating rating-${r}`}
                key={r}
                disabled={saving || Boolean(pendingRating && pendingRating !== r)}
                onClick={() => rate(r)}
              >
                <span>{ratingLabels[r]}</span>
                <small>
                  {r === 'again'
                    ? '잊었어요'
                    : r === 'hard'
                      ? '겨우 떠올렸어요'
                      : r === 'good'
                        ? '떠올렸어요'
                        : '바로 떠올렸어요'}
                </small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

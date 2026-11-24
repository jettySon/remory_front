import { useMemo, useRef, useState } from 'react';
import { isDue, newStudyId } from '../study/review';
import type { FirstRecall, Rating, ReviewMode, StudyCard } from '../types';

export function useReviewSession(
  cards: StudyCard[],
  recordReview: (cardId: string, rating: Rating, mode: ReviewMode, id: string, firstRecall?: FirstRecall) => Promise<boolean>,
) {
  const [sessionId, setSessionId] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [mode, setMode] = useState<ReviewMode>('scheduled');
  const [deckId, setDeckId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [missedCardIds, setMissedCardIds] = useState<string[]>([]);
  const current = useMemo(() => cards.find((card) => card.id === queue[progress]), [cards, queue, progress]);
  const total = queue.length;
  const firstChoiceRecall = useRef<FirstRecall | undefined>(undefined);
  const reviewAttempt = useRef<{ id: string; rating: Rating; firstRecall?: FirstRecall; saving: boolean } | null>(null);
  const missedForPractice = useMemo(() => {
    if (!finished || mode !== 'scheduled' || !missedCardIds.length) return [];
    const available = new Set(cards.map((card) => card.id));
    return missedCardIds.filter((id) => available.has(id));
  }, [cards, finished, missedCardIds, mode]);

  function startQueue(ids: string[], nextMode: ReviewMode, selectedDeckId: string | null) {
    setSessionId((previous) => previous + 1);
    firstChoiceRecall.current = undefined;
    reviewAttempt.current = null;
    setQueue(ids);
    setMode(nextMode);
    setDeckId(selectedDeckId);
    setProgress(0);
    setFlipped(false);
    setFinished(false);
    setMissedCardIds([]);
  }

  function start(deckId: string) {
    // 덱을 지정하지 않았다고 전체 덱으로 범위를 넓히지 않는다.
    const due = cards.filter((card) => isDue(card) && card.deckId === deckId);
    startQueue(
      due.map((card) => card.id),
      'scheduled',
      deckId || null,
    );
  }

  function startPractice(ids: string[]) {
    const existing = new Set(cards.map((card) => card.id));
    startQueue(
      ids.filter((id) => existing.has(id)),
      'focus',
      null,
    );
  }

  function startMissedPractice() {
    if (missedForPractice.length) startQueue(missedForPractice, 'focus', deckId);
  }

  function startFree(deckId: string) {
    startQueue(
      cards.filter((card) => card.deckId === deckId).map((card) => card.id),
      'free',
      deckId,
    );
  }

  function flip(answer?: string) {
    // 정답을 처음 공개하기 전의 선택만 측정한다. 공개 뒤 다시 고른 답은 제외한다.
    if (mode === 'scheduled' && current?.choices?.length && !flipped && !firstChoiceRecall.current) {
      firstChoiceRecall.current = 'choice_revealed';
      if (answer !== undefined) {
        firstChoiceRecall.current = answer === current.back ? 'choice_correct' : 'choice_incorrect';
      }
    }
    setFlipped((previous) => !previous);
  }

  async function rate(rating: Rating) {
    if (!current || !flipped || reviewAttempt.current?.saving) return;
    const selfReport = rating === 'again' ? 'self_missed' : 'self_recalled';
    const measuredRecall = current.choices?.length ? firstChoiceRecall.current : selfReport;
    const firstRecall = mode === 'scheduled' ? measuredRecall : undefined;
    // 같은 복습 ID·평가·첫 시도 결과를 재사용해 저장 재시도에도 한 번만 기록한다.
    const attempt = reviewAttempt.current ?? { id: newStudyId(), rating, firstRecall, saving: false };
    reviewAttempt.current = attempt;
    attempt.saving = true;
    try {
      const saved = await recordReview(current.id, attempt.rating, mode, attempt.id, attempt.firstRecall);
      if (!saved || reviewAttempt.current !== attempt) return;
    } finally {
      attempt.saving = false;
    }
    if (mode === 'scheduled' && (attempt.rating === 'again' || attempt.firstRecall === 'choice_incorrect')) {
      setMissedCardIds((previous) => [...previous, current.id]);
    }
    firstChoiceRecall.current = undefined;
    reviewAttempt.current = null;
    setFlipped(false);
    if (progress + 1 >= total) setFinished(true);
    else setProgress((previous) => previous + 1);
  }

  return {
    sessionId,
    current,
    progress,
    total,
    flipped,
    finished,
    mode,
    deckId,
    start,
    startPractice,
    startMissedPractice,
    missedCount: missedForPractice.length,
    startFree,
    flip,
    rate,
    pendingRating: reviewAttempt.current?.rating,
  };
}

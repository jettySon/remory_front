import { useMemo, useState } from 'react';
import { isDue } from '../study/review';
import type { Rating, ReviewMode, StudyCard } from '../types';

export function useReviewSession(
  cards: StudyCard[],
  recordReview: (cardId: string, rating: Rating, mode: ReviewMode) => Promise<boolean>,
) {
  const [sessionId, setSessionId] = useState(0);
  const [queue, setQueue] = useState<string[]>([]);
  const [mode, setMode] = useState<ReviewMode>('scheduled');
  const [progress, setProgress] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const current = useMemo(() => cards.find((card) => card.id === queue[progress]), [cards, queue, progress]);
  const total = queue.length;

  function startQueue(ids: string[], nextMode: ReviewMode) {
    setSessionId((previous) => previous + 1);
    setQueue(ids);
    setMode(nextMode);
    setProgress(0);
    setFlipped(false);
    setFinished(false);
  }

  function start(deckId?: string) {
    const due = cards.filter((card) => isDue(card) && (!deckId || card.deckId === deckId));
    startQueue(
      due.map((card) => card.id),
      'scheduled',
    );
  }

  function startPractice(ids: string[]) {
    const existing = new Set(cards.map((card) => card.id));
    startQueue(
      ids.filter((id) => existing.has(id)),
      'focus',
    );
  }

  function startFree(deckId: string) {
    startQueue(
      cards.filter((card) => card.deckId === deckId).map((card) => card.id),
      'free',
    );
  }

  function flip() {
    setFlipped((previous) => !previous);
  }

  async function rate(rating: Rating) {
    if (!current || !(await recordReview(current.id, rating, mode))) return;
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
    start,
    startPractice,
    startFree,
    flip,
    rate,
  };
}

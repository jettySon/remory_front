import { useMemo, useState } from 'react';
import { isDue } from '../study/review';
import type { Rating, StudyCard } from '../types';

export function useReviewSession(cards: StudyCard[], recordReview: (cardId: string, rating: Rating) => void) {
  const [queue, setQueue] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const current = useMemo(() => cards.find((card) => card.id === queue[progress]), [cards, queue, progress]);
  const total = queue.length;

  function start(deckId?: string) {
    const due = cards.filter((card) => isDue(card) && (!deckId || card.deckId === deckId));
    setQueue(due.map((card) => card.id));
    setProgress(0);
    setFlipped(false);
    setFinished(false);
  }

  function flip() {
    setFlipped((previous) => !previous);
  }

  function rate(rating: Rating) {
    if (!current) return;
    recordReview(current.id, rating);
    setFlipped(false);
    if (progress + 1 >= total) setFinished(true);
    else setProgress((previous) => previous + 1);
  }

  return { current, progress, total, flipped, finished, start, flip, rate };
}

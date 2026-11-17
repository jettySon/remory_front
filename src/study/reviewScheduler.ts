import type { Rating, ReviewLog } from '../types';

const HISTORY_LIMIT = 32;
const TARGET_RECALL = 0.85;
const DECAY_TO_TARGET = -Math.log(TARGET_RECALL);
const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;
const MAX_INTERVAL = 180 * DAY;
const initialIntervals: Record<Rating, number> = {
  again: 10 * MINUTE,
  hard: DAY,
  good: 3 * DAY,
  easy: 7 * DAY,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function updateStability(stability: number, elapsedSeconds: number, rating: Rating) {
  const forgotten = -Math.expm1(-elapsedSeconds / stability);
  const priorInterval = stability * DECAY_TO_TARGET;
  switch (rating) {
    case 'again':
      return clamp(priorInterval * (0.3 + 0.25 * forgotten), MINUTE, 10 * MINUTE) / DECAY_TO_TARGET;
    case 'hard':
      return clamp(priorInterval * (0.7 + 0.25 * forgotten), 15 * MINUTE, MAX_INTERVAL) / DECAY_TO_TARGET;
    case 'good':
      return clamp(priorInterval * (1.15 + 1.65 * forgotten), 60 * MINUTE, MAX_INTERVAL) / DECAY_TO_TARGET;
    case 'easy':
      return clamp(priorInterval * (1.4 + 2.2 * forgotten), 6 * 60 * MINUTE, MAX_INTERVAL) / DECAY_TO_TARGET;
  }
}

// Keep this guest scheduler in sync with the backend ReviewScheduler.
export function nextReviewAt(logs: ReviewLog[], review: ReviewLog) {
  const reviewedAt = Date.parse(review.date);
  const history = logs
    .filter(
      (log) =>
        log.cardId === review.cardId && log.id !== review.id && (!log.mode || log.mode === 'scheduled'),
    )
    .map((log) => ({ id: log.id, rating: log.rating, time: Date.parse(log.date) }))
    .filter((entry) => entry.time <= reviewedAt)
    .sort((a, b) => b.time - a.time || (a.id === b.id ? 0 : a.id < b.id ? 1 : -1))
    .slice(0, HISTORY_LIMIT)
    .reverse();

  let stability = 0;
  let previous: number | undefined;
  for (const entry of [...history, { id: review.id, rating: review.rating, time: reviewedAt }]) {
    stability =
      previous === undefined
        ? initialIntervals[entry.rating] / DECAY_TO_TARGET
        : updateStability(stability, Math.max(0, (entry.time - previous) / 1000), entry.rating);
    previous = entry.time;
  }
  const nextIntervalSeconds = Math.round(stability * DECAY_TO_TARGET);
  return new Date(reviewedAt + nextIntervalSeconds * 1000).toISOString();
}

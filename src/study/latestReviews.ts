import type { ReviewLog } from '../types';

export function latestReviewsByCard(logs: readonly ReviewLog[]): Map<string, ReviewLog> {
  const latest = new Map<string, ReviewLog>();
  for (const log of logs) {
    const time = Date.parse(log.date);
    if (!Number.isFinite(time) || !['again', 'hard', 'good', 'easy'].includes(log.rating)) continue;
    const previous = latest.get(log.cardId);
    // 자유·집중 복습도 포함한다. 배열 순서 대신 학습 시각으로 최신 기록을 고른다.
    if (!previous || time > Date.parse(previous.date)
      || (time === Date.parse(previous.date) && log.id > previous.id)) latest.set(log.cardId, log);
  }
  return latest;
}

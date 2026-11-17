import type { Rating, StudyCard } from '../types';

export const localDay = (date: string | Date) => new Date(date).toLocaleDateString('sv-SE');
export const today = () => localDay(new Date());
export const isDue = (c: StudyCard) => new Date(c.dueAt).getTime() <= Date.now();
export const ratingLabels: Record<Rating, string> = {
  again: '다시',
  hard: '어려움',
  good: '보통',
  easy: '쉬움',
};

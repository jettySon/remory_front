import type { StudyCard } from '../types';

export const localDay = (date: string | Date) => new Date(date).toLocaleDateString('sv-SE');
export const today = () => localDay(new Date());
export const newStudyId = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const isDue = (c: StudyCard) => new Date(c.dueAt).getTime() <= Date.now();

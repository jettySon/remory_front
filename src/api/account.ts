import type { Deck, ReviewLog, StudyCard } from '../types';

export type StudyData = { decks: Deck[]; cards: StudyCard[]; logs: ReviewLog[] };
export type Account = { id: string; email: string };
export type Session = { account: Account; accessToken: string; expiresAt: string };
export type StudySnapshot = { revision: number; data: StudyData };
export type AccountAction = 'login' | 'signup';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  method: string,
  token?: string,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (data !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const detail = response.status < 500 && typeof problem?.detail === 'string' ? problem.detail : '';
    throw new ApiError(response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authenticate = (action: AccountAction, email: string, password: string) =>
  request<Session>(`/auth/${action}`, 'POST', undefined, { email: email.trim(), password });
export const endSession = (token: string) => request<void>('/auth/logout', 'POST', token);
export const fetchStudy = (token: string, signal?: AbortSignal) =>
  request<StudySnapshot>('/study', 'GET', token, undefined, signal);
export const putStudy = (token: string, snapshot: StudySnapshot) =>
  request<StudySnapshot>('/study', 'PUT', token, snapshot);
export const importStudy = (token: string, data: StudyData) =>
  request<StudySnapshot>('/study/import', 'POST', token, data);

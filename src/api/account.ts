import { request } from './request';

export type Account = { id: string; email: string };
export type Session = { account: Account; accessToken: string; expiresAt: string };
export type AccountAction = 'login' | 'signup';

export const authenticate = (action: AccountAction, email: string, password: string) =>
  request<Session>(`/auth/${action}`, 'POST', undefined, { email: email.trim(), password });
export const endSession = (token: string) => request<void>('/auth/logout', 'POST', token);

export const deleteSignedInAccount = (token: string, password: string) =>
  request<void>('/auth/me/delete', 'POST', token, { password });
export const deleteAccountFromWeb = (email: string, password: string) =>
  request<void>('/auth/account-deletion', 'POST', undefined, { email: email.trim(), password });

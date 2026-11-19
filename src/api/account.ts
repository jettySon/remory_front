import { request } from './request';
import { logoutSession, performSignIn } from './session';

export type Account = { id: string; email: string; hasPassword?: boolean; googleLinked?: boolean };
export type Session = { account: Account; accessToken: string; expiresAt: string };
export type AccountAction = 'login' | 'signup';

export const authenticate = (action: AccountAction, email: string, password: string) =>
  performSignIn(() => request<Session>(`/auth/${action}`, 'POST', undefined, { email: email.trim(), password }));
export const endSession = (token?: string) => logoutSession(token);

export const deleteSignedInAccount = (token: string, password: string) =>
  request<void>('/auth/me/delete', 'POST', token, { password });
export const deleteAccountFromWeb = (email: string, password: string) =>
  request<void>('/auth/account-deletion', 'POST', undefined, { email: email.trim(), password });

export const fetchAccount = (token: string, signal?: AbortSignal) =>
  request<Account>('/auth/me', 'GET', token, undefined, signal);

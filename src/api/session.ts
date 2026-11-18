import type { Session } from './account';

const sessionKey = 'remory-account-session';

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return null;
    const value = JSON.parse(raw) as Session;
    return value.accessToken && Date.parse(value.expiresAt) > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function rememberSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey);
  } catch {
    // The active session still works when browser storage is unavailable.
  }
}

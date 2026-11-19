import type { Account, Session } from './account';
import { ApiError, fetchJson } from './transport';

const legacyKey = 'remory-account-session';
const hintKey = 'remory-account-hint';
const logoutKey = 'remory-logout-pending';
const eventKey = 'remory-auth-event';
const channelName = 'remory-auth';
type Reason = 'login' | 'refresh' | 'logout' | 'expired' | 'external-login' | 'external-logout';
export type SessionChange = { session: Session | null; reason: Reason };

let current: Session | null = null;
let epoch = 0;
let refreshing: Promise<Session | null> | undefined;
let fallbackLock: Promise<unknown> = Promise.resolve();
const owners = new Set<string>();
const listeners = new Set<(change: SessionChange) => void>();
let lifecycleUsers = 0;
let timer: number | undefined;
let channel: BroadcastChannel | undefined;
const seenEvents = new Set<string>();

function localValue(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function writeLocal(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Cookies still work without web storage. */ }
}
function clearLegacy() {
  try { sessionStorage.removeItem(legacyKey); } catch { /* Legacy storage may be unavailable. */ }
  writeLocal(legacyKey, null);
}
function legacySession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(legacyKey) || 'null') as Session | null;
    return validSession(value) ? value : null;
  } catch { return null; }
}
function validSession(value: unknown): value is Session {
  const session = value as Session | null;
  return Boolean(session && /^[A-Za-z0-9_-]{43}$/.test(session.accessToken)
    && Date.parse(session.expiresAt) > Date.now() && typeof session.account?.id === 'string'
    && typeof session.account.email === 'string');
}
export function readAccountHint(): Account | null {
  try {
    const value = JSON.parse(localValue(hintKey) || 'null') as Account | null;
    return value && typeof value.id === 'string' && typeof value.email === 'string' ? value : null;
  } catch { return null; }
}
export function readSession() { return current; }
export function sessionEpoch() { return epoch; }
export function hasSavedAccount() { return Boolean(readAccountHint() || legacySession()); }
export function subscribeSession(listener: (change: SessionChange) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function notify(reason: Reason) { for (const listener of listeners) listener({ session: current, reason }); }

function publish(kind: 'login' | 'logout') {
  const event = { id: crypto.randomUUID(), kind };
  seenEvents.add(event.id);
  writeLocal(eventKey, JSON.stringify(event));
  if (channel) channel.postMessage(event);
  else if (typeof BroadcastChannel !== 'undefined') {
    const temporary = new BroadcastChannel(channelName);
    temporary.postMessage(event);
    temporary.close();
  }
}
function receive(value: unknown) {
  const event = value as { id?: string; kind?: string } | null;
  if (!event?.id || (event.kind !== 'login' && event.kind !== 'logout') || seenEvents.has(event.id)) return;
  // Ignore an old notification that arrived after a newer login/logout completed.
  const latest = localValue(eventKey);
  if (latest) { try { if (JSON.parse(latest).id !== event.id) return; } catch { return; } }
  seenEvents.add(event.id);
  if (seenEvents.size > 32) seenEvents.delete(seenEvents.values().next().value!);
  epoch++;
  current = null;
  owners.clear();
  window.clearTimeout(timer);
  notify(event.kind === 'login' ? 'external-login' : 'external-logout');
}

function adopt(session: Session, reason: 'login' | 'refresh') {
  if (!validSession(session)) throw new ApiError(503, 'Invalid session response');
  if (current && current.account.id !== session.account.id) { epoch++; owners.clear(); }
  current = session;
  owners.add(session.accessToken);
  if (owners.size > 8) owners.delete(owners.values().next().value!);
  // Only display metadata persists here. Access tokens stay in memory; refresh tokens are HttpOnly cookies.
  writeLocal(hintKey, JSON.stringify(session.account));
  clearLegacy();
  notify(reason);
  schedule();
}
function forget(reason: 'logout' | 'expired', broadcast: boolean) {
  const hadAccount = Boolean(current || hasSavedAccount());
  epoch++;
  current = null;
  owners.clear();
  window.clearTimeout(timer);
  clearLegacy();
  writeLocal(hintKey, null);
  notify(reason);
  if (broadcast && hadAccount) publish('logout');
}
export function rememberSession(session: Session | null) {
  if (session) { epoch++; adopt(session, 'login'); publish('login'); }
  else forget('logout', true);
}
export function revokeAccountSession(email: string) {
  if ((current?.account.email || readAccountHint()?.email)?.toLowerCase() === email.trim().toLowerCase()) {
    forget('expired', true);
  }
}

export function withSessionLock<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return new Promise<T>((resolve, reject) => {
      void navigator.locks.request('remory-auth-session', () => action().then(resolve, reject)).catch(reject);
    });
  }
  const result = fallbackLock.then(action, action);
  fallbackLock = result.then(() => undefined, () => undefined);
  return result;
}
async function flushLogoutLocked() {
  if (localValue(logoutKey) !== '1') return;
  await fetchJson<void>('/auth/logout', 'POST');
  writeLocal(logoutKey, null);
}
export async function performSignIn(signIn: () => Promise<Session>) {
  return withSessionLock(async () => {
    epoch++;
    await flushLogoutLocked();
    const session = await signIn();
    adopt(session, 'login');
    publish('login');
    return session;
  });
}
export async function logoutSession(token?: string) {
  return withSessionLock(async () => {
    epoch++;
    await fetchJson<void>('/auth/logout', 'POST', token);
    writeLocal(logoutKey, null);
    forget('logout', true);
  });
}
export function suspendSession() {
  // Continuing as a guest while offline must never silently restore the previous account later.
  writeLocal(logoutKey, '1');
  forget('logout', true);
  void withSessionLock(flushLogoutLocked).catch(() => undefined);
}

export function refreshSession(): Promise<Session | null> {
  if (refreshing) return refreshing;
  const started = epoch;
  const task = withSessionLock(async () => {
    if (started !== epoch) return current;
    if (localValue(logoutKey) === '1') { await flushLogoutLocked(); return null; }
    let session: Session;
    try {
      let attempt = 0;
      while (true) {
        try { session = await fetchJson<Session>('/auth/refresh', 'POST'); break; }
        catch (error) {
          if (!(error instanceof ApiError) || error.code !== 'SESSION_REFRESH_RETRY' || attempt >= 3) throw error;
          await new Promise<void>((resolve) => window.setTimeout(resolve, [100, 250, 500][attempt++]));
        }
      }
    } catch (error) {
      if (started !== epoch) return current;
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const legacy = legacySession();
      if (legacy) {
        try { session = await fetchJson<Session>('/auth/session', 'POST', legacy.accessToken); }
        catch (migrationError) {
          if (started === epoch && migrationError instanceof ApiError && migrationError.status === 401) forget('expired', true);
          throw migrationError;
        }
      } else {
        if (current || hasSavedAccount()) forget('expired', true);
        return null;
      }
    }
    if (started !== epoch) return current;
    adopt(session!, 'refresh');
    return session!;
  });
  const wrapped = task.finally(() => { if (refreshing === wrapped) refreshing = undefined; });
  refreshing = wrapped;
  return wrapped;
}
export async function restoreSession() {
  if (localValue(logoutKey) === '1') {
    await withSessionLock(flushLogoutLocked);
    return null;
  }
  return current && Date.parse(current.expiresAt) > Date.now() + 30_000 ? current : refreshSession();
}
export async function sessionForRequest(token: string) {
  if (!current || !owners.has(token)) throw new ApiError(409, 'Session changed', 'SESSION_CHANGED');
  const accountId = current.account.id;
  const session = Date.parse(current.expiresAt) <= Date.now() + 30_000 ? await refreshSession() : current;
  if (!session) throw new ApiError(401, '', 'SESSION_EXPIRED');
  if (session.account.id !== accountId) throw new ApiError(409, '', 'SESSION_CHANGED');
  return session;
}

function schedule(retryDelay?: number) {
  window.clearTimeout(timer);
  if (!lifecycleUsers || !current) return;
  const delay = retryDelay ?? Math.max(0, Date.parse(current.expiresAt) - Date.now() - 60_000);
  timer = window.setTimeout(() => { void refreshSession().catch(() => schedule(30_000)); }, Math.min(delay, 2_147_483_647));
}
export function startSessionLifecycle() {
  lifecycleUsers++;
  if (lifecycleUsers > 1) return () => { lifecycleUsers--; };
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => receive(event.data);
  }
  function onStorage(event: StorageEvent) {
    if (event.key === eventKey && event.newValue) { try { receive(JSON.parse(event.newValue)); } catch { /* Ignore malformed notifications. */ } }
  }
  function wake() {
    if (document.visibilityState === 'hidden') return;
    if (localValue(logoutKey) === '1') { void withSessionLock(flushLogoutLocked).catch(() => undefined); return; }
    if (!current && readAccountHint()) { void restoreSession().catch(() => undefined); return; }
    if (current && Date.parse(current.expiresAt) <= Date.now() + 60_000) {
      void refreshSession().catch(() => schedule(30_000));
    } else schedule();
  }
  window.addEventListener('storage', onStorage);
  window.addEventListener('online', wake);
  window.addEventListener('focus', wake);
  document.addEventListener('visibilitychange', wake);
  schedule();
  return () => {
    lifecycleUsers--;
    if (lifecycleUsers) return;
    window.clearTimeout(timer);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('online', wake);
    window.removeEventListener('focus', wake);
    document.removeEventListener('visibilitychange', wake);
    channel?.close(); channel = undefined;
  };
}

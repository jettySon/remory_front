import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../src/api/account';

const makeSession = (token = 'a', id = 'account-a'): Session => ({
  account: { id, email: `${id}@example.com`, hasPassword: true, googleLinked: false },
  accessToken: token.repeat(43), expiresAt: new Date(Date.now() + 900_000).toISOString(),
});
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}});
const unauthorized = () => json({code:'SESSION_EXPIRED'},401);
let stop: (() => void) | undefined;

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-19T12:00:00Z'));
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('navigator', { locks: undefined });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { stop?.(); stop=undefined; vi.useRealTimers(); });

describe('persistent session lifecycle', () => {
  it('keeps access credentials only in memory and persists display metadata', async () => {
    const auth = await import('../src/api/session');
    const session = makeSession();
    auth.rememberSession(session);
    expect(auth.readSession()).toEqual(session);
    expect(localStorage.getItem('remory-account-hint')).toContain(session.account.id);
    expect(JSON.stringify({...localStorage})).not.toContain(session.accessToken);
    expect(sessionStorage.getItem('remory-account-session')).toBeNull();
    expect(localStorage.getItem('remory-account-session')).toBeNull();
  });

  it('restores after a fresh app runtime using only a cookie-backed request', async () => {
    let auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.resetModules();
    auth = await import('../src/api/session');
    expect(auth.readSession()).toBeNull();
    vi.mocked(fetch).mockResolvedValueOnce(json(makeSession('b')));
    const restored = await auth.restoreSession();
    expect(restored?.accessToken).toBe('b'.repeat(43));
    const [path, options] = vi.mocked(fetch).mock.calls[0];
    expect(path).toBe('/api/v1/auth/refresh');
    expect(options?.credentials).toBe('same-origin');
    expect(new Headers(options?.headers).get('X-Remory-Client')).toBe('web');
    expect(new Headers(options?.headers).has('Authorization')).toBe(false);
  });

  it('migrates an old tab session once and removes the stored bearer token', async () => {
    const legacy = makeSession();
    sessionStorage.setItem('remory-account-session',JSON.stringify(legacy));
    const auth = await import('../src/api/session');
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(json(makeSession('b')));
    expect((await auth.restoreSession())?.accessToken).toBe('b'.repeat(43));
    expect(vi.mocked(fetch).mock.calls[1][0]).toBe('/api/v1/auth/session');
    expect(new Headers(vi.mocked(fetch).mock.calls[1][1]?.headers).get('Authorization')).toBe(`Bearer ${legacy.accessToken}`);
    expect(sessionStorage.getItem('remory-account-session')).toBeNull();
  });

  it('returns guest state when there is no saved session or refresh cookie', async () => {
    const auth = await import('../src/api/session');
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized());
    expect(await auth.restoreSession()).toBeNull();
    expect(auth.hasSavedAccount()).toBe(false);
  });

  it('deduplicates simultaneous refresh requests', async () => {
    const auth = await import('../src/api/session');
    let resolve!: (response:Response)=>void;
    vi.mocked(fetch).mockReturnValue(new Promise<Response>(done => { resolve=done; }));
    const first = auth.refreshSession();
    const second = auth.refreshSession();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    resolve(json(makeSession('b')));
    expect(await first).toEqual(await second);
  });

  it('network failure preserves the account and permits a later retry', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    await expect(auth.refreshSession()).rejects.toThrow('offline');
    expect(auth.readSession()?.account.id).toBe('account-a');
    expect(auth.hasSavedAccount()).toBe(true);
    vi.mocked(fetch).mockResolvedValueOnce(json(makeSession('b')));
    expect((await auth.refreshSession())?.accessToken).toBe('b'.repeat(43));
  });

  it('invalid refresh clears the account and retained metadata', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.mocked(fetch).mockResolvedValueOnce(unauthorized());
    expect(await auth.refreshSession()).toBeNull();
    expect(auth.readSession()).toBeNull();
    expect(auth.hasSavedAccount()).toBe(false);
  });

  it('proactively refreshes before expiry and when returning after sleep', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.mocked(fetch).mockImplementation(async () => json(makeSession('b')));
    stop=auth.startSessionLifecycle();
    await vi.advanceTimersByTimeAsync(840_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(auth.readSession()?.accessToken).toBe('b'.repeat(43));
    vi.setSystemTime(new Date(Date.now()+900_000));
    window.dispatchEvent(new Event('focus'));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('retries a concurrent-refresh conflict without deleting the session', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.mocked(fetch).mockResolvedValueOnce(json({code:'SESSION_REFRESH_RETRY'},409)).mockResolvedValueOnce(json(makeSession('b')));
    const pending = auth.refreshSession();
    await vi.advanceTimersByTimeAsync(200);
    expect((await pending)?.accessToken).toBe('b'.repeat(43));
  });

  it('does not restore after continuing as a guest while offline', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    auth.suspendSession();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(auth.readSession()).toBeNull();
    expect(localStorage.getItem('remory-logout-pending')).toBe('1');
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null,{status:204}));
    expect(await auth.restoreSession()).toBeNull();
    expect(vi.mocked(fetch).mock.calls.map(call=>call[0])).toEqual(['/api/v1/auth/logout','/api/v1/auth/logout']);
    expect(localStorage.getItem('remory-logout-pending')).toBeNull();
  });

  it('receives logout events from another tab without leaking credentials', async () => {
    const auth = await import('../src/api/session');
    auth.rememberSession(makeSession());
    stop=auth.startSessionLifecycle();
    const event=JSON.stringify({id:'other-tab-event',kind:'logout'});
    localStorage.removeItem('remory-account-hint');
    localStorage.setItem('remory-auth-event',event);
    window.dispatchEvent(new StorageEvent('storage',{key:'remory-auth-event',newValue:event}));
    expect(auth.readSession()).toBeNull();
    expect(event).not.toContain('accessToken');
  });

  it('uses a browser-wide Web Lock when available', async () => {
    const lock=vi.fn(async (_name:string, callback:()=>Promise<unknown>)=>callback());
    vi.stubGlobal('navigator',{locks:{request:lock}});
    const auth = await import('../src/api/session');
    vi.mocked(fetch).mockResolvedValueOnce(json(makeSession()));
    await auth.refreshSession();
    expect(lock).toHaveBeenCalledWith('remory-auth-session',expect.any(Function));
  });
});

describe('authenticated requests', () => {
  it('refreshes once for parallel 401s and retries both with the new access token', async () => {
    const auth = await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    vi.mocked(fetch).mockImplementation(async (path,options) => {
      if(String(path).endsWith('/auth/refresh')) return json(makeSession('b'));
      return new Headers(options?.headers).get('Authorization')===`Bearer ${initial.accessToken}` ? unauthorized() : json({ok:true});
    });
    expect(await Promise.all([request('/study','GET',initial.accessToken),request('/study','GET',initial.accessToken)])).toEqual([{ok:true},{ok:true}]);
    expect(vi.mocked(fetch).mock.calls.filter(call=>String(call[0]).endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('renews an expired in-memory token before making the protected request', async () => {
    const auth=await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    vi.setSystemTime(new Date(Date.now()+901_000));
    vi.mocked(fetch).mockImplementation(async path=>String(path).endsWith('/auth/refresh')?json(makeSession('b')):json({ok:true}));
    await request('/study','GET',initial.accessToken);
    expect(vi.mocked(fetch).mock.calls.map(call=>call[0])).toEqual(['/api/v1/auth/refresh','/api/v1/study']);
  });

  it('discards a response arriving after logout', async () => {
    const auth=await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    let resolve!:(response:Response)=>void;
    vi.mocked(fetch).mockImplementation(async path=>String(path).endsWith('/auth/logout')?new Response(null,{status:204}):new Promise<Response>(done=>{resolve=done;}));
    const pending=request('/study','GET',initial.accessToken);
    const rejected=expect(pending).rejects.toMatchObject({code:'SESSION_CHANGED'});
    await vi.waitFor(()=>expect(fetch).toHaveBeenCalledTimes(1));
    await auth.logoutSession(initial.accessToken);
    resolve(json({privateData:'account-a'}));
    await rejected;
    expect(auth.readSession()).toBeNull();
  });

  it('never retries an old-account mutation as a newly logged-in account', async () => {
    const auth=await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    auth.rememberSession(makeSession('b','account-b'));
    await expect(request('/study/decks','POST',initial.accessToken,{title:'private'})).rejects.toMatchObject({code:'SESSION_CHANGED'});
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not refresh for a rejected Google proof', async () => {
    const auth=await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    vi.mocked(fetch).mockResolvedValueOnce(json({code:'GOOGLE_RESTART'},401));
    await expect(request('/auth/google/me/delete','POST',initial.accessToken,{})).rejects.toMatchObject({code:'GOOGLE_RESTART'});
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(auth.readSession()).toEqual(initial);
  });

  it('stops after one retry if the server still rejects the new access token', async () => {
    const auth=await import('../src/api/session');
    const {request}=await import('../src/api/request');
    const initial=makeSession(); auth.rememberSession(initial);
    vi.mocked(fetch).mockImplementation(async path=>String(path).endsWith('/auth/refresh')?json(makeSession('b')):unauthorized());
    await expect(request('/study','GET',initial.accessToken)).rejects.toMatchObject({status:401});
    expect(vi.mocked(fetch).mock.calls).toHaveLength(3);
    expect(auth.readSession()).toBeNull();
  });
});

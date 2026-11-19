import { ApiError, fetchJson } from './transport';
import { readSession, refreshSession, rememberSession, sessionEpoch, sessionForRequest } from './session';
export { ApiError } from './transport';

export async function request<T>(path: string, method: string, token?: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  if (!token) return fetchJson<T>(path, method, undefined, data, signal);
  const started = sessionEpoch();
  let session = await sessionForRequest(token);
  const accountId = session.account.id;
  function assertSameAccount() {
    if (started !== sessionEpoch() || readSession()?.account.id !== accountId) throw new ApiError(409, '', 'SESSION_CHANGED');
    signal?.throwIfAborted();
  }
  assertSameAccount();
  try {
    const result = await fetchJson<T>(path, method, session.accessToken, data, signal);
    assertSameAccount();
    return result;
  } catch (error) {
    assertSameAccount();
    if (!(error instanceof ApiError) || error.status !== 401 || error.code?.startsWith('GOOGLE_')) throw error;
    // If another request already refreshed this token, reuse its result instead of rotating twice.
    const latest = readSession();
    const renewed = latest && latest.accessToken !== session.accessToken ? latest : await refreshSession();
    if (!renewed) throw new ApiError(401, '', 'SESSION_EXPIRED');
    assertSameAccount();
    session = renewed;
    try {
      const result = await fetchJson<T>(path, method, session.accessToken, data, signal);
      assertSameAccount();
      return result;
    } catch (retryError) {
      assertSameAccount();
      if (retryError instanceof ApiError && retryError.status === 401 && !retryError.code?.startsWith('GOOGLE_')
          && readSession()?.accessToken === session.accessToken) rememberSession(null);
      throw retryError;
    }
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Android account bridge', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.resetModules(); });
  afterEach(() => { delete window.RemoryAndroid; vi.useRealTimers(); });

  function bridge() {
    const native = { postMessage: vi.fn(), onmessage: null as ((event: { data: string }) => void) | null };
    window.RemoryAndroid = native;
    return native;
  }

  it('uses the server nonce and only resolves the matching request', async () => {
    const native = bridge();
    const { nativeGoogleSignIn } = await import('../src/platform/android');
    const promise = nativeGoogleSignIn('web-client', 'server-nonce', new AbortController().signal);
    const request = JSON.parse(native.postMessage.mock.calls[0][0]);
    expect(request).toMatchObject({ type: 'googleSignIn', clientId: 'web-client', nonce: 'server-nonce' });
    native.onmessage!({ data: 'malformed' });
    native.onmessage!({ data: JSON.stringify({ id: 'unrelated', credential: 'wrong' }) });
    native.onmessage!({ data: JSON.stringify({ id: request.id, credential: 'test-token' }) });
    await expect(promise).resolves.toBe('test-token');
    expect(vi.getTimerCount()).toBe(0);
    expect(localStorage.getItem('test-token')).toBeNull();
  });

  it('discards a result after its login screen has closed', async () => {
    const native = bridge();
    const { nativeGoogleSignIn } = await import('../src/platform/android');
    const controller = new AbortController();
    const promise = nativeGoogleSignIn('web-client', 'nonce', controller.signal);
    const rejection = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    const request = JSON.parse(native.postMessage.mock.calls[0][0]);
    native.onmessage!({ data: JSON.stringify({ id: request.id, credential: 'late-token' }) });
    await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('propagates cancellation and times out when Android does not answer', async () => {
    const native = bridge();
    const { nativeGoogleSignIn } = await import('../src/platform/android');
    const first = nativeGoogleSignIn('web-client', 'nonce', new AbortController().signal);
    const rejected = expect(first).rejects.toMatchObject({ code: 'CANCELED' });
    const request = JSON.parse(native.postMessage.mock.calls[0][0]);
    native.onmessage!({ data: JSON.stringify({ id: request.id, error: 'CANCELED' }) });
    await rejected;
    const second = nativeGoogleSignIn('web-client', 'nonce', new AbortController().signal);
    const timedOut = expect(second).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(120000);
    await timedOut;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves regular browsers on the existing web login flow', async () => {
    const { isAndroidApp, nativeGoogleSignIn } = await import('../src/platform/android');
    expect(isAndroidApp()).toBe(false);
    await expect(nativeGoogleSignIn('web-client', 'nonce', new AbortController().signal))
      .rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});

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

  it('shares the native bridge with login and sends only the next due time for reminder sync', async () => {
    const native = bridge();
    const { readReviewReminder, saveReviewReminder, syncReviewReminder } = await import('../src/platform/android');
    const initial = readReviewReminder(new AbortController().signal);
    const read = JSON.parse(native.postMessage.mock.calls[0][0]);
    expect(read.type).toBe('reminderSettings');
    native.onmessage!({ data: JSON.stringify({ id: read.id, reminder: { enabled: false, time: '19:00', allowed: false } }) });
    await expect(initial).resolves.toEqual({ enabled: false, time: '19:00', allowed: false });

    const saved = saveReviewReminder(true, '08:30');
    const update = JSON.parse(native.postMessage.mock.calls[1][0]);
    expect(update).toMatchObject({ type: 'setReminder', enabled: true, time: '08:30' });
    native.onmessage!({ data: JSON.stringify({ id: update.id, reminder: { enabled: true, time: '08:30', allowed: true } }) });
    await expect(saved).resolves.toEqual({ enabled: true, time: '08:30', allowed: true });

    syncReviewReminder('guest', 1800000000000, 'ko');
    syncReviewReminder('account', null, 'en');
    expect(JSON.parse(native.postMessage.mock.calls[2][0])).toEqual(
      { type: 'syncReminder', id: '', source: 'guest', dueAt: 1800000000000, locale: 'ko' },
    );
    expect(JSON.parse(native.postMessage.mock.calls[3][0])).toEqual(
      { type: 'syncReminder', id: '', source: 'account', dueAt: null, locale: 'en' },
    );
  });

  it('leaves regular browsers on the existing web login flow', async () => {
    const { isAndroidApp, nativeGoogleSignIn } = await import('../src/platform/android');
    expect(isAndroidApp()).toBe(false);
    await expect(nativeGoogleSignIn('web-client', 'nonce', new AbortController().signal))
      .rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});

export type ReviewReminderSettings = { enabled: boolean; time: string; allowed: boolean };
type NativeMessage = { id: string; credential?: string; error?: string; reminder?: ReviewReminderSettings };
type AndroidBridge = {
  postMessage: (message: string) => void;
  onmessage: ((event: { data: string }) => void) | null;
};

declare global {
  interface Window {
    RemoryAndroid?: AndroidBridge;
    __remoryHandleBack?: () => boolean;
  }
}

export const isAndroidApp = () => typeof window !== 'undefined' && !!window.RemoryAndroid;

export class NativeSignInError extends Error {
  constructor(public readonly code: string) { super(code); }
}

// The Android side exposes this object only to the configured site's main frame.
const pending = new Map<string, (result: NativeMessage) => void>();
let installedBridge: AndroidBridge | undefined;

function nativeRequest(payload: object, signal?: AbortSignal, timeout = 4000): Promise<NativeMessage> {
  const bridge = window.RemoryAndroid;
  if (!bridge) return Promise.reject(new NativeSignInError('UNAVAILABLE'));
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  if (installedBridge !== bridge) {
    bridge.onmessage = ({ data }) => {
      try {
        const result = JSON.parse(data) as NativeMessage;
        if (typeof result.id === 'string') pending.get(result.id)?.(result);
      } catch { /* Ignore malformed or unrelated native messages. */ }
    };
    installedBridge = bridge;
  }
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const cleanup = () => {
      pending.delete(id);
      window.clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new NativeSignInError('TIMEOUT')); }, timeout);
    signal?.addEventListener('abort', abort, { once: true });
    pending.set(id, (result) => {
      cleanup();
      if (typeof result.error === 'string') reject(new NativeSignInError(result.error));
      else resolve(result);
    });
    try { bridge.postMessage(JSON.stringify({ ...payload, id })); }
    catch { cleanup(); reject(new NativeSignInError('UNAVAILABLE')); }
  });
}

export async function nativeGoogleSignIn(clientId: string, nonce: string, signal: AbortSignal): Promise<string> {
  const { credential } = await nativeRequest({ type: 'googleSignIn', clientId, nonce }, signal, 120000);
  if (typeof credential !== 'string' || !credential) throw new NativeSignInError('INVALID_RESPONSE');
  return credential;
}

export async function readReviewReminder(signal: AbortSignal) {
  const { reminder } = await nativeRequest({ type: 'reminderSettings' }, signal);
  if (!reminder) throw new Error('Missing reminder settings');
  return reminder;
}

export async function saveReviewReminder(enabled: boolean, time: string) {
  const { reminder } = await nativeRequest({ type: 'setReminder', enabled, time }, undefined, enabled ? 120000 : 4000);
  if (!reminder) throw new Error('Missing reminder settings');
  return reminder;
}

export function syncReviewReminder(source: 'account' | 'guest', dueAt: number | null, locale: string) {
  sendNativeMessage({ type: 'syncReminder', source, dueAt, locale });
}

export function openReviewNotificationSettings() {
  sendNativeMessage({ type: 'openReminderSettings' });
}

function sendNativeMessage(payload: object) {
  try { window.RemoryAndroid?.postMessage(JSON.stringify({ ...payload, id: '' })); }
  catch { /* A closed web view can no longer receive native messages. */ }
}

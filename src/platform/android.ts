type NativeMessage = { id: string; credential?: string; error?: string };
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
// Tokens stay in memory and use the same server nonce verification as the web flow.
const pending = new Map<string, (result: NativeMessage) => void>();
let installedBridge: AndroidBridge | undefined;

export function nativeGoogleSignIn(clientId: string, nonce: string, signal: AbortSignal): Promise<string> {
  const bridge = window.RemoryAndroid;
  if (!bridge) return Promise.reject(new NativeSignInError('UNAVAILABLE'));
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
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
      signal.removeEventListener('abort', abort);
    };
    const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = window.setTimeout(() => { cleanup(); reject(new NativeSignInError('TIMEOUT')); }, 120000);
    signal.addEventListener('abort', abort, { once: true });
    pending.set(id, (result) => {
      cleanup();
      if (typeof result.credential === 'string' && result.credential) resolve(result.credential);
      else reject(new NativeSignInError(typeof result.error === 'string' ? result.error : 'INVALID_RESPONSE'));
    });
    try { bridge.postMessage(JSON.stringify({ id, type: 'googleSignIn', clientId, nonce })); }
    catch { cleanup(); reject(new NativeSignInError('UNAVAILABLE')); }
  });
}

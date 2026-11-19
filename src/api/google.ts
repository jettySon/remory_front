import { request, ApiError } from './request';
import { performSignIn } from './session';
import type { Account, Session } from './account';
import type { MessageKey } from '../i18n/messages';

export type GoogleProof = { credential: string; nonce: string };
export type GooglePurpose = 'login' | 'delete';

export const googleChallenge = (purpose: GooglePurpose, signal: AbortSignal) =>
  request<{ clientId: string; nonce: string }>(`/auth/google/challenge?purpose=${purpose}`, 'GET', undefined, undefined, signal);

export const authenticateGoogle = (proof: GoogleProof, password?: string) =>
  performSignIn(() => request<Session>('/auth/google', 'POST', undefined, { ...proof, password }));

export const deleteSignedInWithGoogle = (token: string, proof: GoogleProof) =>
  request<void>('/auth/google/me/delete', 'POST', token, proof);

export const deleteWithGoogleFromWeb = (proof: GoogleProof) =>
  request<Account>('/auth/google/account-deletion', 'POST', undefined, proof);

export function googleErrorMessage(error: unknown): MessageKey {
  if (!(error instanceof ApiError)) return 'google.failed';
  switch (error.code) {
    case 'GOOGLE_RESTART': return 'google.restart';
    case 'GOOGLE_LINK_PASSWORD': return 'errors.password';
    case 'GOOGLE_ACCOUNT_CONFLICT': return 'google.conflict';
    case 'GOOGLE_ACCOUNT_NOT_FOUND': return 'google.notFound';
    case 'GOOGLE_ACCOUNT_MISMATCH': return 'google.mismatch';
    case 'GOOGLE_RETRY': return 'google.retryLogin';
    default: return 'google.failed';
  }
}

type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    auto_select: boolean;
    ux_mode: 'popup';
  }) => void;
  renderButton: (element: HTMLElement, options: {
    type: 'standard';
    theme: 'outline' | 'filled_black';
    size: 'large';
    text: 'continue_with';
    shape: 'pill';
    width: number;
    locale: string;
  }) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

let identityScript: Promise<GoogleIdentity> | undefined;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (identityScript) return identityScript;
  identityScript = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timeout = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error('Google Identity Services could not load'));
    }
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.google?.accounts.id) resolve(window.google.accounts.id);
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  }).catch((error: unknown) => {
    identityScript = undefined;
    throw error;
  });
  return identityScript;
}

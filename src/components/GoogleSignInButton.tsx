import { useEffect, useRef, useState } from 'react';
import { isAndroidApp } from '../platform/android';
import { NativeGoogleSignInButton } from './NativeGoogleSignInButton';
import { googleChallenge, googleErrorMessage, loadGoogleIdentity, type GoogleProof, type GooglePurpose } from '../api/google';
import { useLanguage } from '../i18n/LanguageProvider';
import type { MessageKey } from '../i18n/messages';

function WebGoogleSignInButton({
  onCredential,
  purpose = 'login',
  disabled = false,
}: {
  onCredential: (proof: GoogleProof) => Promise<void>;
  purpose?: GooglePurpose;
  disabled?: boolean;
}) {
  const { locale, t } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const disabledRef = useRef(disabled);
  callback.current = onCredential;
  disabledRef.current = disabled;
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let submitting = false;
    setReady(false);
    setError(null);

    void Promise.all([googleChallenge(purpose, controller.signal), loadGoogleIdentity()])
      .then(([challenge, google]) => {
        const element = container.current;
        if (controller.signal.aborted || !element) return;
        google.initialize({
          client_id: challenge.clientId,
          nonce: challenge.nonce,
          auto_select: false,
          ux_mode: 'popup',
          callback: (response) => {
            if (controller.signal.aborted || disabledRef.current || submitting) return;
            submitting = true;
            setWorking(true);
            void callback.current({ credential: response.credential, nonce: challenge.nonce })
              .catch((reason: unknown) => {
                if (!controller.signal.aborted) setError(googleErrorMessage(reason));
              })
              .finally(() => {
                if (!controller.signal.aborted) {
                  setWorking(false);
                  setAttempt((current) => current + 1);
                }
              });
          },
        });
        element.replaceChildren();
        google.renderButton(element, {
          type: 'standard',
          theme: element.closest('[data-theme="dark"]') ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(400, Math.max(200, Math.floor(element.getBoundingClientRect().width))),
          locale,
        });
        setReady(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('google.unavailable');
      });

    return () => controller.abort();
  }, [locale, attempt, purpose]);

  return (
    <div className="google-sign-in">
      <div className="google-button" ref={container} inert={disabled || working} aria-busy={working} />
      {(!ready || working) && !error && (
        <p className="field-hint" role="status">{t(working ? 'account.connecting' : 'google.loading')}</p>
      )}
      {error && (
        <div className="google-feedback" role="alert">
          <p>{t(error)}</p>
          <button type="button" className="plain-link" onClick={() => setAttempt((current) => current + 1)}>
            {t('common.retry')}
          </button>
        </div>
      )}
    </div>
  );
}

export function GoogleSignInButton(props: Parameters<typeof WebGoogleSignInButton>[0]) {
  return isAndroidApp() ? <NativeGoogleSignInButton {...props} /> : <WebGoogleSignInButton {...props} />;
}

import { GuestImportOptions } from '../GuestImportOptions';
import type { GuestImportPreference } from '../../study/guestData';
import { PasswordResetRequest } from '../PasswordResetRequest';
import { GoogleSignInButton } from '../GoogleSignInButton';
import { googleErrorMessage, type GoogleProof } from '../../api/google';
import { ApiError } from '../../api/request';
import { Form, Field } from '../Form';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import type { Account, AccountAction } from '../../api/account';
import { Mascot } from '../Illustrations';
import { Modal } from '../Modal';

export function AccountModal({
  account,
  guestPending,
  onAuthenticate,
  onGoogleAuthenticate,
  onLogout,
  onClose,
}: {
  account?: Account;
  guestPending: boolean;
  onAuthenticate: (action: AccountAction, email: string, password: string, preference: GuestImportPreference) => Promise<void>;
  onGoogleAuthenticate: (proof: GoogleProof, password: string | undefined, preference: GuestImportPreference) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [linkProof, setLinkProof] = useState<GoogleProof | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [guestPreference, setGuestPreference] = useState<GuestImportPreference>('keep');
  const working = useRef(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  const action = isSignup ? t('account.signup') : t('account.login');

  function changeMode(next: typeof mode) {
    if (working.current || mode === next) return;
    setMode(next);
    setLinkProof(null);
    setShowPassword(false);
    setFeedback('');
  }

  async function run(action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setPending(true);
    setFeedback('');
    try {
      await action();
    } catch (error) {
      const message = error instanceof ApiError
        ? t(googleErrorMessage(error))
        : error instanceof Error ? error.message : t('errors.tryLater');
      setFeedback(message);
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (linkProof) {
      const password = String(new FormData(event.currentTarget).get('password') ?? '');
      void run(() => onGoogleAuthenticate(linkProof, password, guestPreference));
      return;
    }
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    void run(() => onAuthenticate(isSignup ? 'signup' : 'login', email, password, guestPreference));
  }

  async function signInWithGoogle(proof: GoogleProof) {
    await run(async () => {
      try {
        await onGoogleAuthenticate(proof, undefined, guestPreference);
      } catch (error) {
        if (error instanceof ApiError && error.code === 'GOOGLE_LINK_REQUIRED') {
          setLinkProof(proof);
          setMode('login');
          return;
        }
        throw error;
      }
    });
  }

  function close() {
    if (!working.current) onClose();
  }

  if (account)
    return (
      <Modal title={t('account.mine')} onClose={close}>
        <div className="account-intro">
          <p>
            <strong>{account.email}</strong>
            <br />
            {t('account.saveHistory')}
          </p>
          <Mascot className="account-mascot" />
        </div>
        {account.googleLinked && <p className="google-linked">{t('google.linked')}</p>}
        <button className="big-primary" type="button" disabled={pending} onClick={() => void run(onLogout)}>
          {pending ? t('account.loggingOut') : t('account.logout')}
        </button>
        {feedback && (
          <p className="account-feedback" role="alert">
            {feedback}
          </p>
        )}
      </Modal>
    );

  if (isReset) {
    return (
      <Modal title={t('account.reset')} onClose={onClose}>
        <PasswordResetRequest initialEmail={email} onBack={() => changeMode('login')} />
      </Modal>
    );
  }

  return (
    <Modal title={linkProof ? t('google.linkTitle') : t('account.title')} onClose={close}>
      <div className="account-intro">
        <p>
          <strong>{t('account.saveHistoryTitle')}</strong>
          <br />
          {guestPending
            ? t('account.importGuest')
            : t('account.resume')}
        </p>
        <Mascot className="account-mascot" />
      </div>
      {guestPending && <GuestImportOptions value={guestPreference} onChange={setGuestPreference} disabled={pending} />}
      {!linkProof && (
        <>
          <GoogleSignInButton onCredential={signInWithGoogle} disabled={pending} />
          <div className="account-divider"><span>{t('google.orEmail')}</span></div>
        </>
      )}
      {linkProof ? (
        <p className="account-reset-guide">{t('google.linkHint')}</p>
      ) : (
        <div className="entry-modes account-modes" role="group" aria-label={t('account.tabs')}>
          <button
            type="button"
            aria-pressed={!isSignup}
            disabled={pending}
            onClick={() => changeMode('login')}
          >
            {t('account.login')}
          </button>
          <button
            type="button"
            aria-pressed={isSignup}
            disabled={pending}
            onClick={() => changeMode('signup')}
          >
            {t('account.signup')}
          </button>
        </div>
      )}
      <Form key={linkProof ? 'google-link' : mode} className="sheet-form account-form" onInput={() => setFeedback('')} onSubmit={submit}>
        {!linkProof && <label>
          {t('account.email')}
          <Field
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus={!guestPending}
            disabled={pending}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </label>}
        <div className="account-password">
          <label htmlFor="account-password">{t('account.password')}</label>
          <div className="password-control">
            <Field
              id="account-password"
              name="password"
              disabled={pending}
              autoFocus={Boolean(linkProof)}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={isSignup ? 8 : undefined}
              aria-describedby={isSignup ? 'account-password-hint' : undefined}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t('account.hidePassword') : t('account.showPassword')}
              aria-controls="account-password"
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
          {isSignup && (
            <span className="field-hint" id="account-password-hint">
              {t('account.passwordHint')}
            </span>
          )}
        </div>
        <button type="submit" className="big-primary form-submit" disabled={pending}>
          {pending ? t('account.connecting') : linkProof ? t('google.linkConfirm') : action} <ArrowRight size={18} aria-hidden="true" />
        </button>
        {feedback && (
          <p className="account-feedback" role="alert">
            {feedback}
          </p>
        )}
      </Form>
      {linkProof ? (
        <button className="account-help-link" type="button" disabled={pending} onClick={() => {
          setLinkProof(null);
          setFeedback('');
        }}>
          {t('common.cancel')}
        </button>
      ) : (
        mode === 'login' && (
          <button className="account-help-link" type="button" onClick={() => changeMode('reset')}>
            {t('account.forgot')}
          </button>
        )
      )}
      <a className="account-privacy-link" href="/privacy/">{t('privacy.title')}</a>
    </Modal>
  );
}

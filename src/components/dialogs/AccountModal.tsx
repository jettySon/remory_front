import { useLanguage } from '../../i18n/LanguageProvider';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import type { Account, AccountAction } from '../../api/account';
import { Mascot } from '../Illustrations';
import { Modal } from '../Modal';

export function AccountModal({
  account,
  guestPending,
  onAuthenticate,
  onLogout,
  onClose,
}: {
  account?: Account;
  guestPending: boolean;
  onAuthenticate: (action: AccountAction, email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const working = useRef(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  const action = isReset ? t('account.resetLink') : isSignup ? t('account.signup') : t('account.login');

  function changeMode(next: typeof mode) {
    if (working.current || mode === next) return;
    setMode(next);
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
      setFeedback(error instanceof Error ? error.message : t('errors.tryLater'));
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReset) {
      setFeedback(t('account.resetUnavailable'));
      return;
    }
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    void run(() => onAuthenticate(isSignup ? 'signup' : 'login', email, password));
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

  return (
    <Modal title={isReset ? t('account.reset') : t('account.title')} onClose={close}>
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
      {isReset ? (
        <p className="account-reset-guide">{t('account.resetGuide')}</p>
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
      <form key={mode} className="sheet-form account-form" onInput={() => setFeedback('')} onSubmit={submit}>
        <label>
          {t('account.email')}
          <input
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus
            disabled={pending}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </label>
        {!isReset && (
          <div className="account-password">
            <label htmlFor="account-password">{t('account.password')}</label>
            <div className="password-control">
              <input
                id="account-password"
                name="password"
                disabled={pending}
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
        )}
        <button type="submit" className="big-primary form-submit" disabled={pending}>
          {pending ? t('account.connecting') : action} <ArrowRight size={18} aria-hidden="true" />
        </button>
        {feedback && (
          <p className="account-feedback" role={isReset ? 'status' : 'alert'}>
            {feedback}
          </p>
        )}
      </form>
      {isReset ? (
        <button className="account-help-link" type="button" onClick={() => changeMode('login')}>
          <ArrowLeft size={15} aria-hidden="true" /> {t('account.backToLogin')}
        </button>
      ) : (
        mode === 'login' && (
          <button className="account-help-link" type="button" onClick={() => changeMode('reset')}>
            {t('account.forgot')}
          </button>
        )
      )}
    </Modal>
  );
}

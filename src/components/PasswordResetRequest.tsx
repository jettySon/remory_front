import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Mail, Check, ShieldCheck } from 'lucide-react';
import {
  requestPasswordReset, verifyPasswordResetCode, confirmPasswordReset, passwordResetError,
  type ResetChallenge, type ResetVerification,
} from '../api/passwordReset';
import { ApiError } from '../api/request';
import { revokeAccountSession } from '../api/session';
import { useLanguage } from '../i18n/LanguageProvider';
import type { MessageKey } from '../i18n/messages';
import { Form, Field } from './Form';
import { Mascot } from './Illustrations';
import { NewPasswordForm } from './NewPasswordForm';

export function PasswordResetRequest({ initialEmail = '', onBack }: {
  initialEmail?: string;
  onBack?: () => void;
}) {
  const { t, locale } = useLanguage();
  const [email, setEmail] = useState(initialEmail);
  // Challenges and reset grants stay in memory, never in URLs or browser storage.
  const [challenge, setChallenge] = useState<ResetChallenge | null>(null);
  const [verification, setVerification] = useState<ResetVerification | null>(null);
  const [code, setCode] = useState('');
  const [codeLocked, setCodeLocked] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [now, setNow] = useState(Date.now);
  const working = useRef(false);
  const phase = verification ? 2 : challenge ? 1 : 0;

  useEffect(() => {
    if (!challenge || verification || done) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge, verification, done]);

  async function run(action: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(passwordResetError(failure));
      if (failure instanceof ApiError && failure.code === 'RESET_CODE_LOCKED') setCodeLocked(true);
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  async function sendCode() {
    const next = await requestPasswordReset(email, locale);
    setChallenge(next);
    setVerification(null);
    setCode('');
    setCodeLocked(false);
    setNow(Date.now());
  }

  function changeEmail() {
    if (working.current) return;
    setChallenge(null);
    setVerification(null);
    setCode('');
    setCodeLocked(false);
    setError(null);
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(sendCode);
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || codeLocked) return;
    if (Date.parse(challenge.expiresAt) <= Date.now()) {
      setError('reset.codeExpired');
      return;
    }
    void run(async () => {
      setVerification(await verifyPasswordResetCode(challenge.challengeId, code));
      setCode('');
    });
  }

  const resendSeconds = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000)) : 0;
  const codeSeconds = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - now) / 1000)) : 0;
  const codeTime = `${Math.floor(codeSeconds / 60)}:${String(codeSeconds % 60).padStart(2, '0')}`;

  return (
    <div className="password-reset-request">
      {!done && (
        <ol className="reset-progress" aria-label={t('reset.steps')}>
          {(['account.email', 'reset.codeStep', 'reset.passwordStep'] as const).map((key, index) => (
            <li key={key} aria-current={phase === index ? 'step' : undefined}
              className={phase === index ? 'is-active' : phase > index ? 'is-complete' : ''}>
              <span aria-hidden="true">{phase > index ? <Check size={12} /> : index + 1}</span>{t(key)}
            </li>
          ))}
        </ol>
      )}
      {done ? (
        <div className="password-reset-notice" role="status">
          <span className="password-reset-icon"><Check size={25} aria-hidden="true" /></span>
          <h2>{t('reset.doneTitle')}</h2>
          <p>{t('reset.done')}</p>
          {onBack ? (
            <button type="button" className="big-primary password-reset-home" onClick={onBack}>{t('account.backToLogin')}</button>
          ) : (
            <a className="big-primary password-reset-home" href="/">{t('account.homeLink')}</a>
          )}
        </div>
      ) : verification ? (
        <>
          <div className="password-reset-intro">
            <Mascot className="account-mascot" />
            <div><strong className="reset-verified"><ShieldCheck size={16} aria-hidden="true" />{t('reset.verified')}</strong>
              <p>{t('reset.newPasswordGuide')}</p></div>
          </div>
          <NewPasswordForm pending={pending} error={error} onInput={() => setError(null)}
            onConfirm={(password) => void run(async () => {
              await confirmPasswordReset(verification.resetToken, password);
              revokeAccountSession(email);
              setVerification(null);
              setChallenge(null);
              setDone(true);
            })} />
          <div className="reset-password-actions">
            <button className="account-help-link" type="button" disabled={pending} onClick={changeEmail}>
              {t('reset.requestAgain')}
            </button>
            {onBack && (
              <button className="account-help-link" type="button" disabled={pending} onClick={onBack}>
                <ArrowLeft size={15} aria-hidden="true" /> <span>{t('account.backToLogin')}</span>
              </button>
            )}
          </div>
        </>
      ) : challenge ? (
        <>
          <div className="reset-code-intro" role="status">
            <span className="password-reset-icon"><Mail size={23} aria-hidden="true" /></span>
            <div><strong>{email.trim()}</strong><p>{t('reset.codeGuide')}</p></div>
          </div>
          <Form key={challenge.challengeId} className="sheet-form account-form" method="post" onSubmit={submitCode} onInput={() => setError(null)}>
            <label>
              {t('reset.code')}
              <Field className="reset-code-input" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]{6}" minLength={6} maxLength={6} required autoFocus disabled={pending || codeLocked || codeSeconds === 0}
                value={code} onChange={(event) => setCode(event.target.value.normalize('NFKC').replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" aria-describedby="reset-code-time" />
            </label>
            <span className="field-hint" id="reset-code-time">{codeSeconds ? t('reset.codeExpires', { time: codeTime }) : t('reset.codeExpired')}</span>
            {error && <p className="form-error" role="alert">{t(error)}</p>}
            <button type="submit" className="big-primary form-submit" disabled={pending || codeLocked || codeSeconds === 0}>
              {t(pending ? 'reset.verifying' : 'reset.verify')}
            </button>
          </Form>
          <div className="reset-code-actions">
            <button className="account-help-link" type="button" disabled={pending || resendSeconds > 0} onClick={() => void run(sendCode)}>
              {resendSeconds ? t('reset.resendIn', { count: resendSeconds }) : t('reset.resend')}
            </button>
            <button className="account-help-link" type="button" disabled={pending} onClick={changeEmail}>{t('reset.changeEmail')}</button>
          </div>
          <p className="password-reset-help">{t('reset.requestGuide')}</p>
          <p className="password-reset-help">{t('reset.spamHint')}</p>
        </>
      ) : (
        <>
          <p className="account-reset-guide">{t('account.resetGuide')}</p>
          <Form className="sheet-form account-form" method="post" onSubmit={submitEmail} onInput={() => setError(null)}>
            <label>
              {t('account.email')}
              <Field type="email" name="email" autoComplete="email" autoCapitalize="none" autoFocus
                required maxLength={254} disabled={pending} value={email}
                onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
            </label>
            <button type="submit" className="big-primary form-submit" disabled={pending}>
              <Mail size={18} aria-hidden="true" /> {t(pending ? 'reset.sending' : 'reset.sendCode')}
            </button>
            {error && <p className="form-error" role="alert">{t(error)}</p>}
          </Form>
          <p className="password-reset-help">{t('reset.googleHint')}</p>
        </>
      )}
      {!done && !verification && onBack && (
        <button type="button" className="account-help-link" disabled={pending} onClick={onBack}>
          <ArrowLeft size={15} aria-hidden="true" /> {t('account.backToLogin')}
        </button>
      )}
    </div>
  );
}

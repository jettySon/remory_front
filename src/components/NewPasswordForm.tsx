import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { MessageKey } from '../i18n/messages';
import { Form, Field } from './Form';

export function NewPasswordForm({ pending, error, onConfirm, onInput }: {
  pending: boolean;
  error: MessageKey | null;
  onConfirm: (password: string) => void;
  onInput: () => void;
}) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [validation, setValidation] = useState<MessageKey | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get('password') ?? '');
    if (password !== String(fields.get('confirmation') ?? '')) {
      setValidation('reset.mismatch');
      event.currentTarget.querySelector<HTMLInputElement>('[name="confirmation"]')?.focus();
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setValidation('reset.passwordFormat');
      return;
    }
    setValidation(null);
    onConfirm(password);
  }

  return (
    <Form className="sheet-form account-form" method="post" onSubmit={submit}
      onInput={() => { setValidation(null); onInput(); }}>
      <div className="account-password">
        <label htmlFor="reset-password">{t('reset.newPassword')}</label>
        <div className="password-control">
          <Field id="reset-password" name="password" type={showPassword ? 'text' : 'password'}
            autoComplete="new-password" minLength={8} maxLength={72} required autoFocus
            disabled={pending} aria-describedby="reset-password-hint" />
          <button type="button" disabled={pending} onClick={() => setShowPassword((value) => !value)}
            aria-label={t(showPassword ? 'account.hidePassword' : 'account.showPassword')} aria-controls="reset-password">
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        <span className="field-hint" id="reset-password-hint">{t('account.passwordHint')}</span>
      </div>
      <label>
        {t('reset.confirmPassword')}
        <Field name="confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
          minLength={8} maxLength={72} disabled={pending} required />
      </label>
      {(validation || error) && <p className="form-error" role="alert">{t((validation || error)!)}</p>}
      <button className="big-primary form-submit" type="submit" disabled={pending}>
        {t(pending ? 'cards.saving' : 'reset.submit')}
      </button>
    </Form>
  );
}

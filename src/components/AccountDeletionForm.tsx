import { Form, Field, CheckboxField } from './Form';
import { useLanguage } from '../i18n/LanguageProvider';
import { useRef, useState, type FormEvent } from 'react';
import { UserRoundX } from 'lucide-react';
import { ApiError } from '../api/request';

export function AccountDeletionForm({
  email,
  onDelete,
  onCancel,
}: {
  email?: string;
  onDelete: (email: string, password: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const working = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working.current) return;
    const fields = new FormData(event.currentTarget);
    const enteredEmail = String(fields.get('email') ?? '').trim();
    const password = String(fields.get('password') ?? '');
    working.current = true;
    setPending(true);
    setFeedback('');
    try {
      await onDelete(email ?? enteredEmail, password);
    } catch (error) {
      setFeedback(
        t(error instanceof ApiError && error.status === 401
          ? email ? 'errors.sessionExpired' : 'errors.credentials'
          : error instanceof ApiError && error.status === 403
            ? 'errors.password'
            : error instanceof ApiError && error.status === 400
              ? 'errors.accountFormat'
              : 'account.deleteFailed'),
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  return (
    <Form
      className="sheet-form account-deletion-form"
      method="post"
      onSubmit={submit}
      onInput={() => setFeedback('')}
    >
      {email && <strong className="deletion-email">{email}</strong>}
      <p className="deletion-note">{t('account.deleteWarning')}</p>
      {!email && (
        <label>
          {t('account.registeredEmail')}
          <Field
            type="email"
            name="email"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={254}
            required
            disabled={pending}
          />
        </label>
      )}
      <label>
        {t('account.password')}
        <Field
          type="password"
          name="password"
          autoComplete="current-password"
          maxLength={72}
          autoFocus={Boolean(email)}
          required
          disabled={pending}
        />
      </label>
      <CheckboxField className="deletion-confirmation" name="confirm" required disabled={pending}>
        {t('account.confirmDelete')}
      </CheckboxField>
      {feedback && (
        <p className="form-error" role="alert">
          {feedback}
        </p>
      )}
      <div className="account-deletion-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="account-deletion-submit" disabled={pending}>
          <UserRoundX size={17} aria-hidden="true" /> {pending ? t('cards.deleting') : t('account.deleteData')}
        </button>
      </div>
    </Form>
  );
}

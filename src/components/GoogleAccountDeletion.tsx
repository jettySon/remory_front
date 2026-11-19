import { useRef, useState } from 'react';
import { ApiError } from '../api/request';
import { googleErrorMessage, type GoogleProof } from '../api/google';
import { useLanguage } from '../i18n/LanguageProvider';
import { Form, CheckboxField } from './Form';
import { GoogleSignInButton } from './GoogleSignInButton';

export function GoogleAccountDeletion({
  email,
  onDelete,
  onCancel,
  onPendingChange,
}: {
  email?: string;
  onDelete: (proof: GoogleProof) => Promise<void>;
  onCancel?: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const { t } = useLanguage();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const working = useRef(false);

  async function remove(proof: GoogleProof) {
    if (!confirmed || working.current) return;
    working.current = true;
    setPending(true);
    onPendingChange(true);
    setFeedback('');
    try {
      await onDelete(proof);
    } catch (error) {
      const key = error instanceof ApiError && error.code
        ? googleErrorMessage(error)
        : error instanceof ApiError && error.status === 401
          ? 'errors.sessionExpired'
          : 'account.deleteFailed';
      setFeedback(t(key));
    } finally {
      working.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <Form className="sheet-form account-deletion-form" onSubmit={(event) => event.preventDefault()}>
      {email && <strong className="deletion-email">{email}</strong>}
      <p className="deletion-note">{t('account.deleteWarning')}</p>
      <p className="field-hint">{t('google.deleteHint')}</p>
      <CheckboxField
        className="deletion-confirmation"
        name="confirm-google-delete"
        required
        checked={confirmed}
        disabled={pending}
        onChange={(event) => {
          setConfirmed(event.target.checked);
          setFeedback('');
        }}
      >
        {t('account.confirmDelete')}
      </CheckboxField>
      <GoogleSignInButton purpose="delete" disabled={!confirmed || pending} onCredential={remove} />
      {feedback && <p className="form-error" role="alert">{feedback}</p>}
      {onCancel && (
        <button className="plain-link" type="button" disabled={pending} onClick={onCancel}>
          {t('common.cancel')}
        </button>
      )}
    </Form>
  );
}

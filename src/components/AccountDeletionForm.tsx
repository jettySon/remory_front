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
        error instanceof ApiError && error.message
          ? error.message
          : '계정 삭제 결과를 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.',
      );
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  return (
    <form
      className="sheet-form account-deletion-form"
      method="post"
      onSubmit={submit}
      onInput={() => setFeedback('')}
    >
      {email && <strong className="deletion-email">{email}</strong>}
      <p className="deletion-note">회원탈퇴하면 계정과 저장한 덱, 카드, 복습 기록이 영구 삭제돼요.</p>
      {!email && (
        <label>
          가입 이메일
          <input
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
        비밀번호
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          maxLength={72}
          autoFocus={Boolean(email)}
          required
          disabled={pending}
        />
      </label>
      <label className="deletion-confirmation">
        <input type="checkbox" name="confirm" required disabled={pending} />
        삭제 내용을 확인했어요.
      </label>
      {feedback && (
        <p className="form-error" role="alert">
          {feedback}
        </p>
      )}
      <div className="account-deletion-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={pending}>
            취소
          </button>
        )}
        <button type="submit" className="account-deletion-submit" disabled={pending}>
          <UserRoundX size={17} aria-hidden="true" /> {pending ? '삭제하는 중…' : '계정과 데이터 삭제'}
        </button>
      </div>
    </form>
  );
}

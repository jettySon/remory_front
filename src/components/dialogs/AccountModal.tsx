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
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState('');
  const working = useRef(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  const action = isReset ? '재설정 링크 받기' : isSignup ? '회원가입' : '로그인';

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
      setFeedback(error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.');
    } finally {
      working.current = false;
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isReset) {
      setFeedback('재설정 이메일 기능은 아직 준비 중이에요.');
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
      <Modal title="내 계정" onClose={close}>
        <div className="account-intro">
          <p>
            <strong>{account.email}</strong>
            <br />
            학습 기록을 계정에 저장해요.
          </p>
          <Mascot className="account-mascot" />
        </div>
        <button className="big-primary" type="button" disabled={pending} onClick={() => void run(onLogout)}>
          {pending ? '로그아웃 중…' : '로그아웃'}
        </button>
        {feedback && (
          <p className="account-feedback" role="alert">
            {feedback}
          </p>
        )}
      </Modal>
    );

  return (
    <Modal title={isReset ? '비밀번호 재설정' : '리모리 계정'} onClose={close}>
      <div className="account-intro">
        <p>
          <strong>학습 기록을 계정에 저장해요</strong>
          <br />
          {guestPending
            ? '로그인하면 이 기기의 학습 기록을 가져와요.'
            : '로그인하면 저장한 덱과 복습 기록을 이어 볼 수 있어요.'}
        </p>
        <Mascot className="account-mascot" />
      </div>
      {isReset ? (
        <p className="account-reset-guide">가입할 때 사용한 이메일을 입력해 주세요.</p>
      ) : (
        <div className="entry-modes account-modes" role="group" aria-label="계정 메뉴">
          <button
            type="button"
            aria-pressed={!isSignup}
            disabled={pending}
            onClick={() => changeMode('login')}
          >
            로그인
          </button>
          <button
            type="button"
            aria-pressed={isSignup}
            disabled={pending}
            onClick={() => changeMode('signup')}
          >
            회원가입
          </button>
        </div>
      )}
      <form key={mode} className="sheet-form account-form" onInput={() => setFeedback('')} onSubmit={submit}>
        <label>
          이메일
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
            <label htmlFor="account-password">비밀번호</label>
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
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
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
                비밀번호를 8자 이상 입력해 주세요.
              </span>
            )}
          </div>
        )}
        <button type="submit" className="big-primary form-submit" disabled={pending}>
          {pending ? '연결 중…' : action} <ArrowRight size={18} aria-hidden="true" />
        </button>
        {feedback && (
          <p className="account-feedback" role={isReset ? 'status' : 'alert'}>
            {feedback}
          </p>
        )}
      </form>
      {isReset ? (
        <button className="account-help-link" type="button" onClick={() => changeMode('login')}>
          <ArrowLeft size={15} aria-hidden="true" /> 로그인으로 돌아가기
        </button>
      ) : (
        mode === 'login' && (
          <button className="account-help-link" type="button" onClick={() => changeMode('reset')}>
            비밀번호를 잊었나요?
          </button>
        )
      )}
    </Modal>
  );
}

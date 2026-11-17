import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Mascot } from '../Illustrations';
import { Modal } from '../Modal';

export function AccountModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';
  const action = isReset ? '재설정 링크 받기' : isSignup ? '회원가입' : '로그인';

  function changeMode(next: typeof mode) {
    if (mode === next) return;
    setMode(next);
    setShowPassword(false);
    setSubmitted(false);
  }

  return (
    <Modal title={isReset ? '비밀번호 재설정' : '리모리 계정'} onClose={onClose}>
      <div className="account-intro">
        <p>
          <strong>계정 화면 미리보기</strong>
          <br />
          입력한 정보는 전송·저장되지 않아요.
        </p>
        <Mascot className="account-mascot" />
      </div>
      {isReset ? (
        <p className="account-reset-guide">가입할 때 사용한 이메일을 입력해 주세요.</p>
      ) : (
        <div className="entry-modes account-modes" role="group" aria-label="계정 메뉴">
          <button type="button" aria-pressed={!isSignup} onClick={() => changeMode('login')}>
            로그인
          </button>
          <button type="button" aria-pressed={isSignup} onClick={() => changeMode('signup')}>
            회원가입
          </button>
        </div>
      )}
      <form
        key={mode}
        className="sheet-form"
        onInput={() => setSubmitted(false)}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <label>
          이메일
          <input
            type="email"
            name="email"
            autoComplete="email"
            autoCapitalize="none"
            autoFocus
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
        <button type="submit" className="big-primary form-submit">
          {action} <ArrowRight size={18} aria-hidden="true" />
        </button>
        {submitted && (
          <p className="account-feedback" role="status">
            {isReset
              ? '미리보기에서는 재설정 이메일을 보내지 않아요.'
              : `미리보기에서는 실제 ${action}이 이루어지지 않아요.`}
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

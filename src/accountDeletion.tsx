import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, UserRoundX } from 'lucide-react';
import { deleteAccountFromWeb } from './api/account';
import { readSession, rememberSession } from './api/session';
import { AccountDeletionForm } from './components/AccountDeletionForm';
import { useStoredState } from './hooks/useStoredState';
import './styles.css';

function AccountDeletionPage() {
  const [theme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  const [deleted, setDeleted] = useState(false);

  async function withdraw(email: string, password: string) {
    await deleteAccountFromWeb(email, password);
    if (readSession()?.account.email === email.trim().toLowerCase()) rememberSession(null);
    setDeleted(true);
  }

  return (
    <div className="site-background" data-theme={theme}>
      <main className="phone-shell account-deletion-page">
        <div className="page">
          <a className="back-link deletion-back" href="/">
            <ArrowLeft size={18} aria-hidden="true" /> 리모리 홈
          </a>
          <div className="page-heading">
            <h1>리모리 계정 삭제</h1>
            <span className="settings-option-icon" aria-hidden="true">
              <UserRoundX size={19} />
            </span>
          </div>
          {deleted ? (
            <p className="deletion-note" role="status">
              회원탈퇴가 완료됐어요.
            </p>
          ) : (
            <AccountDeletionForm onDelete={withdraw} />
          )}
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountDeletionPage />
  </StrictMode>,
);

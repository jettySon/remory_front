import { LanguageProvider, useLanguage } from './i18n/LanguageProvider';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, UserRoundX } from 'lucide-react';
import { deleteAccountFromWeb } from './api/account';
import { readSession, rememberSession } from './api/session';
import { LanguageField } from './components/LanguageField';
import { AccountDeletionForm } from './components/AccountDeletionForm';
import { useStoredState } from './hooks/useStoredState';
import './styles.css';

function AccountDeletionPage() {
  const { t } = useLanguage();
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
            <ArrowLeft size={18} aria-hidden="true" /> {t('account.homeLink')}
          </a>
          <div className="page-heading">
            <h1>{t('account.deletePage')}</h1>
            <span className="settings-option-icon" aria-hidden="true">
              <UserRoundX size={19} />
            </span>
          </div>
          <div className="deletion-language"><LanguageField /></div>
          {deleted ? (
            <p className="deletion-note" role="status">
              {t('account.deleteSuccess')}
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
    <LanguageProvider title="account.deletePage">
      <AccountDeletionPage />
    </LanguageProvider>
  </StrictMode>,
);

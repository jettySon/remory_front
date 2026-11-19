import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { LanguageProvider, useLanguage } from './i18n/LanguageProvider';
import { useStoredState } from './hooks/useStoredState';
import { LanguageField } from './components/LanguageField';
import { PasswordResetRequest } from './components/PasswordResetRequest';
import './styles.css';

// Retire any old reset-link fragments; the current flow uses codes inside the app.
if (window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search);

function PasswordResetPage() {
  const { t } = useLanguage();
  const [theme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  return (
    <div className="site-background" data-theme={theme}>
      <main className="phone-shell password-reset-page">
        <div className="page">
          <a className="back-link deletion-back" href="/"><ArrowLeft size={18} aria-hidden="true" /> {t('account.homeLink')}</a>
          <div className="page-heading">
            <h1>{t('account.reset')}</h1>
            <span className="settings-option-icon" aria-hidden="true"><KeyRound size={19} /></span>
          </div>
          <div className="deletion-language"><LanguageField /></div>
          <PasswordResetRequest />
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><LanguageProvider title="account.reset"><PasswordResetPage /></LanguageProvider></StrictMode>,
);

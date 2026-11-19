import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useStoredState } from '../hooks/useStoredState';
import { LanguageField } from '../components/LanguageField';
import { PrivacyDocument } from './PrivacyDocument';
import { privacyCopies } from './content';
import { privacyConfig } from './config';

// This public page must not restore a session, load Google sign-in, or request account data.
export function PrivacyPage() {
  const { locale, t } = useLanguage();
  const [theme] = useStoredState<'light' | 'dark'>('remory-theme', 'light');
  return (
    <div className="site-background privacy-background" data-theme={theme}>
      <main className="privacy-paper">
        <div className="privacy-toolbar">
          <a className="back-link" href="/"><ArrowLeft size={18} aria-hidden="true" />{t('account.homeLink')}</a>
          <LanguageField />
        </div>
        <div className="privacy-brand" aria-hidden="true"><ShieldCheck size={24} /></div>
        <PrivacyDocument copy={privacyCopies[locale]} config={privacyConfig} />
      </main>
    </div>
  );
}

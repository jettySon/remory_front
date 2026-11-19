import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LanguageProvider } from './i18n/LanguageProvider';
import { PrivacyPage } from './privacy/PrivacyPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><LanguageProvider title="privacy.title"><PrivacyPage /></LanguageProvider></StrictMode>,
);

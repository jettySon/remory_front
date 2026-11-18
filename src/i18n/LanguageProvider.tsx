import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useStoredState } from '../hooks/useStoredState';
import { languages, translators, type Locale, type MessageKey, type Translate } from './messages';

const LanguageContext = createContext<{
  locale: Locale;
  t: Translate;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function LanguageProvider({ children, title = 'app.title' }: { children: ReactNode; title?: MessageKey }) {
  const [preference, setLocale] = useStoredState<Locale>('remory-locale', 'ko');
  const locale = languages.some((language) => language.value === preference) ? preference : 'ko';
  const t = translators[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(title);
  }, [locale, t, title]);

  return <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const language = useContext(LanguageContext);
  if (!language) throw new Error('useLanguage requires LanguageProvider');
  return language;
}

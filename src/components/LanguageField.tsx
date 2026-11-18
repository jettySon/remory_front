import { useLanguage } from '../i18n/LanguageProvider';
import { languages } from '../i18n/messages';
import SelectField from './SelectField';

export function LanguageField() {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div className="language-setting">
      <SelectField label={t('settings.language')} value={locale} options={languages} onChange={setLocale} />
    </div>
  );
}

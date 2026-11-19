import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { GuestImportPreference } from '../study/guestData';

export function GuestImportOptions({ value, onChange, disabled }: {
  value: GuestImportPreference;
  onChange: (value: GuestImportPreference) => void;
  disabled: boolean;
}) {
  const { t } = useLanguage();
  const name = useId();
  return (
    <fieldset className="guest-import-options" disabled={disabled}>
      <legend>{t('account.guestChoiceTitle')}</legend>
      {(['keep', 'import'] as const).map((choice) => (
        <label key={choice} className="guest-import-option">
          <input type="radio" name={name} value={choice} checked={value === choice} autoFocus={value === choice}
            onChange={() => onChange(choice)} />
          <span>
            <strong>{t(choice === 'import' ? 'account.guestImport' : 'account.guestKeep')}</strong>
            <small>{t(choice === 'import' ? 'account.guestImportHint' : 'account.guestKeepHint')}</small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

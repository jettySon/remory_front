import { useLanguage } from '../../i18n/LanguageProvider';
import { ChevronRight, Languages, Moon, UserRoundX } from 'lucide-react';
import { LanguageField } from '../LanguageField';
import { Modal } from '../Modal';

export function SettingsModal({
  dark,
  onToggleDark,
  onWithdraw,
  onClose,
}: {
  dark: boolean;
  onToggleDark: () => void;
  onWithdraw?: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Modal title={t('settings.title')} onClose={onClose}>
      <div className="settings-options">
        <button
          className="settings-option"
          type="button"
          role="switch"
          aria-checked={dark}
          autoFocus
          onClick={onToggleDark}
        >
          <span className="settings-option-icon" aria-hidden="true">
            <Moon size={19} />
          </span>
          <span className="settings-option-label">{t('settings.dark')}</span>
          <span className="settings-switch" aria-hidden="true" />
        </button>
        <div className="settings-option settings-language">
          <span className="settings-option-icon" aria-hidden="true">
            <Languages size={19} />
          </span>
          <LanguageField />
        </div>
        {onWithdraw && (
          <button className="settings-option settings-withdraw" type="button" onClick={onWithdraw}>
            <span className="settings-option-icon" aria-hidden="true">
              <UserRoundX size={19} />
            </span>
            <span className="settings-option-label">{t('account.delete')}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </Modal>
  );
}

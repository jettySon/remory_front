import { Moon } from 'lucide-react';
import { Modal } from '../Modal';

export function SettingsModal({
  dark,
  onToggleDark,
  onClose,
}: {
  dark: boolean;
  onToggleDark: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="설정" onClose={onClose}>
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
          <span className="settings-option-label">다크 모드</span>
          <span className="settings-switch" aria-hidden="true" />
        </button>
      </div>
    </Modal>
  );
}

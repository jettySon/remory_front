import { ChevronRight, Moon, UserRoundX } from 'lucide-react';
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
        {onWithdraw && (
          <button className="settings-option settings-withdraw" type="button" onClick={onWithdraw}>
            <span className="settings-option-icon" aria-hidden="true">
              <UserRoundX size={19} />
            </span>
            <span className="settings-option-label">회원탈퇴</span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </Modal>
  );
}

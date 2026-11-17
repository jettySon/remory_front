import { Trash2 } from 'lucide-react';
import type { StudyCard } from '../../types';
import { Modal } from '../Modal';

export function DeleteCardModal({
  card,
  saving,
  onClose,
  onDelete,
}: {
  card: StudyCard;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal title="카드 삭제" onClose={onClose}>
      <div className="card-delete-dialog">
        <strong>{card.front}</strong>
        <p>카드와 이 카드의 복습 기록이 함께 삭제돼요.</p>
        <div className="card-delete-actions">
          <button type="button" autoFocus disabled={saving} onClick={onClose}>
            취소
          </button>
          <button className="card-delete-confirm" type="button" disabled={saving} onClick={onDelete}>
            <Trash2 size={17} aria-hidden="true" /> {saving ? '삭제하는 중…' : '카드 삭제'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

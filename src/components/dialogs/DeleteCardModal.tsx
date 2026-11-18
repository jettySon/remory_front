import { useLanguage } from '../../i18n/LanguageProvider';
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
  const { t } = useLanguage();
  return (
    <Modal title={t('cards.delete')} onClose={onClose}>
      <div className="card-delete-dialog">
        <strong>{card.front}</strong>
        <p>{t('cards.deleteWarning')}</p>
        <div className="card-delete-actions">
          <button type="button" autoFocus disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="card-delete-confirm" type="button" disabled={saving} onClick={onDelete}>
            <Trash2 size={17} aria-hidden="true" /> {saving ? t('cards.deleting') : t('cards.delete')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

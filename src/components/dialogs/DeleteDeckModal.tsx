import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Modal } from '../Modal';
import { DeckIcon } from '../DeckVisuals';
import type { Deck } from '../../types';

export function DeleteDeckModal({ deck, count, saving, onClose, onDelete }: {
  deck: Deck;
  count: number;
  saving: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return <Modal title={t('decks.delete')} onClose={onClose}>
    <div className="card-delete-dialog">
      <div className={`deck-delete-preview deck-theme-preview ${deck.theme}`}>
        <DeckIcon icon={deck.icon} />
        <span><strong>{deck.title}</strong><small>{t('common.cards', { count })}</small></span>
      </div>
      <p>{t('decks.deleteWarning', { count })}</p>
      <div className="card-delete-actions">
        <button type="button" autoFocus disabled={saving} onClick={onClose}>{t('common.cancel')}</button>
        <button className="card-delete-confirm" type="button" disabled={saving} onClick={onDelete}>
          <Trash2 size={17} aria-hidden="true" /> {t(saving ? 'cards.deleting' : 'decks.delete')}
        </button>
      </div>
    </div>
  </Modal>;
}

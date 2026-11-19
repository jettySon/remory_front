import { useLanguage } from '../../i18n/LanguageProvider';
import { Modal } from '../Modal';
import { DeckForm } from './DeckForm';
import type { Deck, DeckContent } from '../../types';

export function EditDeckModal({ deck, saving, onClose, onSave }: {
  deck: Deck;
  saving: boolean;
  onClose: () => void;
  onSave: (content: DeckContent) => void;
}) {
  const { t } = useLanguage();
  return <Modal title={t('decks.edit')} onClose={onClose}>
    <DeckForm deck={deck} saving={saving} onSave={({ title, subtitle, theme }) => onSave({ title, subtitle, theme })} />
  </Modal>;
}

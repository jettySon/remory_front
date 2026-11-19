import { useLanguage } from '../../i18n/LanguageProvider';
import { Modal } from '../Modal';
import { DeckForm } from './DeckForm';
import type { DeckTheme } from '../../types';

export function CreateDeckModal({ onClose, onCreate, saving }: {
  onClose: () => void;
  saving: boolean;
  onCreate: (title: string, subtitle: string, theme: DeckTheme, icon: string) => void;
}) {
  const { t } = useLanguage();
  return <Modal title={t('decks.new')} onClose={onClose}>
    <DeckForm saving={saving} onSave={({ title, subtitle, theme, icon }) => onCreate(title, subtitle, theme, icon)} />
  </Modal>;
}

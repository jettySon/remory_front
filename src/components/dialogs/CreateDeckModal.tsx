import { Form, Field } from '../Form';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { DeckIcon } from '../DeckVisuals';
import { Modal } from '../Modal';
import SelectField from '../SelectField';
import { deckKinds, themeLabels } from '../../study/decks';
import type { DeckTheme } from '../../types';

export function CreateDeckModal({
  onClose,
  onCreate,
  saving,
}: {
  onClose: () => void;
  saving: boolean;
  onCreate: (title: string, subtitle: string, theme: DeckTheme, icon: string) => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [kind, setKind] = useState<(typeof deckKinds)[number]>(deckKinds[3]);
  const [theme, setTheme] = useState<DeckTheme>(kind.theme);
  return (
    <Modal title={t('decks.new')} onClose={onClose}>
      <Form
        className="sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onCreate(title.trim(), subtitle.trim(), theme, kind.icon);
        }}
      >
        <label>
          {t('decks.name')}
          <Field autoFocus required maxLength={35} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          {t('decks.description')}
          <Field maxLength={70} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <SelectField
          label={t('decks.kind')}
          value={kind.icon}
          options={deckKinds.map((item) => ({ value: item.icon, label: t(item.label) }))}
          onChange={(icon) => {
            const next = deckKinds.find((item) => item.icon === icon) ?? deckKinds[3];
            setKind(next);
            setTheme(next.theme);
          }}
        />
        <span className="form-label">{t('decks.color')}</span>
        <div className="color-choices">
          {(Object.keys(themeLabels) as DeckTheme[]).map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t(themeLabels[color])}
              aria-pressed={theme === color}
              className={`color-choice ${color} ${theme === color ? 'picked' : ''}`}
              onClick={() => setTheme(color)}
            >
              {theme === color && <Check size={22} />}
            </button>
          ))}
        </div>
        <div className={`deck-theme-preview ${theme}`}>
          <DeckIcon icon={kind.icon} />
          {title.trim() || t(kind.label)}
        </div>
        <button className="big-primary form-submit" disabled={saving}>
          {t('decks.create')} <ArrowRight size={18} />
        </button>
      </Form>
    </Modal>
  );
}

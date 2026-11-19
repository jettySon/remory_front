import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageProvider';
import { Form, Field } from '../Form';
import { DeckIcon } from '../DeckVisuals';
import SelectField from '../SelectField';
import { deckKinds, themeLabels } from '../../study/decks';
import type { Deck, DeckTheme } from '../../types';

type DeckDraft = Omit<Deck, 'id'>;

export function DeckForm({ deck, saving, onSave }: {
  deck?: Deck;
  saving: boolean;
  onSave: (draft: DeckDraft) => void;
}) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(deck?.title ?? '');
  const [subtitle, setSubtitle] = useState(deck?.subtitle ?? '');
  const [icon, setIcon] = useState(deck?.icon ?? 'book');
  const [theme, setTheme] = useState<DeckTheme>(deck?.theme ?? 'blue');
  const kind = deckKinds.find((item) => item.icon === icon) ?? deckKinds[3];

  return (
    <Form className="sheet-form" onSubmit={(event) => {
      event.preventDefault();
      if (!saving && title.trim()) onSave({ title: title.trim(), subtitle: subtitle.trim(), theme, icon });
    }}>
      <fieldset className="deck-form-fields" disabled={saving}>
        <label>
          {t('decks.name')}
          <Field autoFocus required maxLength={35} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          {t('decks.description')}
          <Field maxLength={70} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
        </label>
        {!deck && <SelectField
          label={t('decks.kind')}
          value={icon}
          options={deckKinds.map((item) => ({ value: item.icon, label: t(item.label) }))}
          onChange={(nextIcon) => {
            const next = deckKinds.find((item) => item.icon === nextIcon) ?? deckKinds[3];
            setIcon(next.icon);
            setTheme(next.theme);
          }}
        />}
        <div role="group" aria-label={t('decks.color')}>
          <span className="form-label">{t('decks.color')}</span>
          <div className="color-choices">
            {(Object.keys(themeLabels) as DeckTheme[]).map((color) => (
              <button key={color} type="button" aria-label={t(themeLabels[color])}
                aria-pressed={theme === color} className={`color-choice ${color} ${theme === color ? 'picked' : ''}`}
                onClick={() => setTheme(color)}>
                {theme === color && <Check size={22} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
        <div className={`deck-theme-preview ${theme}`}>
          <DeckIcon icon={icon} />
          {title.trim() || t(kind.label)}
        </div>
      </fieldset>
      {deck && <p className="deck-edit-hint">{t('decks.editHint')}</p>}
      <button className="big-primary form-submit" type="submit" disabled={saving}>
        {saving ? t('cards.saving') : t(deck ? 'cards.saveChanges' : 'decks.create')}
        {deck ? <Check size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </Form>
  );
}

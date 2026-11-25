import { Form } from '../Form';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { makeCardEdit, readCardEditFields, validateDraft } from '../../study/cards';
import type { CardContent, DeckTheme, StudyCard } from '../../types';
import { Modal } from '../Modal';
import { CardFormFields } from './CardFormFields';

export function EditCardModal({
  card,
  theme,
  saving,
  onClose,
  onSave,
}: {
  card: StudyCard;
  theme?: DeckTheme;
  saving: boolean;
  onClose: () => void;
  onSave: (content: CardContent) => void;
}) {
  const { t } = useLanguage();
  const [{ kind, labels, values: original }] = useState(() => readCardEditFields(card));
  const [values, setValues] = useState(original);
  const [explanation, setExplanation] = useState(card.explanation ?? '');
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const issue = validateDraft(kind, values);
    if (issue) {
      setError(t(...issue));
      return;
    }
    onSave({ ...makeCardEdit(card, kind, values), explanation: explanation.trim() });
  }

  return (
    <Modal title={t('cards.edit')} onClose={onClose}>
      <Form className="sheet-form" onSubmit={submit} onInput={() => setError('')}>
        <CardFormFields
          kind={kind}
          labels={labels}
          values={values}
          onChange={setValues}
          explanation={explanation}
          onExplanationChange={setExplanation}
          saving={saving}
          theme={theme}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="big-primary form-submit" type="submit" disabled={saving}>
          {saving ? t('cards.saving') : t('cards.saveChanges')} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </Form>
    </Modal>
  );
}

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
  const [{ kind, labels, values: original }] = useState(() => readCardEditFields(card));
  const [values, setValues] = useState(original);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const issue = validateDraft(kind, values);
    if (issue) {
      setError(issue);
      return;
    }
    onSave(makeCardEdit(card, kind, values));
  }

  return (
    <Modal title="카드 수정" onClose={onClose}>
      <form className="sheet-form" onSubmit={submit} onInput={() => setError('')}>
        <CardFormFields
          kind={kind}
          labels={labels}
          values={values}
          onChange={setValues}
          saving={saving}
          theme={theme}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="big-primary form-submit" type="submit" disabled={saving}>
          {saving ? '저장하는 중…' : '변경사항 저장'} <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </Modal>
  );
}

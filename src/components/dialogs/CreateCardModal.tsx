import { Form, Field } from '../Form';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { CardFormFields } from './CardFormFields';
import { ExcelImportFields } from './ExcelImportFields';
import { Modal } from '../Modal';
import SelectField from '../SelectField';
import { useExcelImport } from '../../hooks/useExcelImport';
import { cardFields, makeDraft, validateDraft } from '../../study/cards';
import { deckKinds } from '../../study/decks';
import type { CardDraft, CardKind, Deck } from '../../types';

export function CreateCardModal({
  decks,
  defaultDeckId,
  onClose,
  onCreate,
  saving,
}: {
  decks: Deck[];
  defaultDeckId?: string;
  onClose: () => void;
  saving: boolean;
  onCreate: (deckId: string, drafts: CardDraft[]) => void;
}) {
  const { t } = useLanguage();
  const [deckId, setDeckId] = useState(defaultDeckId || decks[0]?.id || '');
  const deck = decks.find((item) => item.id === deckId);
  const defaultKind = (item?: Deck) => deckKinds.find((type) => type.icon === item?.icon)?.card ?? 'basic';
  const [kind, setKind] = useState<CardKind>(() => defaultKind(deck));
  const [values, setValues] = useState<string[]>([]);
  const [explanation, setExplanation] = useState('');
  const [bulk, setBulk] = useState(false);
  const [input, setInput] = useState('');
  const [source, setSource] = useState<'paste' | 'excel'>('paste');
  const [error, setError] = useState('');
  const fields = cardFields[kind].fields;
  const excel = source === 'excel';
  const excelImport = useExcelImport(kind);
  const { excelRows, reading, fileError, excelRowError } = excelImport;
  const rows = excel
    ? excelRows
    : input
        .split(/\r?\n/)
        .flatMap((line, index) => (line.trim() ? [{ line: index + 1, values: line.split('\t') }] : []));
  const preview = values.some((value) => value?.trim());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!deck || (bulk && excel && (reading || fileError || excelRowError))) return;
    const entries = bulk ? rows : [{ line: 1, values: fields.map((_, index) => values[index] ?? '') }];
    for (const entry of entries) {
      const issue = validateDraft(kind, entry.values);
      if (issue) {
        setError(bulk ? t('import.pasteRow', { line: entry.line, error: t(...issue) }) : t(...issue));
        return;
      }
    }
    const drafts = entries.map((entry) => makeDraft(kind, entry.values));
    const note = explanation.trim();
    if (!bulk && note) drafts[0].explanation = note;
    if (drafts.length) onCreate(deck.id, drafts);
  };
  return (
    <Modal title={t('cards.add')} onClose={onClose}>
      <Form className="sheet-form" onSubmit={submit} onInput={() => setError('')}>
        <SelectField
          label={t('nav.decks')}
          value={deckId}
          options={decks.map((item) => ({ value: item.id, label: item.title }))}
          onChange={(id) => {
            setDeckId(id);
            setError('');
            if (!preview && !input.trim()) setKind(defaultKind(decks.find((item) => item.id === id)));
          }}
        />
        <div className="entry-modes">
          <button
            type="button"
            aria-pressed={!bulk}
            onClick={() => {
              setBulk(false);
              setError('');
            }}
          >
            {t('import.manual')}
          </button>
          <button
            type="button"
            aria-pressed={bulk}
            onClick={() => {
              setBulk(true);
              setError('');
            }}
          >
            {t('import.bulk')}
          </button>
        </div>
        <SelectField
          label={t('cards.type')}
          value={kind}
          options={(Object.keys(cardFields) as CardKind[]).map((type) => ({
            value: type,
            label: t(cardFields[type].label),
          }))}
          onChange={(type) => {
            setKind(type);
            setError('');
          }}
        />
        {bulk ? (
          <div className="bulk-field">
            <div className="entry-modes bulk-sources" role="group" aria-label={t('import.method')}>
              <button
                type="button"
                aria-pressed={!excel}
                onClick={() => {
                  setSource('paste');
                  setError('');
                }}
              >
                {t('import.paste')}
              </button>
              <button
                type="button"
                aria-pressed={excel}
                onClick={() => {
                  setSource('excel');
                  setError('');
                }}
              >
                {t('import.excel')}
              </button>
            </div>
            {excel ? (
              <ExcelImportFields kind={kind} excelImport={excelImport} />
            ) : (
              <>
                <label htmlFor="bulk-cards">{t('import.fromSheet')}</label>
                <div id="bulk-cards-hint" className="field-hint">
                  <span>{t('import.pasteHint')}</span>
                  <span>
                    <strong>{t('import.order')}</strong> {fields.map((field) => t(field)).join(' → ')}
                  </span>
                </div>
                <Field as="textarea"
                  id="bulk-cards"
                  aria-describedby="bulk-cards-hint"
                  required
                  rows={5}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </>
            )}
          </div>
        ) : (
          <CardFormFields
            kind={kind}
            values={values}
            onChange={setValues}
            explanation={explanation}
            onExplanationChange={setExplanation}
            theme={deck?.theme}
            saving={saving}
          />
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="big-primary form-submit"
          disabled={
            saving ||
            !deck ||
            (bulk && (!rows.length || (excel && Boolean(reading || fileError || excelRowError))))
          }
        >
          {bulk ? t('import.submit', { count: excel && excelRowError ? 0 : rows.length }) : t('cards.save')}{' '}
          <ArrowRight size={18} />
        </button>
      </Form>
    </Modal>
  );
}

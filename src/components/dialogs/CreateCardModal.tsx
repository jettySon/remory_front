import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
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
}: {
  decks: Deck[];
  defaultDeckId?: string;
  onClose: () => void;
  onCreate: (deckId: string, drafts: CardDraft[]) => void;
}) {
  const [deckId, setDeckId] = useState(defaultDeckId || decks[0]?.id || '');
  const deck = decks.find((item) => item.id === deckId);
  const defaultKind = (item?: Deck) => deckKinds.find((type) => type.icon === item?.icon)?.card ?? 'basic';
  const [kind, setKind] = useState<CardKind>(() => defaultKind(deck));
  const [values, setValues] = useState<string[]>([]);
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
        setError(bulk ? `${entry.line}번째 줄 · ${issue}` : issue);
        return;
      }
    }
    if (entries.length)
      onCreate(
        deck.id,
        entries.map((entry) => makeDraft(kind, entry.values)),
      );
  };
  return (
    <Modal title="카드 추가" onClose={onClose}>
      <form className="sheet-form" onSubmit={submit} onInput={() => setError('')}>
        <SelectField
          label="학습 덱"
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
            직접 입력
          </button>
          <button
            type="button"
            aria-pressed={bulk}
            onClick={() => {
              setBulk(true);
              setError('');
            }}
          >
            일괄 등록
          </button>
        </div>
        <SelectField
          label="카드 유형"
          value={kind}
          options={(Object.keys(cardFields) as CardKind[]).map((type) => ({
            value: type,
            label: cardFields[type].label,
          }))}
          onChange={(type) => {
            setKind(type);
            setError('');
          }}
        />
        {bulk ? (
          <div className="bulk-field">
            <div className="entry-modes bulk-sources" role="group" aria-label="가져오기 방식">
              <button
                type="button"
                aria-pressed={!excel}
                onClick={() => {
                  setSource('paste');
                  setError('');
                }}
              >
                붙여넣기
              </button>
              <button
                type="button"
                aria-pressed={excel}
                onClick={() => {
                  setSource('excel');
                  setError('');
                }}
              >
                엑셀 파일
              </button>
            </div>
            {excel ? (
              <ExcelImportFields kind={kind} excelImport={excelImport} />
            ) : (
              <>
                <label htmlFor="bulk-cards">스프레드시트에서 붙여넣기</label>
                <div id="bulk-cards-hint" className="field-hint">
                  <span>열 제목을 빼고 복사해 주세요. 한 줄에 카드 한 장씩, 각 항목은 탭으로 구분해요.</span>
                  <span>
                    <strong>열 순서</strong> {fields.join(' → ')}
                  </span>
                </div>
                <textarea
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
          fields.map((field, index) => (
            <label key={field}>
              {field}
              <textarea
                required
                rows={index === 0 ? 2 : 1}
                value={values[index] ?? ''}
                onChange={(e) => {
                  const next = [...values];
                  next[index] = e.target.value;
                  setValues(next);
                }}
              />
            </label>
          ))
        )}
        {!bulk && preview && (
          <div className={`mini-preview ${deck?.theme ?? ''}`}>
            <small>미리보기 · {cardFields[kind].label}</small>
            <strong>{values[0]}</strong>
            {kind === 'choice' && <p>{values.slice(1, 4).filter(Boolean).join(' · ')}</p>}
            <p>{kind === 'cloze' ? values[0]?.replace('___', () => values[1] || '___') : values[1]}</p>
            {kind === 'word' && <p>{values[2]}</p>}
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="big-primary form-submit"
          disabled={
            !deck || (bulk && (!rows.length || (excel && Boolean(reading || fileError || excelRowError))))
          }
        >
          {bulk ? `${excel && excelRowError ? 0 : rows.length}장 등록하기` : '카드 저장'}{' '}
          <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}

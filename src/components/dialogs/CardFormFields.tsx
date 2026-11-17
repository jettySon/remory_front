import { cardFields } from '../../study/cards';
import type { CardKind, DeckTheme } from '../../types';

export function CardFormFields({
  kind,
  values,
  onChange,
  theme,
  labels = cardFields[kind].fields,
  saving = false,
}: {
  kind: CardKind;
  values: string[];
  onChange: (values: string[]) => void;
  theme?: DeckTheme;
  labels?: string[];
  saving?: boolean;
}) {
  return (
    <>
      {labels.map((label, index) => (
        <label key={label}>
          {label}
          <textarea
            required
            disabled={saving}
            rows={index === 0 ? 2 : 1}
            value={values[index] ?? ''}
            onChange={(e) => {
              const next = [...values];
              next[index] = e.target.value;
              onChange(next);
            }}
          />
        </label>
      ))}
      {values.some((value) => value?.trim()) && (
        <div className={`mini-preview ${theme ?? ''}`}>
          <small>미리보기 · {cardFields[kind].label}</small>
          <strong>{values[0]}</strong>
          {kind === 'choice' && <p>{values.slice(1, 4).filter(Boolean).join(' · ')}</p>}
          <p>{kind === 'cloze' ? values[0]?.replace('___', () => values[1] || '___') : values[1]}</p>
          {kind === 'word' && <p>{values[2]}</p>}
        </div>
      )}
    </>
  );
}

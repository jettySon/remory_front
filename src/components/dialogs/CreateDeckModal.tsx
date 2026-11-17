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
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [kind, setKind] = useState<(typeof deckKinds)[number]>(deckKinds[3]);
  const [theme, setTheme] = useState<DeckTheme>(kind.theme);
  return (
    <Modal title="새 덱 만들기" onClose={onClose}>
      <form
        className="sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) onCreate(title.trim(), subtitle.trim(), theme, kind.icon);
        }}
      >
        <label>
          학습 덱 이름
          <input autoFocus required maxLength={35} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          덱 설명 (선택)
          <input maxLength={70} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </label>
        <SelectField
          label="덱 유형"
          value={kind.icon}
          options={deckKinds.map((item) => ({ value: item.icon, label: item.label }))}
          onChange={(icon) => {
            const next = deckKinds.find((item) => item.icon === icon) ?? deckKinds[3];
            setKind(next);
            setTheme(next.theme);
          }}
        />
        <span className="form-label">덱 색상</span>
        <div className="color-choices">
          {(Object.keys(themeLabels) as DeckTheme[]).map((color) => (
            <button
              key={color}
              type="button"
              aria-label={themeLabels[color]}
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
          {title.trim() || kind.label}
        </div>
        <button className="big-primary form-submit" disabled={saving}>
          덱 만들기 <ArrowRight size={18} />
        </button>
      </form>
    </Modal>
  );
}

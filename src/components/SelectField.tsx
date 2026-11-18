import { useLanguage } from '../i18n/LanguageProvider';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type SelectFieldProps<Value extends string> = {
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string; lang?: string }>;
  onChange: (value: Value) => void;
};

export default function SelectField<Value extends string>({ label, value, options, onChange }: SelectFieldProps<Value>) {
  const { locale, t } = useLanguage();
  const id = useId();
  const fieldRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [opensUp, setOpensUp] = useState(false);
  const selectedIndex = options.findIndex(option => option.value === value);
  const open = activeIndex !== null;
  const listId = `${id}-options`;

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !fieldRef.current?.contains(event.target)) setActiveIndex(null);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  function openAt(index: number) {
    const field = fieldRef.current;
    const sheet = field?.closest('[role="dialog"]');
    if (field && sheet) {
      const bounds = field.getBoundingClientRect();
      const dialog = sheet.getBoundingClientRect();
      const below = Math.min(window.innerHeight, dialog.bottom) - bounds.bottom;
      const above = bounds.top - Math.max(0, dialog.top);
      setOpensUp(below < Math.min(244, options.length * 44 + 12) && above > below);
    }
    search.current = { text: '', time: 0 };
    setActiveIndex(index);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setActiveIndex(null);
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case 'Escape':
        if (!open) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(null);
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex === null) openAt(Math.max(selectedIndex, 0));
        else choose(activeIndex);
        return;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (activeIndex === null) openAt(selectedIndex < 0 && event.key === 'ArrowUp' ? options.length - 1 : Math.max(selectedIndex, 0));
        else setActiveIndex(Math.max(0, Math.min(options.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1))));
        return;
      case 'Home':
      case 'End': {
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : options.length - 1;
        if (open) setActiveIndex(index);
        else openAt(index);
        return;
      }
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
        const time = Date.now();
        const letter = event.key.toLocaleLowerCase(locale);
        const query = time - search.current.time < 650 ? search.current.text + letter : letter;
        const match = (text: string) => options.findIndex(option => option.label.toLocaleLowerCase(locale).startsWith(text));
        const index = match(query);
        const next = index < 0 ? match(letter) : index;
        if (next < 0) return;
        event.preventDefault();
        if (open) setActiveIndex(next);
        else openAt(next);
        search.current = { text: index < 0 ? letter : query, time };
      }
    }
  }

  return <div className="select-field">
    <label htmlFor={id} id={`${id}-label`}>{label}</label>
    <div className="select-control" ref={fieldRef}>
      <button
        type="button"
        className="select-trigger"
        id={id}
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        disabled={!options.length}
        onBlur={() => setActiveIndex(null)}
        onClick={() => open ? setActiveIndex(null) : openAt(Math.max(selectedIndex, 0))}
        onKeyDown={handleKey}
      >
        <span lang={options[selectedIndex]?.lang}>{options[selectedIndex]?.label ?? t('common.emptyOptions')}</span>
        <ChevronDown size={18} aria-hidden="true"/>
      </button>
      {open && <div className={`select-options ${opensUp ? 'opens-up' : ''}`} role="listbox" id={listId} aria-labelledby={`${id}-label`}>
        {options.map((option, index) => <div
          className={`select-option ${index === activeIndex ? 'active-option' : ''}`}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={option.value === value}
          key={option.value}
          ref={index === activeIndex ? activeRef : undefined}
          onPointerDown={event => event.preventDefault()}
          onClick={() => choose(index)}
        >
          <span lang={option.lang}>{option.label}</span>
          {option.value === value && <Check size={16} aria-hidden="true"/>}
        </div>)}
      </div>}
    </div>
  </div>;
}

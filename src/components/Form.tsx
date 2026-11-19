import {
  createContext,
  useContext,
  useId,
  useState,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Message } from '../i18n/messages';

type FormControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type FieldErrors = Record<string, Message>;
const FormContext = createContext<{ id: string; errors: FieldErrors } | null>(null);

function isFormControl(target: EventTarget | null): target is FormControl {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function fieldError(field: FormControl): Message | undefined {
  if (!field.willValidate) return;
  const checkbox = field instanceof HTMLInputElement && field.type === 'checkbox';
  const password = field instanceof HTMLInputElement && (field.type === 'password' || field.name === 'password');
  const value = password ? field.value : field.value.trim();

  if (field.validity.valueMissing || (field.required && !value && !checkbox)) {
    return [checkbox ? 'validation.checked' : 'validation.required'];
  }
  if (field.validity.typeMismatch && field instanceof HTMLInputElement && field.type === 'email') {
    return ['validation.email'];
  }
  // Check length explicitly so prefilled and programmatically updated values use the same rules.
  if (!(field instanceof HTMLSelectElement) && value && field.minLength > 0 && field.value.length < field.minLength) {
    return ['validation.minLength', { count: field.minLength }];
  }
  if (!(field instanceof HTMLSelectElement) && field.maxLength >= 0 && field.value.length > field.maxLength) {
    return ['validation.maxLength', { count: field.maxLength }];
  }
  if (!field.validity.valid) return ['validation.invalid'];
}

export function Form({ children, onSubmit, onInput, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const id = useId();
  const [errors, setErrors] = useState<FieldErrors>({});

  return (
    <FormContext.Provider value={{ id, errors }}>
      <form
        {...props}
        noValidate
        onSubmit={(event) => {
          const next: FieldErrors = {};
          let firstInvalid: FormControl | undefined;
          for (const field of Array.from(event.currentTarget.elements)) {
            if (!isFormControl(field)) continue;
            const message = fieldError(field);
            if (!message) continue;
            next[field.name || field.id] = message;
            firstInvalid ??= field;
          }
          setErrors(next);
          if (firstInvalid) {
            event.preventDefault();
            firstInvalid.focus();
            return;
          }
          onSubmit?.(event);
        }}
        onInput={(event) => {
          const field = event.target;
          if (isFormControl(field)) {
            const name = field.name || field.id;
            if (errors[name]) {
              const message = fieldError(field);
              setErrors((current) => {
                const next = { ...current };
                if (message) next[name] = message;
                else delete next[name];
                return next;
              });
            }
          }
          onInput?.(event);
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const form = useContext(FormContext);
  const { t } = useLanguage();
  const message = form?.errors[name];
  if (!message) return null;
  return (
    <span className="field-error" id={`${form.id}-${name}-error`} role="alert">
      <CircleAlert size={14} aria-hidden="true" />
      <span>{t(...message)}</span>
    </span>
  );
}

type FieldProps =
  | (InputHTMLAttributes<HTMLInputElement> & { as?: 'input' })
  | (TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' });

export function Field(props: FieldProps) {
  const generatedId = useId();
  const form = useContext(FormContext);
  const id = props.id ?? generatedId;
  const name = props.name ?? id;
  const invalid = Boolean(form?.errors[name]);
  const errorId = invalid ? `${form?.id}-${name}-error` : undefined;
  const attributes = {
    id,
    name,
    'aria-invalid': invalid || undefined,
    'aria-describedby': [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined,
  };

  let control;
  if (props.as === 'textarea') {
    const { as: _as, ...textareaProps } = props;
    control = <textarea {...textareaProps} {...attributes} />;
  } else {
    const { as: _as, ...inputProps } = props;
    control = <input {...inputProps} {...attributes} />;
  }

  return (
    <span className="form-field">
      {control}
      <FieldError name={name} />
    </span>
  );
}

export function CheckboxField({
  children,
  className,
  name,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'name'> & { name: string; children: ReactNode }) {
  const form = useContext(FormContext);
  const invalid = Boolean(form?.errors[name]);
  const errorId = invalid ? `${form?.id}-${name}-error` : undefined;
  return (
    <div className="form-field">
      <label className={className}>
        <input
          {...props}
          name={name}
          type="checkbox"
          aria-invalid={invalid || undefined}
          aria-describedby={[props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined}
        />
        {children}
      </label>
      <FieldError name={name} />
    </div>
  );
}

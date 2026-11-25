import { useRef, useState, type FormEvent } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';

export function ReviewAnswerInput({ onCompare, onReveal }: {
  onCompare: (answer: string) => void;
  onReveal: () => void;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const composing = useRef(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const answer = value.trim();
    if (answer && !composing.current) onCompare(answer);
  }

  return (
    <form className="review-answer-form" onSubmit={submit}>
      <div className="review-answer-row">
        <input
          type="text"
          aria-label={t('review.typeAnswer')}
          placeholder={t('review.typeAnswerPlaceholder')}
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          dir="auto"
        />
        <button className="big-primary review-compare-answer" type="submit" disabled={!value.trim()}>
          {t('review.compareAnswer')}
        </button>
      </div>
      <button className="review-skip-answer" type="button" onClick={onReveal}>
        {t('review.revealWithoutAnswer')}
      </button>
    </form>
  );
}

function normalizeAnswer(answer: string) {
  return answer.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function ReviewAnswerFeedback({ id, answer, expected, context }: {
  id: string;
  answer: string;
  expected: string;
  context?: string;
}) {
  const { t } = useLanguage();
  const matches = normalizeAnswer(answer) === normalizeAnswer(expected);
  return (
    <span className="review-answer-feedback" id={id}>
      {context && <span className="review-answer-context" dir="auto">{context}</span>}
      <span className="review-entered-answer" dir="auto">{t('review.enteredAnswer', { answer })}</span>
      <span className="review-answer-result">{t(matches ? 'review.answerMatches' : 'review.answerDiffers')}</span>
    </span>
  );
}

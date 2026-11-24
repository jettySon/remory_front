import { CalendarDays, ChartNoAxesColumn, Flower2, Layers3, Repeat2, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import type { ReviewMode } from '../types';
import { Mascot } from './Illustrations';

type Props = {
  deckTitle?: string;
  total: number;
  missedCount: number;
  mode: ReviewMode;
  saving: boolean;
  onMissedPractice: () => void;
  onCalendar: () => void;
  onRemaining: () => void;
  onStats: () => void;
  onFreeReview: () => void;
};

export function ReviewCompletion({
  deckTitle, total, missedCount, mode, saving, onMissedPractice, onCalendar, onRemaining, onStats, onFreeReview,
}: Props) {
  const { t } = useLanguage();
  const canRetry = mode === 'scheduled' && missedCount > 0;
  const primary = canRetry
    ? { label: t('review.retryMissed', { count: missedCount }), icon: RotateCcw, run: onMissedPractice }
    : { label: t('review.openCalendar'), icon: CalendarDays, run: onCalendar };
  const shortcuts = {
    scheduled: [
      { label: t('review.checkRemaining'), icon: Layers3, run: onRemaining },
      { label: t('review.free'), icon: Repeat2, run: onFreeReview },
    ],
    focus: [{ label: t('stats.title'), icon: ChartNoAxesColumn, run: onStats }],
    free: [{ label: t('review.freePick'), icon: Repeat2, run: onFreeReview }],
  }[mode];
  if (canRetry) shortcuts.unshift({ label: t('nav.calendar'), icon: CalendarDays, run: onCalendar });

  return (
    <div className="page completion">
      <div className="completion-art" aria-hidden="true">
        <div className="completion-orb" />
        <span className="float-star one">✦</span>
        <span className="float-star two">✧</span>
        <Mascot />
      </div>
      {deckTitle && <p className="review-deck-name">{deckTitle}</p>}
      <h1>{t(`review.completed.${mode}`)}</h1>
      <div className="completion-reward">
        <Flower2 size={19} aria-hidden="true" />
        <span>{t('review.completedCount', { count: total })}</span>
        <Sparkles size={15} aria-hidden="true" />
      </div>
      <div className="completion-actions">
        <button className="big-primary completion-primary" type="button" onClick={primary.run} disabled={saving}>
          <primary.icon size={18} aria-hidden="true" />
          {primary.label}
        </button>
        <div className="completion-shortcuts">
          {shortcuts.map(({ label, icon: Icon, run }) => (
            <button className="completion-shortcut" type="button" key={label} onClick={run} disabled={saving}>
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

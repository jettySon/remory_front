import { useLanguage } from '../i18n/LanguageProvider';
import type { ReviewLog } from '../types';

export function CardReviewHistory({ review }: { review?: ReviewLog }) {
  const { locale, t } = useLanguage();
  if (!review) return <span className="card-review-history">{t('review.firstStudy')}</span>;

  const date = new Date(review.date);
  const now = new Date(Date.now());
  // 현지 날짜로 비교해 자정이나 서머타임을 지나도 '어제'를 정확히 표시한다.
  const day = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const days = Math.max(0, Math.round((day(now) - day(date)) / 86_400_000));
  const when = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  const exactTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);

  return (
    <span className="card-review-history" title={exactTime}>
      <time dateTime={review.date}>{t('review.studiedAgo', { when })}</time>
      {' · '}{t(`review.rating.${review.rating}`)}
    </span>
  );
}

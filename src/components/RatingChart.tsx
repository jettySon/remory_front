import { useLanguage } from '../i18n/LanguageProvider';
import { reviewRatings, type RatingCounts } from '../study/insights';

export function RatingLegend() {
  const { t } = useLanguage();
  return (
    <ul className="rating-legend" aria-label={t('stats.ratingLegend')}>
      {reviewRatings.map((rating) => (
        <li key={rating}>
          <i className={`rating-segment ${rating}`} />
          {t(`review.rating.${rating}`)}
        </li>
      ))}
    </ul>
  );
}

export function RatingChart({ counts, vertical = false }: { counts: RatingCounts; vertical?: boolean }) {
  const { t, locale } = useLanguage();
  const label = new Intl.ListFormat(locale).format(
    reviewRatings.map((rating) => t('stats.ratingCount', { rating: t(`review.rating.${rating}`), count: counts[rating] })),
  );
  return (
    <div className={`rating-chart ${vertical ? 'vertical' : ''}`} role="img" aria-label={label} title={label}>
      {reviewRatings.map(
        (rating) =>
          counts[rating] > 0 && (
            <span className={`rating-segment ${rating}`} key={rating} style={{ flexGrow: counts[rating] }} />
          ),
      )}
    </div>
  );
}

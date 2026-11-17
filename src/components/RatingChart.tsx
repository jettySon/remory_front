import { reviewRatings, type RatingCounts } from '../study/insights';
import { ratingLabels } from '../study/review';

export function RatingLegend() {
  return (
    <ul className="rating-legend" aria-label="평가 범례">
      {reviewRatings.map((rating) => (
        <li key={rating}>
          <i className={`rating-segment ${rating}`} />
          {ratingLabels[rating]}
        </li>
      ))}
    </ul>
  );
}

export function RatingChart({ counts, vertical = false }: { counts: RatingCounts; vertical?: boolean }) {
  const label = reviewRatings.map((rating) => `${ratingLabels[rating]} ${counts[rating]}회`).join(', ');
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

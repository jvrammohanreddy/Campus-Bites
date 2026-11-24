export default function RatingSummary({ average, count = 0, className = '' }) {
  const rating = Number(average);
  const hasRatings = Number.isFinite(rating) && count > 0;
  const label = hasRatings
    ? `${rating.toFixed(1)} out of 5 from ${count} ${count === 1 ? 'rating' : 'ratings'}`
    : 'No ratings yet';

  return (
    <span className={`rating-summary ${className}`.trim()} aria-label={label}>
      {hasRatings ? (
        <>
          <span aria-hidden="true">★ {rating.toFixed(1)}</span>
          <span className="rating-summary__count">
            · {count} {count === 1 ? 'rating' : 'ratings'}
          </span>
        </>
      ) : (
        <span>No ratings yet</span>
      )}
    </span>
  );
}

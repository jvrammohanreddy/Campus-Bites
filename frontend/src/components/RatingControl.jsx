export default function RatingControl({ value = 0, onRate, disabled = false, label = 'item' }) {
  return (
    <div className="rating-control" role="group" aria-label={`Rate ${label}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`rating-control__star${star <= value ? ' is-selected' : ''}`}
          onClick={() => onRate(star)}
          disabled={disabled}
          aria-label={`Rate ${label} ${star} out of 5`}
          aria-pressed={star === value}
        >
          ★
        </button>
      ))}
      <span className="rating-control__value">{value ? `${value}/5` : 'Not rated'}</span>
    </div>
  );
}

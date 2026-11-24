import RatingSummary from './RatingSummary';

export default function RestaurantCard({ restaurant, onViewMenu }) {
  return (
    <article
      className="restaurant-card"
      role="button"
      tabIndex={0}
      onClick={() => onViewMenu(restaurant)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onViewMenu(restaurant);
        }
      }}
    >
      <div className="restaurant-card__image" aria-hidden="true">
        <span>{restaurant.name.slice(0, 2).toUpperCase()}</span>
      </div>

      <div className="restaurant-card__body">
        <div className="restaurant-card__header">
          <div>
            <h3>{restaurant.name}</h3>
            <p>{restaurant.cuisine}</p>
          </div>
          <RatingSummary
            average={restaurant.ratingAverage}
            count={restaurant.ratingCount}
            className="rating"
          />
        </div>

        <div className="restaurant-card__meta">
          <span>{restaurant.location}</span>
          <span>{restaurant.deliveryTime}</span>
          <span>{restaurant.priceRange}</span>
        </div>

        <ul className="restaurant-card__menu">
          {restaurant.menu.slice(0, 3).map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>

        <span className="view-menu-link">View menu →</span>
      </div>
    </article>
  );
}

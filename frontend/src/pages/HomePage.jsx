import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../services/media';
import RatingSummary from '../components/RatingSummary';
import api from '../services/api';

const highlights = [
  { title: 'Fast delivery', text: 'Order from campus restaurants and get food delivered to you.' },
  { title: 'Student friendly', text: 'Find campus favorites and order in a few simple steps.' },
  { title: 'Rated by diners', text: 'Discover restaurants and dishes rated by customers.' },
];

export default function HomePage() {
  const [topRated, setTopRated] = useState({ restaurants: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/ratings/top')
      .then(({ data }) => {
        if (active) setTopRated(data);
      })
      .catch(() => {
        if (active) setError('Could not load highest-rated listings right now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredItem = topRated.items[0];

  return (
    <div className="page page--home">
      <section className="hero">
        <div className="container hero__content">
          <div className="hero__copy">
            <span className="eyebrow">Campus food, delivered</span>
            <h1>Find your next campus favorite.</h1>
            <p>
              Explore campus restaurants, see what other diners love, and order your meal.
            </p>
            <div className="cta-row">
              <Link to="/restaurants" className="button button--primary">
                Explore restaurants
              </Link>
              <Link to="/login" className="button button--ghost">
                Login
              </Link>
            </div>
          </div>

          <div className="hero__panel">
            {featuredItem ? (
              <article className="offer-card">
                {featuredItem.imageUrl ? (
                  <img
                    className="offer-card__image"
                    src={getMediaUrl(featuredItem.imageUrl)}
                    alt={featuredItem.name}
                  />
                ) : null}
                <span className="offer-card__tag">Top-rated dish</span>
                <RatingSummary
                  average={featuredItem.ratingAverage}
                  count={featuredItem.ratingCount}
                  className="rating-summary--featured"
                />
                <h3>{featuredItem.name}</h3>
                <p>{featuredItem.restaurantId.name}</p>
                <div className="offer-card__meta">
                  <strong>₹{featuredItem.price}</strong>
                  <Link
                    to={`/restaurants?restaurantId=${encodeURIComponent(featuredItem.restaurantId._id)}&itemId=${encodeURIComponent(featuredItem._id)}`}
                    className="button button--primary button--compact"
                  >
                    View menu
                  </Link>
                </div>
              </article>
            ) : (
              <article className="offer-card offer-card--empty">
                <span className="offer-card__tag">Customer ratings</span>
                <h3>Discover campus food</h3>
                <p>Highest-rated dishes will appear here as students submit ratings.</p>
                <Link to="/restaurants" className="button button--primary button--compact">
                  Browse restaurants
                </Link>
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="features container">
        {highlights.map((item) => (
          <article key={item.title} className="feature-card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="popular container">
        {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
        {loading ? <p className="empty-state">Loading customer ratings…</p> : null}

        <div className="section-heading">
          <div>
            <span className="eyebrow">Rated by customers</span>
            <h2>Highest-rated restaurants</h2>
          </div>
          <Link to="/restaurants">Browse all</Link>
        </div>
        {!loading && !error && topRated.restaurants.length === 0 ? (
          <p className="empty-state">No restaurant ratings yet. Ratings appear after customers review delivered orders.</p>
        ) : null}
        {topRated.restaurants.length > 0 ? (
          <div className="popular__grid">
            {topRated.restaurants.map((restaurant) => (
              <article key={restaurant._id} className="mini-card">
                <RatingSummary average={restaurant.ratingAverage} count={restaurant.ratingCount} />
                <h3>{restaurant.name}</h3>
                <p>{restaurant.location} · {restaurant.isOpen ? 'Open' : 'Closed'}</p>
              </article>
            ))}
          </div>
        ) : null}

        <div className="section-heading rated-items-heading">
          <div>
            <span className="eyebrow">Dishes customers love</span>
            <h2>Highest-rated menu items</h2>
          </div>
        </div>
        {!loading && !error && topRated.items.length === 0 ? (
          <p className="empty-state">No menu-item ratings yet. Rate a dish to help others choose.</p>
        ) : null}
        {topRated.items.length > 0 ? (
          <div className="popular__grid">
            {topRated.items.map((item) => (
              <Link
                key={item._id}
                to={`/restaurants?restaurantId=${encodeURIComponent(item.restaurantId._id)}&itemId=${encodeURIComponent(item._id)}`}
                className="rated-item-link"
                aria-label={`View ${item.name} at ${item.restaurantId.name}`}
              >
                <article className="mini-card rated-item-card">
                  {item.imageUrl ? (
                    <img className="mini-card__image" src={getMediaUrl(item.imageUrl)} alt={item.name} loading="lazy" />
                  ) : null}
                  <RatingSummary average={item.ratingAverage} count={item.ratingCount} />
                  <h3>{item.name}</h3>
                  <p>{item.restaurantId.name} · ₹{item.price}</p>
                  <span className="rated-item-card__link">View restaurant menu →</span>
                </article>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

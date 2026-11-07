import { Link } from 'react-router-dom';

const highlights = [
  { title: 'Fast delivery', text: 'Placed in under 10 minutes from campus favorites.' },
  { title: 'Student friendly', text: 'Live with campus pricing, hostels, and easy checkout.' },
  { title: 'Fresh picks', text: 'Daily specials from trusted vendors across the campus.' },
];

const popularRestaurants = [
  { name: 'North Gate Bites', cuisine: 'North Indian', deliveryTime: '18-22 min' },
  { name: 'Hostel 6 Grill', cuisine: 'Burgers & Wraps', deliveryTime: '15-20 min' },
  { name: 'Cafeteria Bowl', cuisine: 'Healthy Bowls', deliveryTime: '12-18 min' },
];

export default function HomePage() {
  return (
    <div className="page page--home">
      <section className="hero">
        <div className="container hero__content">
          <div className="hero__copy">
            <span className="eyebrow">Campus food, delivered fast</span>
            <h1>Craving something tasty between lectures?</h1>
            <p>
              Order from the best campus food spots, track your delivery, and keep your day moving.
            </p>
            <div className="cta-row">
              <Link to="/restaurants" className="button button--primary">
                Explore restaurants
              </Link>
              <Link to="/login" className="button button--ghost">
                Login
              </Link>
            </div>
            <div className="hero__stats">
              <div>
                <strong>2k+</strong>
                <span>student orders</span>
              </div>
              <div>
                <strong>30 min</strong>
                <span>average delivery</span>
              </div>
              <div>
                <strong>4.8★</strong>
                <span>campus rating</span>
              </div>
            </div>
          </div>

          <div className="hero__panel">
            <div className="offer-card">
              <span className="offer-card__tag">Today&apos;s special</span>
              <h3>Paneer Combo</h3>
              <p>Butter paneer, naan, salad, and cold drink.</p>
              <div className="offer-card__meta">
                <strong>₹299</strong>
                <button type="button" className="button button--primary button--compact">
                  Order now
                </button>
              </div>
            </div>
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
        <div className="section-heading">
          <div>
            <span className="eyebrow">Popular right now</span>
            <h2>Campus favorites</h2>
          </div>
          <Link to="/restaurants">See all</Link>
        </div>

        <div className="popular__grid">
          {popularRestaurants.map((restaurant) => (
            <div key={restaurant.name} className="mini-card">
              <div className="mini-card__badge">{restaurant.cuisine}</div>
              <h3>{restaurant.name}</h3>
              <p>{restaurant.deliveryTime}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

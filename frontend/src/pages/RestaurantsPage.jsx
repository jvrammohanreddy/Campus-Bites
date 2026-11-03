import { useEffect, useMemo, useState } from 'react';
import RestaurantCard from '../components/RestaurantCard';
import { useCart } from '../context/CartContext';
import api from '../services/api';

export default function RestaurantsPage() {
  const { addToCart } = useCart();
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuError, setMenuError] = useState(null);
  const [cartNotice, setCartNotice] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/restaurants?isOpen=true')
      .then(({ data }) => {
        if (!active) return;
        const availableRestaurants = data.filter((restaurant) => restaurant.isOpen);
        setRestaurants(availableRestaurants);
        setSelectedRestaurantId(availableRestaurants[0]?._id || '');
      })
      .catch(() => {
        if (active) setError('Could not load restaurants. Check that the backend and database are running.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredRestaurants = useMemo(
    () =>
      restaurants.filter((restaurant) =>
        `${restaurant.name} ${restaurant.location}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [restaurants, search],
  );

  const selectedRestaurantSummary =
    filteredRestaurants.find((restaurant) => restaurant._id === selectedRestaurantId) ||
    filteredRestaurants[0];
  const activeRestaurantId = selectedRestaurantSummary?._id || '';
  const menuErrorMessage =
    menuError?.restaurantId === activeRestaurantId ? menuError.message : '';
  const menuLoading =
    Boolean(activeRestaurantId) &&
    selectedRestaurantDetail?._id !== activeRestaurantId &&
    !menuErrorMessage;

  useEffect(() => {
    if (!activeRestaurantId) {
      return undefined;
    }

    let active = true;
    api.get(`/restaurants/${activeRestaurantId}`)
      .then(({ data }) => {
        if (active) {
          setSelectedRestaurantDetail(data);
          setMenuError(null);
        }
      })
      .catch(() => {
        if (active) {
          setMenuError({
            restaurantId: activeRestaurantId,
            message: 'Could not load this restaurant menu.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [activeRestaurantId]);

  const handleAddToCart = (restaurant, item) => {
    const replaced = addToCart({
      ...item,
      id: item._id,
      menuItemId: item._id,
      restaurantId: restaurant._id,
    });
    setCartNotice(
      replaced
        ? 'Your cart was updated to items from this restaurant.'
        : `${item.name} added to cart.`,
    );
  };

  return (
    <div className="page page--restaurants container">
      <div className="section-heading section-heading--stacked">
        <div>
          <span className="eyebrow">Order now</span>
          <h1>Popular restaurants</h1>
        </div>
        <input
          type="search"
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search restaurants or locations"
          aria-label="Search restaurants"
        />
      </div>

      {cartNotice ? <p className="cart-notice" role="status">{cartNotice}</p> : null}
      {loading ? <p className="empty-state">Loading restaurants…</p> : null}
      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      {!loading && !error && restaurants.length === 0 ? (
        <p className="empty-state">No restaurants yet. Ask a vendor to add an open restaurant and menu.</p>
      ) : null}
      {!loading && !error && restaurants.length > 0 && filteredRestaurants.length === 0 ? (
        <p className="empty-state">No restaurants match your search.</p>
      ) : null}

      {selectedRestaurantSummary ? (
        <div className="restaurants-layout">
          <div className="restaurant-list">
            {filteredRestaurants.map((restaurant) => {
              const cardRestaurant = {
                ...restaurant,
                cuisine: restaurant.cuisine || 'Campus kitchen',
                deliveryTime: restaurant.deliveryTime || 'Campus delivery',
                priceRange: restaurant.priceRange || 'Student friendly',
                rating: restaurant.rating || 'New',
                menu: restaurant.menu || [],
              };

              return (
                <div
                  key={restaurant._id}
                  className={`restaurant-select ${activeRestaurantId === restaurant._id ? 'is-active' : ''}`}
                >
                  <RestaurantCard
                    restaurant={cardRestaurant}
                    onViewMenu={() => setSelectedRestaurantId(restaurant._id)}
                  />
                </div>
              );
            })}
          </div>

          <aside className="menu-panel">
            <div className="menu-panel__header">
              <div>
                <span className="eyebrow">Menu</span>
                <h2>{selectedRestaurantSummary.name}</h2>
              </div>
              <span className="pill">Open now</span>
            </div>

            <p className="menu-subtitle">{selectedRestaurantSummary.location}</p>

            {menuLoading ? <p className="empty-state">Loading menu…</p> : null}
            {menuErrorMessage ? <p className="form-message form-message--error" role="alert">{menuErrorMessage}</p> : null}
            {!menuLoading && !menuError ? <div className="menu-items">
              {(selectedRestaurantDetail?.menu || []).filter((item) => item.isAvailable).map((item) => (
                <div key={item._id} className="menu-item">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="dietary-label">{item.isVeg ? 'Veg' : 'Non-veg'}</span>
                  </div>
                  <div className="menu-item__meta">
                    <strong>₹{item.price}</strong>
                    <button
                      type="button"
                      className="button button--primary button--compact"
                      onClick={() => handleAddToCart(selectedRestaurantDetail, item)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
              {(selectedRestaurantDetail?.menu || []).filter((item) => item.isAvailable).length === 0 ? (
                <p className="empty-state">This restaurant has no available menu items.</p>
              ) : null}
            </div> : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

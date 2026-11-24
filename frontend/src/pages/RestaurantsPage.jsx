import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RestaurantCard from '../components/RestaurantCard';
import RatingControl from '../components/RatingControl';
import RatingSummary from '../components/RatingSummary';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import { getMediaUrl } from '../services/media';

export default function RestaurantsPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [searchParams] = useSearchParams();
  const requestedRestaurantId = searchParams.get('restaurantId') || '';
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedRestaurantDetail, setSelectedRestaurantDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuError, setMenuError] = useState(null);
  const [cartNotice, setCartNotice] = useState('');
  const [ratingEligibilityState, setRatingEligibilityState] = useState(null);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessageState, setRatingMessageState] = useState(null);
  const [ratingErrorState, setRatingErrorState] = useState(null);

  useEffect(() => {
    let active = true;

    api.get('/restaurants')
      .then(({ data }) => {
        if (!active) return;
        setRestaurants(data);
        const requestedRestaurant = data.find((restaurant) => restaurant._id === requestedRestaurantId);
        setSelectedRestaurantId(requestedRestaurant?._id || data[0]?._id || '');
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
  }, [requestedRestaurantId]);

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
  const ratingEligibility =
    user?.role === 'STUDENT' &&
    user.token &&
    ratingEligibilityState?.restaurantId === activeRestaurantId
      ? ratingEligibilityState.data
      : null;
  const ratingMessage = ratingMessageState?.restaurantId === activeRestaurantId
    ? ratingMessageState.message
    : '';
  const ratingError = ratingErrorState?.restaurantId === activeRestaurantId
    ? ratingErrorState.message
    : '';

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

  useEffect(() => {
    if (!activeRestaurantId || user?.role !== 'STUDENT' || !user.token) return undefined;

    let active = true;
    api.get(`/ratings/eligibility/${activeRestaurantId}`)
      .then(({ data }) => {
        if (active) setRatingEligibilityState({ restaurantId: activeRestaurantId, data });
      })
      .catch(() => {
        if (active) {
          setRatingErrorState({
            restaurantId: activeRestaurantId,
            message: 'Could not load rating options.',
          });
        }
      });

    return () => {
      active = false;
    };
  }, [activeRestaurantId, user?.role, user?.token]);

  const requestedItemId = searchParams.get('itemId') || '';

  useEffect(() => {
    if (
      !requestedItemId ||
      requestedRestaurantId !== activeRestaurantId ||
      selectedRestaurantDetail?._id !== activeRestaurantId ||
      !selectedRestaurantDetail.menu.some((item) => item._id === requestedItemId)
    ) {
      return;
    }

    document.getElementById(`menu-item-${requestedItemId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeRestaurantId, requestedItemId, requestedRestaurantId, selectedRestaurantDetail]);

  const handleRate = async (targetType, targetId, value) => {
    if (!activeRestaurantId) return;
    setRatingSaving(true);
    setRatingMessageState(null);
    setRatingErrorState(null);

    try {
      await api.post('/ratings', {
        restaurantId: activeRestaurantId,
        targetType,
        targetId,
        value,
      });
      setRatingMessageState({
        restaurantId: activeRestaurantId,
        message: 'Thanks! Your rating has been saved.',
      });
      try {
        const [{ data: detail }, { data: eligibility }] = await Promise.all([
          api.get(`/restaurants/${activeRestaurantId}`),
          api.get(`/ratings/eligibility/${activeRestaurantId}`),
        ]);
        setSelectedRestaurantDetail(detail);
        setRatingEligibilityState({ restaurantId: activeRestaurantId, data: eligibility });
        setRestaurants((current) => current.map((restaurant) => (
          restaurant._id === detail._id
            ? { ...restaurant, ratingAverage: detail.ratingAverage, ratingCount: detail.ratingCount }
            : restaurant
        )));
      } catch {
        setRatingErrorState({
          restaurantId: activeRestaurantId,
          message: 'Your rating was saved, but the updated ratings could not be refreshed.',
        });
      }
    } catch (requestError) {
      setRatingErrorState({
        restaurantId: activeRestaurantId,
        message: requestError.response?.data?.message || 'Could not save your rating. Please try again.',
      });
    } finally {
      setRatingSaving(false);
    }
  };

  const getCurrentRating = (targetType, targetId) => (
    ratingEligibility?.ratings.find(
      (rating) => rating.targetType === targetType && String(rating.targetId) === String(targetId),
    )?.value || 0
  );

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
                ratingAverage: restaurant.ratingAverage,
                ratingCount: restaurant.ratingCount,
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
              <span className={`pill${selectedRestaurantSummary.isOpen ? '' : ' pill--closed'}`}>
                {selectedRestaurantSummary.isOpen ? 'Open now' : 'Currently closed'}
              </span>
            </div>
            <div className="menu-panel__rating">
              <RatingSummary
                average={selectedRestaurantSummary.ratingAverage}
                count={selectedRestaurantSummary.ratingCount}
              />
            </div>

            <p className="menu-subtitle">{selectedRestaurantSummary.location}</p>
            <p className="rating-policy-note">
              Signed-in students can rate any menu item. Restaurant ratings require a delivered order.
            </p>
            {ratingEligibility?.eligibleForRestaurant ? (
              <div className="restaurant-rating">
                <span>Rate this restaurant</span>
                <RatingControl
                  value={getCurrentRating('RESTAURANT', activeRestaurantId)}
                  onRate={(value) => handleRate('RESTAURANT', activeRestaurantId, value)}
                  disabled={ratingSaving}
                  label={selectedRestaurantSummary.name}
                />
              </div>
            ) : null}
            {ratingMessage ? <p className="rating-feedback" role="status">{ratingMessage}</p> : null}
            {ratingError ? <p className="form-message form-message--error" role="alert">{ratingError}</p> : null}

            {menuLoading ? <p className="empty-state">Loading menu…</p> : null}
            {menuErrorMessage ? <p className="form-message form-message--error" role="alert">{menuErrorMessage}</p> : null}
            {!menuLoading && !menuError ? <div className="menu-items">
              {(selectedRestaurantDetail?.menu || []).map((item) => (
                <div
                  key={item._id}
                  id={`menu-item-${item._id}`}
                  className={`menu-item${item._id === requestedItemId ? ' menu-item--highlighted' : ''}`}
                >
                  {item.imageUrl ? (
                    <img className="menu-item__image" src={getMediaUrl(item.imageUrl)} alt={item.name} loading="lazy" />
                  ) : null}
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="dietary-label">{item.isVeg ? 'Veg' : 'Non-veg'}</span>
                    <RatingSummary
                      average={item.ratingAverage}
                      count={item.ratingCount}
                      className="menu-item__rating"
                    />
                    {ratingEligibility?.eligibleMenuItemIds.includes(String(item._id)) ? (
                      <RatingControl
                        value={getCurrentRating('MENU_ITEM', item._id)}
                        onRate={(value) => handleRate('MENU_ITEM', item._id, value)}
                        disabled={ratingSaving}
                        label={item.name}
                      />
                    ) : null}
                  </div>
                  <div className="menu-item__meta">
                    <strong>₹{item.price}</strong>
                    <button
                      type="button"
                      className="button button--primary button--compact"
                      disabled={!selectedRestaurantSummary.isOpen || !item.isAvailable}
                      onClick={() => handleAddToCart(selectedRestaurantDetail, item)}
                    >
                      {!item.isAvailable ? 'Unavailable' : selectedRestaurantSummary.isOpen ? 'Add' : 'Closed'}
                    </button>
                  </div>
                </div>
              ))}
              {(selectedRestaurantDetail?.menu || []).length === 0 ? (
                <p className="empty-state">This restaurant has no available menu items.</p>
              ) : null}
            </div> : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

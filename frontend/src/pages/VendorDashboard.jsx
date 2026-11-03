import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './VendorDashboard.css';

const ORDER_STATUSES = [
  'PLACED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const emptyMenuForm = {
  name: '',
  price: '',
  description: '',
  isVeg: true,
  isAvailable: true,
};

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || error.message || fallback;
}

function formatStatus(status) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function VendorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const currentVendorId = user?._id;
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restaurantForm, setRestaurantForm] = useState({ name: '', location: '' });
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [editingItemId, setEditingItemId] = useState('');

  const loadOrders = useCallback(async () => {
    const { data } = await api.get('/vendor/orders');
    setOrders(data);
  }, []);

  const loadRestaurant = useCallback(async () => {
    const { data } = await api.get('/restaurants');
    const ownRestaurant = data.find((item) => {
      const restaurantVendorId = item.vendorId?._id || item.vendorId;
      return String(restaurantVendorId) === String(currentVendorId);
    });

    if (!ownRestaurant) {
      setRestaurant(null);
      setOrders([]);
      return;
    }

    const { data: detail } = await api.get(`/restaurants/${ownRestaurant._id}`);
    setRestaurant(detail);
    await loadOrders();
  }, [currentVendorId, loadOrders]);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      if (!isAuthenticated || user?.role !== 'VENDOR' || !currentVendorId) {
        setLoading(false);
        return;
      }

      try {
        await loadRestaurant();
      } catch (requestError) {
        if (active) {
          setError(getErrorMessage(
            requestError,
            'Could not load your restaurant. Check the backend connection and try again.',
          ));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    initialize();
    return () => {
      active = false;
    };
  }, [currentVendorId, isAuthenticated, loadRestaurant, user?.role]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'VENDOR') {
    return (
      <div className="page container">
        <section className="vendor-empty-state">
          <span className="eyebrow">Vendor access</span>
          <h1>A vendor account is required</h1>
          <p>Sign in with an account whose role is set to VENDOR to manage a restaurant.</p>
          <Link className="button button--primary" to="/restaurants">Browse restaurants</Link>
        </section>
      </div>
    );
  }

  const clearFeedback = () => {
    setError('');
    setNotice('');
  };

  const handleCreateRestaurant = async (event) => {
    event.preventDefault();
    clearFeedback();
    setSaving(true);

    try {
      const { data } = await api.post('/vendor/restaurants', restaurantForm);
      setRestaurant(data);
      setRestaurantForm({ name: '', location: '' });
      setNotice('Restaurant profile created.');
      await loadOrders();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not create the restaurant.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMenuFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setMenuForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveMenuItem = async (event) => {
    event.preventDefault();
    clearFeedback();
    setSaving(true);
    const payload = { ...menuForm, price: Number(menuForm.price) };

    try {
      if (editingItemId) {
        await api.put(`/vendor/restaurants/menu/${editingItemId}`, payload);
        setNotice('Menu item updated.');
      } else {
        await api.post('/vendor/restaurants/menu', payload);
        setNotice('Menu item added.');
      }
      setMenuForm(emptyMenuForm);
      setEditingItemId('');
      await loadRestaurant();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not save this menu item.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditMenuItem = (item) => {
    clearFeedback();
    setEditingItemId(item._id);
    setMenuForm({
      name: item.name,
      price: String(item.price),
      description: item.description || '',
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
    });
    document.getElementById('vendor-menu-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItemId('');
    setMenuForm(emptyMenuForm);
  };

  const handleDeleteMenuItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    clearFeedback();
    setSaving(true);

    try {
      await api.delete(`/vendor/restaurants/menu/${item._id}`);
      setNotice('Menu item removed.');
      if (editingItemId === item._id) handleCancelEdit();
      await loadRestaurant();
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not remove this menu item.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleOpen = async () => {
    clearFeedback();
    setSaving(true);

    try {
      const { data } = await api.put('/vendor/restaurants/status');
      setRestaurant((current) => ({ ...current, isOpen: data.isOpen }));
      setNotice(data.message);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update restaurant status.'));
    } finally {
      setSaving(false);
    }
  };

  const handleOrderStatusChange = async (orderId, status) => {
    clearFeedback();

    try {
      const { data } = await api.put(`/vendor/orders/${orderId}/status`, { status });
      setOrders((current) => current.map((order) => (
        order._id === orderId ? { ...order, status: data.status } : order
      )));
      setNotice('Order status updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update order status.'));
    }
  };

  return (
    <div className="page vendor-dashboard container">
      <header className="vendor-dashboard__heading">
        <div>
          <span className="eyebrow">Vendor workspace</span>
          <h1>Restaurant dashboard</h1>
          <p>Manage your menu, availability, and incoming orders.</p>
        </div>
        {restaurant ? (
          <button
            type="button"
            className={`vendor-status ${restaurant.isOpen ? 'vendor-status--open' : 'vendor-status--closed'}`}
            onClick={handleToggleOpen}
            disabled={saving}
          >
            <span aria-hidden="true" />
            {restaurant.isOpen ? 'Open' : 'Closed'} · Click to change
          </button>
        ) : null}
      </header>

      {error ? <p className="form-message form-message--error vendor-feedback" role="alert">{error}</p> : null}
      {notice ? <p className="vendor-feedback vendor-feedback--success" role="status">{notice}</p> : null}
      {loading ? <p className="vendor-muted">Loading your workspace…</p> : null}

      {!loading && !restaurant ? (
        <section className="vendor-panel vendor-onboarding">
          <div>
            <span className="vendor-kicker">First step</span>
            <h2>Create your restaurant profile</h2>
            <p>Set the name and campus location students will see.</p>
          </div>
          <form className="vendor-form vendor-form--restaurant" onSubmit={handleCreateRestaurant}>
            <label>
              Restaurant name
              <input
                value={restaurantForm.name}
                onChange={(event) => setRestaurantForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. North Gate Bites"
                required
              />
            </label>
            <label>
              Location
              <input
                value={restaurantForm.location}
                onChange={(event) => setRestaurantForm((current) => ({ ...current, location: event.target.value }))}
                placeholder="e.g. Near Hostel 5"
                required
              />
            </label>
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create restaurant'}
            </button>
          </form>
        </section>
      ) : null}

      {!loading && restaurant ? (
        <>
          <section className="vendor-overview">
            <article className="vendor-panel vendor-restaurant-summary">
              <div className="vendor-restaurant-mark" aria-hidden="true">
                {restaurant.name.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <span className="vendor-kicker">Your restaurant</span>
                <h2>{restaurant.name}</h2>
                <p>{restaurant.location}</p>
              </div>
            </article>
            <article className="vendor-stat">
              <span>Menu items</span>
              <strong>{restaurant.menu?.length || 0}</strong>
            </article>
            <article className="vendor-stat">
              <span>Total orders</span>
              <strong>{orders.length}</strong>
            </article>
            <article className="vendor-stat">
              <span>Needs attention</span>
              <strong>{orders.filter((order) => order.status === 'PLACED').length}</strong>
            </article>
          </section>

          <section className="vendor-panel vendor-menu-section">
            <div className="vendor-section-heading">
              <div>
                <span className="vendor-kicker">Catalog</span>
                <h2>Menu management</h2>
              </div>
              <span className="vendor-count">{restaurant.menu?.length || 0} items</span>
            </div>

            <div className="vendor-menu-layout">
              <form id="vendor-menu-form" className="vendor-form vendor-menu-form" onSubmit={handleSaveMenuItem}>
                <h3>{editingItemId ? 'Edit menu item' : 'Add a menu item'}</h3>
                <label>
                  Item name
                  <input name="name" value={menuForm.name} onChange={handleMenuFormChange} required />
                </label>
                <label>
                  Price (₹)
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={menuForm.price}
                    onChange={handleMenuFormChange}
                    required
                  />
                </label>
                <label>
                  Description
                  <textarea
                    name="description"
                    value={menuForm.description}
                    onChange={handleMenuFormChange}
                    rows="3"
                    placeholder="Describe the dish"
                  />
                </label>
                <div className="vendor-checkboxes">
                  <label><input type="checkbox" name="isVeg" checked={menuForm.isVeg} onChange={handleMenuFormChange} /> Vegetarian</label>
                  <label><input type="checkbox" name="isAvailable" checked={menuForm.isAvailable} onChange={handleMenuFormChange} /> Available to order</label>
                </div>
                <div className="vendor-form-actions">
                  <button type="submit" className="button button--primary" disabled={saving}>
                    {saving ? 'Saving…' : editingItemId ? 'Save changes' : 'Add item'}
                  </button>
                  {editingItemId ? (
                    <button type="button" className="button button--ghost" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="vendor-menu-list">
                {(restaurant.menu || []).map((item) => (
                  <article className="vendor-menu-card" key={item._id}>
                    <div className="vendor-menu-card__top">
                      <span className={`vendor-dietary ${item.isVeg ? 'vendor-dietary--veg' : 'vendor-dietary--nonveg'}`}>
                        {item.isVeg ? 'Veg' : 'Non-veg'}
                      </span>
                      <span className={`vendor-availability ${item.isAvailable ? '' : 'vendor-availability--off'}`}>
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <div className="vendor-menu-card__body">
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.description || 'No description added.'}</p>
                      </div>
                      <strong>₹{Number(item.price).toFixed(2)}</strong>
                    </div>
                    <div className="vendor-card-actions">
                      <button type="button" className="button button--ghost button--compact" onClick={() => handleEditMenuItem(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--danger button--compact"
                        onClick={() => handleDeleteMenuItem(item)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
                {restaurant.menu?.length === 0 ? (
                  <div className="vendor-empty-inline">
                    <h3>Your menu is empty</h3>
                    <p>Add your first dish using the form.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="vendor-panel vendor-orders-section">
            <div className="vendor-section-heading">
              <div>
                <span className="vendor-kicker">Fulfillment</span>
                <h2>Incoming orders</h2>
              </div>
              <span className="vendor-count">{orders.length} total</span>
            </div>
            <div className="vendor-order-list">
              {orders.map((order) => (
                <article className="vendor-order-card" key={order._id}>
                  <div className="vendor-order-card__heading">
                    <div>
                      <span className="vendor-kicker">Order #{order._id.slice(-6).toUpperCase()}</span>
                      <h3>{order.studentId?.name || 'Campus customer'}</h3>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>
                    <strong>₹{Number(order.totalAmount).toFixed(2)}</strong>
                  </div>
                  <div className="vendor-order-details">
                    <p><strong>Deliver to:</strong> {order.deliveryLocation}</p>
                    <p><strong>Payment:</strong> {order.paymentMethod} · {order.paymentStatus}</p>
                    {order.studentId?.phone ? <p><strong>Phone:</strong> {order.studentId.phone}</p> : null}
                  </div>
                  <ul className="vendor-order-items">
                    {(order.items || []).map((item) => (
                      <li key={`${order._id}-${item.menuItemId}`}>
                        <span>{item.quantity} × {item.name}</span>
                        <span>₹{(item.quantity * item.price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="vendor-order-card__footer">
                    <span className={`vendor-order-status vendor-order-status--${order.status.toLowerCase()}`}>
                      {formatStatus(order.status)}
                    </span>
                    <label className="vendor-status-select">
                      Update status
                      <select
                        value={order.status}
                        onChange={(event) => handleOrderStatusChange(order._id, event.target.value)}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>{formatStatus(status)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              ))}
              {orders.length === 0 ? (
                <div className="vendor-empty-inline">
                  <h3>No orders yet</h3>
                  <p>New student orders for your restaurant will show up here.</p>
                </div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

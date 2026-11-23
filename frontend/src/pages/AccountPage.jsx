import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AccountPage.css';

const EMPTY_PROFILE = {
  name: '',
  email: '',
  phone: '',
  whatsappOptIn: false,
  hostel: '',
  roomNumber: '',
  createdAt: '',
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

function formatPaymentMethod(method) {
  if (['COD', 'CASH'].includes(method)) return 'Cash on delivery';
  if (['ONLINE', 'RAZORPAY', 'UPI'].includes(method)) return 'Online';
  return method;
}

export default function AccountPage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [orders, setOrders] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [ordersError, setOrdersError] = useState('');
  const [profileNotice, setProfileNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let active = true;

    api.get('/users/me')
      .then(({ data }) => {
        if (active) setProfile({ ...EMPTY_PROFILE, ...data });
      })
      .catch((error) => {
        if (active) setProfileError(getErrorMessage(error, 'Could not load your profile.'));
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    api.get('/orders/my-orders')
      .then(({ data }) => {
        if (active) setOrders(data);
      })
      .catch((error) => {
        if (active) setOrdersError(getErrorMessage(error, 'Could not load your order history.'));
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const orderStats = useMemo(() => ({
    total: orders.length,
    delivered: orders.filter((order) => order.status === 'DELIVERED').length,
    active: orders.filter((order) => !['DELIVERED', 'CANCELLED'].includes(order.status)).length,
  }), [orders]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'STUDENT') {
    return <Navigate to={user?.role === 'VENDOR' ? '/vendor' : '/'} replace />;
  }

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileNotice('');
    setProfileSaving(true);

    try {
      const { data } = await api.put('/users/profile', {
        name: profile.name,
        phone: profile.phone,
        whatsappOptIn: profile.whatsappOptIn,
        hostel: profile.hostel,
        roomNumber: profile.roomNumber,
      });
      setProfile((current) => ({ ...current, ...data }));
      updateUser(data);
      setProfileNotice('Your profile has been updated.');
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Could not save your profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const { data } = await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordNotice(data.message || 'Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Could not update your password.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="page page--account container">
      <header className="account-heading">
        <div>
          <span className="eyebrow">Student account</span>
          <h1>Hi, {profile.name || user.name}</h1>
          <p>Manage your details and keep track of your Campus Bites orders.</p>
        </div>
        <Link to="/restaurants" className="button button--primary">Browse restaurants</Link>
      </header>

      <section className="account-stats" aria-label="Order summary">
        <article className="account-stat">
          <span>Total orders</span>
          <strong>{ordersLoading ? '—' : orderStats.total}</strong>
        </article>
        <article className="account-stat">
          <span>Delivered</span>
          <strong>{ordersLoading ? '—' : orderStats.delivered}</strong>
        </article>
        <article className="account-stat">
          <span>In progress</span>
          <strong>{ordersLoading ? '—' : orderStats.active}</strong>
        </article>
      </section>

      <div className="account-layout">
        <div className="account-main">
          <section className="account-panel">
            <div className="account-panel__heading">
              <div>
                <span className="account-kicker">Your details</span>
                <h2>Profile information</h2>
              </div>
              {profile.createdAt ? (
                <span className="account-joined">Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              ) : null}
            </div>

            {profileLoading ? <p className="empty-state">Loading your profile…</p> : null}
            {!profileLoading ? (
              <form className="auth-form account-form" onSubmit={handleProfileSubmit}>
                <label>
                  Full name
                  <input
                    type="text"
                    name="name"
                    value={profile.name}
                    onChange={handleProfileChange}
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </label>

                <label>
                  IITB email
                  <input type="email" value={profile.email} readOnly aria-describedby="account-email-note" />
                  <span id="account-email-note" className="account-field-note">Your sign-in email cannot be changed here.</span>
                </label>

                <label>
                  Phone number <span className="account-optional">Optional</span>
                  <input
                    type="tel"
                    name="phone"
                    value={profile.phone || ''}
                    onChange={handleProfileChange}
                    autoComplete="tel"
                    maxLength={30}
                  />
                </label>

                <label className="account-whatsapp-consent">
                  <input
                    type="checkbox"
                    name="whatsappOptIn"
                    checked={Boolean(profile.whatsappOptIn)}
                    onChange={(event) => setProfile((current) => ({
                      ...current,
                      whatsappOptIn: event.target.checked,
                    }))}
                  />
                  <span>Send me WhatsApp updates when my order status changes. I can opt out here anytime.</span>
                </label>

                <div className="two-column-fields">
                  <label>
                    Hostel
                    <input
                      type="text"
                      name="hostel"
                      value={profile.hostel || ''}
                      onChange={handleProfileChange}
                      autoComplete="address-line1"
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Room number
                    <input
                      type="text"
                      name="roomNumber"
                      value={profile.roomNumber || ''}
                      onChange={handleProfileChange}
                      maxLength={30}
                    />
                  </label>
                </div>

                {profileError ? <p className="form-message form-message--error" role="alert">{profileError}</p> : null}
                {profileNotice ? <p className="account-notice" role="status">{profileNotice}</p> : null}
                <button type="submit" className="button button--primary" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            ) : null}
          </section>

          <section className="account-panel account-orders">
            <div className="account-panel__heading">
              <div>
                <span className="account-kicker">Your activity</span>
                <h2>Order history</h2>
              </div>
            </div>
            {ordersError ? <p className="form-message form-message--error" role="alert">{ordersError}</p> : null}
            {ordersLoading ? <p className="empty-state">Loading your orders…</p> : null}
            {!ordersLoading && !ordersError && orders.length === 0 ? (
              <div className="account-empty">
                <p>You haven’t placed an order yet.</p>
                <Link to="/restaurants" className="button button--primary button--compact">Explore restaurants</Link>
              </div>
            ) : null}
            {!ordersLoading && orders.length > 0 ? (
              <div className="account-order-list">
                {orders.map((order) => (
                  <article className="account-order" key={order._id}>
                    <div className="account-order__heading">
                      <div>
                        <h3>{order.restaurantId?.name || 'Restaurant'}</h3>
                        <p>{formatDate(order.createdAt)}</p>
                      </div>
                      <span className={`account-order__status account-order__status--${order.status.toLowerCase()}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    <ul className="account-order__items">
                      {order.items.map((item, index) => (
                        <li key={`${order._id}-${item.menuItemId || index}`}>
                          <span>{item.name} × {item.quantity}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="account-order__footer">
                      <span>{formatPaymentMethod(order.paymentMethod)} · {formatStatus(order.paymentStatus)}</span>
                      <strong>₹{order.totalAmount}</strong>
                    </div>
                    <p className="account-order__location">Deliver to: {order.deliveryLocation}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="account-panel account-security">
          <div className="account-panel__heading">
            <div>
              <span className="account-kicker">Security</span>
              <h2>Change password</h2>
            </div>
          </div>
          <p className="account-security__intro">Use your current password to set a new one. Choose at least 8 characters.</p>
          <form className="auth-form account-form" onSubmit={handlePasswordSubmit}>
            <label>
              Current password
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              New password
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            {passwordError ? <p className="form-message form-message--error" role="alert">{passwordError}</p> : null}
            {passwordNotice ? <p className="account-notice" role="status">{passwordNotice}</p> : null}
            <button type="submit" className="button button--ghost" disabled={passwordSaving}>
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

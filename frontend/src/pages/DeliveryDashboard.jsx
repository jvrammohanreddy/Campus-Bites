import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './DeliveryDashboard.css';

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
  if (['ONLINE', 'RAZORPAY', 'UPI'].includes(method)) return 'Online payment';
  return method;
}

function OrderCard({ order, action, busy, onAction }) {
  const canCallStudent = Boolean(order.studentId?.phone);

  return (
    <article className="delivery-order-card">
      <div className="delivery-order-card__heading">
        <div>
          <span className="delivery-order-card__restaurant">{order.restaurantId?.name || 'Restaurant'}</span>
          <h3>Order #{order._id.slice(-6).toUpperCase()}</h3>
          <p>Placed {formatDate(order.createdAt)}</p>
        </div>
        <span className={`delivery-status delivery-status--${order.status.toLowerCase()}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      <ul className="delivery-order-items">
        {order.items.map((item, index) => (
          <li key={`${order._id}-${item.menuItemId || index}`}>
            <span>{item.name} × {item.quantity}</span>
            <strong>₹{item.price * item.quantity}</strong>
          </li>
        ))}
      </ul>

      <dl className="delivery-order-details">
        <div>
          <dt>Pickup</dt>
          <dd>{order.restaurantId?.location || 'Restaurant'}</dd>
        </div>
        <div>
          <dt>Deliver to</dt>
          <dd>{order.deliveryLocation}</dd>
        </div>
        {order.studentId?.name ? (
          <div>
            <dt>Customer</dt>
            <dd>{order.studentId.name}</dd>
          </div>
        ) : null}
        {canCallStudent ? (
          <div>
            <dt>Contact</dt>
            <dd><a href={`tel:${order.studentId.phone}`}>{order.studentId.phone}</a></dd>
          </div>
        ) : null}
        <div>
          <dt>Payment</dt>
          <dd>{formatPaymentMethod(order.paymentMethod)} · {formatStatus(order.paymentStatus)}</dd>
        </div>
      </dl>

      <div className="delivery-order-card__footer">
        <strong className="delivery-order-total">Order total · ₹{order.totalAmount}</strong>
        {action ? (
          <button
            type="button"
            className="button button--primary button--compact"
            disabled={busy}
            onClick={() => onAction(order)}
          >
            {busy ? 'Updating…' : action.label}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function OrderSection({ title, description, orders, emptyText, action, busyOrderId, onAction }) {
  return (
    <section className="delivery-panel">
      <div className="delivery-panel__heading">
        <div>
          <span className="delivery-kicker">{title}</span>
          <p>{description}</p>
        </div>
        <span className="delivery-count">{orders.length}</span>
      </div>
      {orders.length === 0 ? (
        <p className="delivery-empty">{emptyText}</p>
      ) : (
        <div className="delivery-order-list">
          {orders.map((order) => {
            const orderAction = typeof action === 'function' ? action(order) : action;
            return (
              <OrderCard
                key={order._id}
                order={order}
                action={orderAction}
                busy={busyOrderId === order._id}
                onAction={onAction}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function DeliveryDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchOrders = useCallback(async () => {
    const [{ data: available }, { data: assigned }] = await Promise.all([
      api.get('/delivery/available-orders'),
      api.get('/delivery/my-orders'),
    ]);
    return { available, assigned };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshOrders = () => fetchOrders()
      .then(({ available, assigned }) => {
        if (active) {
          setAvailableOrders(available);
          setMyOrders(assigned);
        }
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Could not load delivery orders.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    refreshOrders();
    const intervalId = window.setInterval(refreshOrders, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [fetchOrders]);

  const waitingForPickup = useMemo(
    () => myOrders.filter((order) => order.status === 'READY_FOR_PICKUP'),
    [myOrders],
  );
  const outForDelivery = useMemo(
    () => myOrders.filter((order) => order.status === 'OUT_FOR_DELIVERY'),
    [myOrders],
  );
  const deliveredOrders = useMemo(
    () => myOrders.filter((order) => order.status === 'DELIVERED'),
    [myOrders],
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'DELIVERY') {
    return <Navigate to={user?.role === 'VENDOR' ? '/vendor' : user?.role === 'STUDENT' ? '/account' : '/'} replace />;
  }

  const handleRefresh = async () => {
    setError('');
    setNotice('');
    setRefreshing(true);
    try {
      const { available, assigned } = await fetchOrders();
      setAvailableOrders(available);
      setMyOrders(assigned);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not refresh delivery orders.'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async (order) => {
    setError('');
    setNotice('');
    setBusyOrderId(order._id);
    try {
      if (order.status === 'READY_FOR_PICKUP' && !order.deliveryId) {
        await api.put(`/delivery/orders/${order._id}/accept`);
      } else {
        const status = order.status === 'READY_FOR_PICKUP' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
        await api.put(`/delivery/orders/${order._id}/status`, { status });
      }
      const { available, assigned } = await fetchOrders();
      setAvailableOrders(available);
      setMyOrders(assigned);
      setNotice(
        order.status === 'READY_FOR_PICKUP' && !order.deliveryId
          ? 'Order accepted. Pick it up from the restaurant when ready.'
          : order.status === 'READY_FOR_PICKUP'
            ? 'Order marked as picked up.'
            : 'Order marked as delivered.',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not update this order. Refresh and try again.'));
    } finally {
      setBusyOrderId('');
    }
  };

  return (
    <div className="page page--delivery container">
      <header className="delivery-heading">
        <div>
          <span className="eyebrow">Delivery dashboard</span>
          <h1>Hi, {user.name}</h1>
          <p>View pickup details and update each order as you deliver it. No maps or tracking.</p>
        </div>
        <button type="button" className="button button--ghost" onClick={handleRefresh} disabled={refreshing || loading}>
          {refreshing ? 'Refreshing…' : 'Refresh orders'}
        </button>
      </header>

      {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
      {notice ? <p className="delivery-notice" role="status">{notice}</p> : null}
      {loading ? <p className="empty-state">Loading delivery orders…</p> : null}

      {!loading ? (
        <div className="delivery-sections">
          <OrderSection
            title="Available to deliver"
            description="Orders ready for pickup that have not been accepted."
            orders={availableOrders}
            emptyText="There are no orders waiting for pickup."
            action={{ label: 'Accept order' }}
            busyOrderId={busyOrderId}
            onAction={handleAction}
          />
          <OrderSection
            title="Picked up & in progress"
            description="Accepted orders waiting for pickup, in transit, or ready to be marked delivered."
            orders={[...waitingForPickup, ...outForDelivery]}
            emptyText="Your accepted orders will appear here."
            action={(order) => ({
              label: order.status === 'READY_FOR_PICKUP' ? 'Mark as picked up' : 'Mark as delivered',
            })}
            busyOrderId={busyOrderId}
            onAction={handleAction}
          />
          <OrderSection
            title="Delivered"
            description="Completed orders assigned to you."
            orders={deliveredOrders}
            emptyText="Delivered orders will appear here."
          />
        </div>
      ) : null}

      <p className="delivery-footer"><Link to="/">Back to home</Link></p>
    </div>
  );
}

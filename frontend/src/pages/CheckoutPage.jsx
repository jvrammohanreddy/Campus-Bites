import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../services/api';
import { loadRazorpay } from '../services/razorpay';

export default function CheckoutPage() {
  const { user } = useAuth();
  const {
    items,
    restaurantId,
    subtotal,
    deliveryFee,
    total,
    updateQuantity,
    clearCart,
  } = useCart();
  const [location, setLocation] = useState(user?.hostel || '');
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState('');

  const validateCheckout = () => {
    if (!user?.token) {
      setError('Log in with your customer account before checkout.');
      return false;
    }
    if (!restaurantId || !location.trim()) {
      setError('Choose a restaurant and enter a delivery location.');
      return false;
    }

    return true;
  };

  const handleCashOnDelivery = async () => {
    if (!validateCheckout()) return;

    setError('');
    setIsPaying(true);
    try {
      const { data } = await api.post('/orders', {
        restaurantId,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
        deliveryLocation: location.trim(),
      });
      setOrderId(data._id);
      setOrderPaymentMethod('COD');
      clearCart();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to place your order. Please try again.',
      );
    } finally {
      setIsPaying(false);
    }
  };

  const startPayment = async () => {
    if (!validateCheckout()) return;

    setError('');
    setIsPaying(true);

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Razorpay checkout could not be loaded. Check your internet connection.');
      }

      const { data: paymentOrder } = await api.post('/payments/order', {
        restaurantId,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
        })),
        deliveryLocation: location.trim(),
      });

      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: 'Campus Bites',
        description: `Order from ${paymentOrder.restaurantName}`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: paymentOrder.studentName,
          email: paymentOrder.studentEmail,
        },
        theme: { color: '#f97316' },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
        handler: async (paymentResponse) => {
          setIsPaying(false);
          setIsVerifying(true);
          setError('');
          try {
            const { data } = await api.post('/payments/verify', paymentResponse);
            setOrderId(data.orderId);
            setOrderPaymentMethod('ONLINE');
            clearCart();
          } catch (verificationError) {
            setError(
              verificationError.response?.data?.message ||
                'Payment was submitted but could not be verified. Contact support before trying again.',
            );
          } finally {
            setIsVerifying(false);
          }
        },
      });

      checkout.on('payment.failed', (event) => {
        setIsPaying(false);
        setError(event.error?.description || 'Payment failed. You have not been charged successfully.');
      });
      checkout.open();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'Unable to start payment. Please try again.',
      );
      setIsPaying(false);
    }
  };

  if (orderId) {
    return (
      <div className="page page--checkout container">
        <div className="empty-order-state success-order-state">
          <span className="eyebrow">{orderPaymentMethod === 'COD' ? 'Cash on delivery' : 'Payment verified'}</span>
          <h1>Order placed successfully</h1>
          <p>
            {orderPaymentMethod === 'COD'
              ? 'Pay cash when your order is delivered.'
              : 'Your online payment is confirmed.'}
            {' '}Order reference: {orderId}
          </p>
          <Link to="/restaurants" className="button button--primary">
            Back to restaurants
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="page page--checkout container">
        <div className="empty-order-state">
          <h1>Your cart is empty</h1>
          <p>Pick your favorite campus food and build a fresh order.</p>
          <Link to="/restaurants" className="button button--primary">
            Browse restaurants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--checkout container">
      <div className="checkout-layout">
        <section className="checkout-panel">
          <div className="section-heading section-heading--stacked">
            <div>
              <span className="eyebrow">Checkout</span>
              <h1>Your order</h1>
            </div>
          </div>

          <div className="order-items">
            {items.map((item) => (
              <div key={item.id} className="order-item">
                <div>
                  <h3>{item.name}</h3>
                  <p>₹{item.price} each</p>
                </div>

                <div className="order-item__controls">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Decrease ${item.name}`}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Increase ${item.name}`}>
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="summary-panel">
          <h2>Order summary</h2>

          <label className="summary-field">
            Delivery location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Hostel and room number"
              maxLength={160}
              required
            />
          </label>

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>₹{subtotal}</strong>
          </div>
          <div className="summary-row">
            <span>Delivery fee</span>
            <strong>₹{deliveryFee}</strong>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <strong>₹{total}</strong>
          </div>

          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
          <fieldset className="payment-methods" disabled={isPaying || isVerifying}>
            <legend>Payment method</legend>
            <label className={`payment-method${paymentMethod === 'ONLINE' ? ' payment-method--selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="ONLINE"
                checked={paymentMethod === 'ONLINE'}
                onChange={() => setPaymentMethod('ONLINE')}
              />
              <span className="payment-method__copy">
                <strong>Online payment</strong>
                <small>Pay securely with Razorpay</small>
              </span>
              <span className="payment-method__mark" aria-hidden="true">↗</span>
            </label>
            <label className={`payment-method${paymentMethod === 'COD' ? ' payment-method--selected' : ''}`}>
              <input
                type="radio"
                name="paymentMethod"
                value="COD"
                checked={paymentMethod === 'COD'}
                onChange={() => setPaymentMethod('COD')}
              />
              <span className="payment-method__copy">
                <strong>Cash on delivery</strong>
                <small>Pay the delivery person in cash</small>
              </span>
              <span className="payment-method__mark" aria-hidden="true">₹</span>
            </label>
          </fieldset>

          {isVerifying ? (
            <p role="status">Verifying online payment securely…</p>
          ) : (
            <button
              type="button"
              className="button button--primary button--full"
              onClick={paymentMethod === 'COD' ? handleCashOnDelivery : startPayment}
              disabled={isPaying}
            >
              {isPaying
                ? (paymentMethod === 'COD' ? 'Placing order…' : 'Starting secure checkout…')
                : (paymentMethod === 'COD' ? `Place order · Pay ₹${total} on delivery` : `Pay ₹${total} online`)}
            </button>
          )}
          {paymentMethod === 'ONLINE' ? (
            <p className="payment-disclaimer">
              All online payments are processed securely through Razorpay. Your payment details are not stored by Campus Bites.
            </p>
          ) : (
            <p className="payment-disclaimer">Have the exact cash amount ready when your order arrives.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

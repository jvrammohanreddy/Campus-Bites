import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DeliveryRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await register({ ...form, role: 'DELIVERY' });
      navigate('/delivery');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page page--auth">
      <section className="auth-card">
        <div className="auth-card__header">
          <span className="eyebrow">Delivery account</span>
          <h1>Sign up as a delivery person</h1>
          <p>Use your personal email and phone. No maps or location tracking are used.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full name
            <input type="text" name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
          </label>

          <label>
            Personal email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Phone number
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              maxLength={30}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </label>

          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

          <button type="submit" className="button button--primary button--full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create delivery account'}
          </button>
        </form>

        <p className="auth-footer">
          Restaurant owner? <Link to="/register/vendor">Use the owner form</Link>
          <br />
          Customer? <Link to="/register/customer">Use the customer form</Link>
          <br />
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}

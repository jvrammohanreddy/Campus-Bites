import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CustomerRegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    hostel: '',
    roomNumber: '',
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
      await register({ ...form, role: 'STUDENT' });
      navigate('/restaurants');
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
          <span className="eyebrow">Customer account</span>
          <h1>Sign up as a customer</h1>
          <p>Use your IITB email to order from campus restaurants.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full name
            <input type="text" name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
          </label>

          <label>
            IITB email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@iitb.ac.in"
              autoComplete="email"
              pattern=".+@iitb\.ac\.in"
              title="Use your IITB email address."
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

          <div className="two-column-fields">
            <label>
              Hostel
              <input type="text" name="hostel" value={form.hostel} onChange={handleChange} />
            </label>
            <label>
              Room number
              <input type="text" name="roomNumber" value={form.roomNumber} onChange={handleChange} />
            </label>
          </div>

          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

          <button type="submit" className="button button--primary button--full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create customer account'}
          </button>
        </form>

        <p className="auth-footer">
          Restaurant owner? <Link to="/register/vendor">Sign up here</Link>
          <br />
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'aisha@iitb.ac.in', password: 'demo123' });
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(form);
      navigate('/restaurants');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to log in right now. Please try again.');
    }
  };

  return (
    <div className="page page--auth">
      <div className="auth-card">
        <div className="auth-card__header">
          <span className="eyebrow">Welcome back</span>
          <h1>Login to Campus Bites</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            IITB email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@iitb.ac.in"
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
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <p className="form-message form-message--error">{error}</p> : null}

          <button type="submit" className="button button--primary button--full">
            Login
          </button>
        </form>

        <p className="auth-footer">
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}

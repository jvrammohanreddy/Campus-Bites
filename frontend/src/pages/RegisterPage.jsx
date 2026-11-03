import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialState = {
  name: '',
  email: '',
  password: '',
  role: 'STUDENT',
  hostel: '',
  roomNumber: '',
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'VENDOR' ? '/vendor' : '/restaurants');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create your account. Please try again.');
    }
  };

  return (
    <div className="page page--auth">
      <div className="auth-card">
        <div className="auth-card__header">
          <span className="eyebrow">New here?</span>
          <h1>Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Full name
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </label>

          <label>
            IITB email
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>

          <label>
            Password
            <input type="password" name="password" value={form.password} onChange={handleChange} required />
          </label>

          <label>
            Account type
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="STUDENT">Student</option>
              <option value="VENDOR">Restaurant vendor</option>
            </select>
          </label>

          <div className="two-column-fields">
            <label>
              Hostel
              <input type="text" name="hostel" value={form.hostel} onChange={handleChange} />
            </label>
            <label>
              Room no.
              <input type="text" name="roomNumber" value={form.roomNumber} onChange={handleChange} />
            </label>
          </div>

          {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}

          <button type="submit" className="button button--primary button--full">
            Sign up
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

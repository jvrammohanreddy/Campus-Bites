import { Link } from 'react-router-dom';

export default function RegisterPage() {
  return (
    <div className="page page--auth">
      <section className="auth-card registration-choice">
        <div className="auth-card__header">
          <span className="eyebrow">Join Campus Bites</span>
          <h1>Choose your account type</h1>
          <p>Pick the sign-up form that matches how you’ll use Campus Bites.</p>
        </div>

        <div className="registration-choice__grid">
          <Link className="registration-choice__card" to="/register/customer">
            <span className="registration-choice__icon" aria-hidden="true">C</span>
            <span>
              <strong>Customer</strong>
              <small>Order food with your IITB account.</small>
            </span>
            <span className="registration-choice__arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="registration-choice__card" to="/register/vendor">
            <span className="registration-choice__icon registration-choice__icon--vendor" aria-hidden="true">R</span>
            <span>
              <strong>Restaurant owner</strong>
              <small>Manage your restaurant with a personal email.</small>
            </span>
            <span className="registration-choice__arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="registration-choice__card" to="/register/delivery">
            <span className="registration-choice__icon registration-choice__icon--delivery" aria-hidden="true">D</span>
            <span>
              <strong>Delivery person</strong>
              <small>Accept available orders and update delivery status.</small>
            </span>
            <span className="registration-choice__arrow" aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}

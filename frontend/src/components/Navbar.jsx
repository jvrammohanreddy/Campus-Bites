import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="topbar">
      <div className="container topbar__inner">
        <Link to="/" className="brand" aria-label="Campus Bites home">
          <span className="brand__mark">CB</span>
          <span>Campus Bites</span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/restaurants">Restaurants</NavLink>
          <NavLink to="/checkout">Checkout</NavLink>
        </nav>

        <div className="nav-actions">
          <Link to="/checkout" className="cart-pill" aria-label="Cart">
            Cart <span>{itemCount}</span>
          </Link>

          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">{user?.name}</span>
              <button type="button" onClick={handleLogout} className="button button--ghost">
                Logout
              </button>
            </div>
          ) : (
            <div className="user-menu">
              <Link to="/login" className="button button--ghost">
                Login
              </Link>
              <Link to="/register" className="button button--primary">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

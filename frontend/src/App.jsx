import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerRegisterPage from './pages/CustomerRegisterPage';
import VendorRegisterPage from './pages/VendorRegisterPage';
import RestaurantsPage from './pages/RestaurantsPage';
import CheckoutPage from './pages/CheckoutPage';
import VendorDashboard from './pages/VendorDashboard';
import AccountPage from './pages/AccountPage';
import DeliveryRegisterPage from './pages/DeliveryRegisterPage';
import DeliveryDashboard from './pages/DeliveryDashboard';

function AppShell() {
  return (
    <>
      <Navbar />
      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/customer" element={<CustomerRegisterPage />} />
          <Route path="/register/vendor" element={<VendorRegisterPage />} />
          <Route path="/register/delivery" element={<DeliveryRegisterPage />} />
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/delivery" element={<DeliveryDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell />
      </CartProvider>
    </AuthProvider>
  );
}

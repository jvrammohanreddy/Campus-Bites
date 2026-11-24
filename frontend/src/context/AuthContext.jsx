import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'campus-bites-user';

function getStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());

  const persistUser = (nextUser) => {
    if (nextUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const nextUser = response.data;
    setUser(nextUser);
    persistUser(nextUser);
    return nextUser;
  };

  const register = async (payload) => {
    const response = await api.post('/auth/register', payload);
    const nextUser = response.data;
    setUser(nextUser);
    persistUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

  const updateUser = (updates) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...updates };
      persistUser(nextUser);
      return nextUser;
    });
  };

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated: Boolean(user),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

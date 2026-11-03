import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem('campus-bites-user');

  if (storedUser) {
    try {
      const { token } = JSON.parse(storedUser);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      localStorage.removeItem('campus-bites-user');
    }
  }

  return config;
});

export default api;

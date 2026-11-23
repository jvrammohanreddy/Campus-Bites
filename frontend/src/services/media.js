import api from './api';

export function getMediaUrl(imagePath) {
  if (!imagePath) return '';

  const apiBase = new URL(api.defaults.baseURL || '/', window.location.origin);
  return new URL(imagePath, apiBase).toString();
}

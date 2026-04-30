export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const apiFetch = (url, options) => {
  const fullUrl = url.startsWith('http') ? url : API_BASE + url;
  return fetch(fullUrl, options);
};
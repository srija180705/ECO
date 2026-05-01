const localApiBase = 'http://localhost:4000';
const prodApiBase = import.meta.env.VITE_API_BASE || '';
export const API_BASE = import.meta.env.DEV ? localApiBase : prodApiBase.replace(/\/$/, '');

export const apiFetch = (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  return fetch(fullUrl, options);
};
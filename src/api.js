const prodApiBase = import.meta.env.VITE_API_BASE || '';

/**
 * In development, use relative URLs so the Vite dev server proxies `/api` and `/uploads`
 * to the backend (see vite.config.js). Calling localhost:4000 directly often breaks login
 * due to mixed setups, firewalls, or CORS edge cases.
 */
export const API_BASE = import.meta.env.DEV ? '' : prodApiBase.replace(/\/$/, '');

export const apiFetch = (url, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  return fetch(fullUrl, options);
};
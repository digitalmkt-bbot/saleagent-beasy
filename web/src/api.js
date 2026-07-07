const TOKEN_KEY = 'jubili_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body, params } = {}) {
  const BASE = import.meta.env.VITE_API_URL || '/api';
  let url = BASE + path;
  if (params) { const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)); url += '?' + q; }
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { setToken(null); if (!path.includes('login')) location.href = '/login'; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'error ' + res.status);
  return data;
}
export const baht = (n) => 'THB ' + Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 });

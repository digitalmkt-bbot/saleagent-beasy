import { createContext, useContext, useState } from 'react';
import { api, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jubili_user')); } catch { return null; }
  });
  async function login(email, password) {
    const r = await api('/login', { method: 'POST', body: { email, password } });
    setToken(r.token);
    localStorage.setItem('jubili_user', JSON.stringify(r.user));
    setUser(r.user);
  }
  async function resetPassword(email, current, newPassword) {
    const r = await api('/login', { method: 'POST', body: { email, password: current, newPassword } });
    setToken(r.token);
    localStorage.setItem('jubili_user', JSON.stringify(r.user));
    setUser(r.user);
  }
  function logout() { setToken(null); localStorage.removeItem('jubili_user'); setUser(null); location.href = '/login'; }
  return <Ctx.Provider value={{ user, login, logout, resetPassword }}>{children}</Ctx.Provider>;
}

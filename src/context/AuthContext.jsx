import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Bootstrap: verify token against server, not just localStorage ── */
  useEffect(() => {
    const token = localStorage.getItem('aan_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // FIX: Always verify token validity with the server on startup
    authAPI.getMe()
      .then(({ data }) => {
        setUser(data.user);
        // Sync updated user data back to localStorage
        localStorage.setItem('aan_user', JSON.stringify(data.user));
      })
      .catch(() => {
        // Token is expired or invalid — clear everything
        localStorage.removeItem('aan_token');
        localStorage.removeItem('aan_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ── Login ───────────────────────────────────────────────── */
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('aan_token', data.token);
    localStorage.setItem('aan_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /* ── Register ────────────────────────────────────────────── */
  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    return data;
  }, []);

  /* ── Verify OTP ──────────────────────────────────────────── */
  const verifyOtp = useCallback(async (email, otp) => {
    const { data } = await authAPI.verifyOtp({ email, otp });
    localStorage.setItem('aan_token', data.token);
    localStorage.setItem('aan_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  /* ── Logout ──────────────────────────────────────────────── */
  const logout = useCallback(() => {
    localStorage.removeItem('aan_token');
    localStorage.removeItem('aan_user');
    setUser(null);
  }, []);

  /* ── Update stored user (partial update) ────────────────── */
  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('aan_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;

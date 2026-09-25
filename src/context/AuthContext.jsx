import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Bootstrap: restore the saved session and load the profile ── */
  useEffect(() => {
    authAPI.restoreSession()
      .then(u => setUser(u || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Keep in sync with sign-outs from other tabs or expired sessions
    return authAPI.onSignedOut(() => setUser(null));
  }, []);

  /* ── Login ───────────────────────────────────────────────── */
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
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
    setUser(data.user);
    return data.user;
  }, []);

  /* ── Logout ──────────────────────────────────────────────── */
  const logout = useCallback(() => {
    authAPI.logout();
    setUser(null);
  }, []);

  /* ── Update in-memory user (partial update) ─────────────── */
  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
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

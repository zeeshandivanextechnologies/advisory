import axios from 'axios';
import { supabase } from '../lib/supabase';

/*
 * REST API layer: talks to the Express server in backend/ (REACT_APP_BACKEND=express).
 * Same exports and response shapes as api.supabase.js.
 */

const TOKEN_KEY = 'aan_token';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/auth')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

const saveToken = (res) => {
  if (res.data?.token) localStorage.setItem(TOKEN_KEY, res.data.token);
  return res;
};

/* ── Auth ──────────────────────────────────────────────────── */
export const authAPI = {
  login:          (data) => api.post('/auth/login', data).then(saveToken),
  register:       (data) => api.post('/auth/register', data),
  verifyOtp:      (data) => api.post('/auth/verify-otp', data).then(saveToken),
  resendOtp:      (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  getMe:          ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),

  // `token` comes from the emailed link (?token=…). Older links sent by Supabase
  // sign the browser in instead, so fall back to that session's access token.
  resetPassword: async ({ token, password }) => {
    if (token) return api.post('/auth/reset-password', { token, password });
    const { data: { session } } = await supabase.auth.getSession();
    const res = await api.post('/auth/reset-password', { token: session?.access_token, password });
    await supabase.auth.signOut();
    return res;
  },

  /* Session helpers used by AuthContext */
  restoreSession: async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try {
      const { data } = await api.get('/auth/me');
      return data.user;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  },
  logout: () => localStorage.removeItem(TOKEN_KEY),
  // Logging out in another tab removes the token there
  onSignedOut: (cb) => {
    const handler = (e) => { if (e.key === TOKEN_KEY && !e.newValue) cb(); };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};

/* ── Users ─────────────────────────────────────────────────── */
export const userAPI = {
  getDashboard:        ()         => api.get('/users/dashboard'),
  getProfile:          ()         => api.get('/users/profile'),
  updateProfile:       (data)     => api.put('/users/profile', data),
  getConsultations:    (p)        => api.get('/users/consultations', { params: p }),
  bookConsultation:    (data)     => api.post('/users/consultations', data),
  updateConsultation:  (id, data) => api.put(`/users/consultations/${id}`, data),
  getConsultationJoin: (id)       => api.get(`/users/consultations/${id}/join`),
  getNotificationPrefs:    ()     => api.get('/users/notification-prefs'),
  updateNotificationPrefs: (data) => api.put('/users/notification-prefs', data),
};

/* ── Advisors ──────────────────────────────────────────────── */
export const advisorAPI = {
  list:          (p)    => api.get('/advisors', { params: p }),
  getDashboard:  ()     => api.get('/advisors/dashboard'),
  getProfile:    ()     => api.get('/advisors/profile'),
  updateProfile: (data) => api.put('/advisors/profile', data),
};

/* ── Cases ─────────────────────────────────────────────────── */
export const caseAPI = {
  list:   (p)        => api.get('/cases', { params: p }),
  create: (data)     => api.post('/cases', data),
  update: (id, data) => api.put(`/cases/${id}`, data),
};

/* ── Documents ─────────────────────────────────────────────── */
export const documentAPI = {
  list:     (p)        => api.get('/documents', { params: p }),
  upload:   (fd)       => api.post('/documents', fd),
  download: (id)       => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  review:   (id, data) => api.put(`/documents/${id}/review`, data),
  delete:   (id)       => api.delete(`/documents/${id}`),
};

/* ── Case workspace: milestones, kickoff checklist, status updates ── */
export const caseWorkspaceAPI = {
  getDetail:           (caseId)           => api.get(`/cases/${caseId}`),
  saveMilestone:       (caseId, id, data) => id
    ? api.put(`/cases/${caseId}/milestones/${id}`, data)
    : api.post(`/cases/${caseId}/milestones`, data),
  deleteMilestone:     (id)               => api.delete(`/milestones/${id}`),
  saveChecklistItem:   (caseId, id, data) => id
    ? api.put(`/cases/${caseId}/checklist/${id}`, data)
    : api.post(`/cases/${caseId}/checklist`, data),
  deleteChecklistItem: (id)               => api.delete(`/checklist/${id}`),
  addUpdate:           (caseId, data)     => api.post(`/cases/${caseId}/updates`, data),
};

/* ── Pre-call intake ───────────────────────────────────────── */
export const intakeAPI = {
  save: (data)          => api.put('/intake', data),
  get:  (userId = null) => api.get(userId ? `/intake/${userId}` : '/intake'),
};

/* ── Notifications ─────────────────────────────────────────── */
export const notifAPI = {
  list:     (p)         => api.get('/notifications', { params: p }),
  markRead: (data = {}) => api.post('/notifications/read', data),
};

/* ── Admin ─────────────────────────────────────────────────── */
export const adminAPI = {
  getDashboard:        (p)        => api.get('/admin/dashboard', { params: p }),
  getUsers:            (p)        => api.get('/admin/users', { params: p }),
  toggleUserStatus:    (id)       => api.put(`/admin/users/${id}/toggle`),
  getAdvisors:         (p)        => api.get('/admin/advisors', { params: p }),
  updateAdvisorStatus: (id, data) => api.put(`/admin/advisors/${id}/status`, data),
  getRevenue:          ()         => api.get('/admin/revenue'),
  getSettings:         ()         => api.get('/admin/settings'),
  updateSettings:      (data)     => api.put('/admin/settings', data),
  getLeads:            (p)        => api.get('/admin/leads', { params: p }),
  updateLead:          (id, data) => api.put(`/admin/leads/${id}`, data),
};

/* ── Subscriptions & payments ──────────────────────────────── */
export const subscriptionAPI = {
  getPlans:        ()      => api.get('/subscriptions/plans'),
  getMyPlan:       ()      => api.get('/subscriptions/my-subscription'),
  purchase:        (data)  => api.post('/subscriptions/purchase', data),
  adminGetPlans:   ()      => api.get('/subscriptions/admin/plans'),
  adminCreatePlan: (data)  => api.post('/subscriptions/admin/plans', data),
  adminUpdatePlan: (id, d) => api.put(`/subscriptions/admin/plans/${id}`, d),
  adminDeletePlan: (id)    => api.delete(`/subscriptions/admin/plans/${id}`),
  // After returning from Stripe Checkout (?session_id=...)
  confirmCheckout: (sessionId) => api.get('/payments/stripe/confirm', { params: { session_id: sessionId } }),
};

export const paymentAPI = {
  list: () => api.get('/payments'),
};

/* ── Public (no login needed) ──────────────────────────────── */
export const publicAPI = {
  getSettings: ()     => api.get('/settings'),
  getPlans:    ()     => api.get('/subscriptions/plans'),
  contact:     (data) => api.post('/contact', data),
};

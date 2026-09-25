import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Public API (no auth interceptor) — for settings, plans, etc. ── */
export const publicApi = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aan_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aan_token');
      localStorage.removeItem('aan_user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  register:       (data) => api.post('/auth/register', data),
  verifyOtp:      (data) => api.post('/auth/verify-otp', data),
  resendOtp:      (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  getMe:          ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const userAPI = {
  getDashboard:          ()         => api.get('/users/dashboard'),
  getProfile:            ()         => api.get('/users/profile'),
  updateProfile:         (data)     => api.put('/users/profile', data),
  updateAvatar:          (fd)       => api.put('/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getConsultations:      (p)        => api.get('/users/consultations', { params: p }),
  bookConsultation:      (data)     => api.post('/users/consultations', data),
  updateConsultation:    (id, data) => api.put(`/users/consultations/${id}`, data),
  getConsultationJoin:   (id)       => api.get(`/users/consultations/${id}/join`),
};

export const advisorAPI = {
  list:          (p)    => api.get('/advisors', { params: p }),
  getById:       (id)   => api.get(`/advisors/${id}`),
  getDashboard:  ()     => api.get('/advisors/dashboard'),
  getProfile:    ()     => api.get('/advisors/profile'),   // FIX: added — fetches own full profile
  updateProfile: (data) => api.put('/advisors/profile', data),
};

export const caseAPI = {
  list:   (p)        => api.get('/cases', { params: p }),
  getById:(id)       => api.get(`/cases/${id}`),
  create: (data)     => api.post('/cases', data),
  update: (id, data) => api.put(`/cases/${id}`, data),
  delete: (id)       => api.delete(`/cases/${id}`),
};

export const documentAPI = {
  list:   (p)        => api.get('/documents', { params: p }),
  upload: (fd)       => api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id)     => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  review: (id, data) => api.put(`/documents/${id}/review`, data),
  delete: (id)       => api.delete(`/documents/${id}`),
};

export const notifAPI = {
  list:     (p)    => api.get('/notifications', { params: p }),
  markRead: (data) => api.post('/notifications/read', data),
};

export const adminAPI = {
  getDashboard:        ()         => api.get('/admin/dashboard'),
  getUsers:            (p)        => api.get('/admin/users', { params: p }),
  toggleUserStatus:    (id)       => api.put(`/admin/users/${id}/toggle`),
  getAdvisors:         (p)        => api.get('/admin/advisors', { params: p }),
  updateAdvisorStatus: (id, data) => api.put(`/admin/advisors/${id}/status`, data),
  getRevenue:          (p)        => api.get('/admin/revenue', { params: p }),
  getSettings:         ()         => api.get('/admin/settings'),
  updateSettings:      (data)     => api.put('/admin/settings', data),
};

export const paymentAPI = {
  create: (data) => api.post('/payments', data),
  list:   (p)    => api.get('/payments', { params: p }),
};

export const subscriptionAPI = {
  getPlans:       ()     => api.get('/subscriptions/plans'),
  getMyPlan:      ()     => api.get('/subscriptions/my-subscription'),
  purchase:       (data) => api.post('/subscriptions/purchase', data),
  adminGetPlans:  ()     => api.get('/subscriptions/admin/plans'),
  adminCreatePlan:(data) => api.post('/subscriptions/admin/plans', data),
  adminUpdatePlan:(id,d) => api.put(`/subscriptions/admin/plans/${id}`, d),
  adminDeletePlan:(id)   => api.delete(`/subscriptions/admin/plans/${id}`),
};

export default api;

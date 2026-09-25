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
  // After returning from the Tap payment page (?tap_id=chg_...)
  confirmTap:      (tapId)     => api.get('/payments/tap/confirm', { params: { tap_id: tapId } }),
};

export const paymentAPI = {
  list: () => api.get('/payments'),
};

/* ── Services catalog, requests, retainers ─────────────────── */
export const serviceAPI = {
  getCatalog:         ()             => api.get('/services/catalog'),
  requestService:     (data)         => api.post('/services/requests', data),
  getMyRequests:      ()             => api.get('/services/requests'),
  cancelRequest:      (id)           => api.put(`/services/requests/${id}/cancel`),
  getRetainers:       (p)            => api.get('/retainers', { params: p }),
  getRetainer:        (id)           => api.get(`/retainers/${id}`),
  logHours:           (id, data)     => api.post(`/retainers/${id}/logs`, data),
  deleteLog:          (logId)        => api.delete(`/retainer-logs/${logId}`),
  adminGetOfferings:  ()             => api.get('/admin/services/offerings'),
  adminSaveOffering:  (id, data)     => id ? api.put(`/admin/services/offerings/${id}`, data) : api.post('/admin/services/offerings', data),
  adminGetRequests:   (p)            => api.get('/admin/services/requests', { params: p }),
  adminUpdateRequest: (id, data)     => api.put(`/admin/services/requests/${id}`, data),
  adminRequestAction: (id, data)     => api.post(`/admin/services/requests/${id}/action`, data),
  adminSaveRetainer:  (id, data)     => id ? api.put(`/admin/retainers/${id}`, data) : api.post('/admin/retainers', data),
};

/* ── Sales rules: meeting limits, prospect profile ──────────── */
export const salesAPI = {
  getMyStatus:      ()             => api.get('/sales/status'),
  adminGetProfile:  (userId)       => api.get(`/admin/sales/${userId}`),
  adminSetProspect: (userId, data) => api.put(`/admin/sales/${userId}`, data),
};

/* ── Community: memberships, events, market briefs ─────────── */
export const communityAPI = {
  getMemberships:      ()           => api.get('/community/memberships'),
  respondMembership:   (id, accept) => api.put(`/community/memberships/${id}/respond`, { accept }),
  getEvents:           ()           => api.get('/community/events'),
  rsvp:                (id, going)  => api.put(`/community/events/${id}/rsvp`, { going }),
  getBriefs:           ()           => api.get('/community/briefs'),
  adminGetMemberships: (p)          => api.get('/admin/community/memberships', { params: p }),
  adminSaveMembership: (id, data)   => id ? api.put(`/admin/community/memberships/${id}`, data) : api.post('/admin/community/memberships', data),
  adminGetEvents:      ()           => api.get('/admin/community/events'),
  adminSaveEvent:      (id, data)   => id ? api.put(`/admin/community/events/${id}`, data) : api.post('/admin/community/events', data),
  adminDeleteEvent:    (id)         => api.delete(`/admin/community/events/${id}`),
  adminSaveBrief:      (id, data)   => id ? api.put(`/admin/community/briefs/${id}`, data) : api.post('/admin/community/briefs', data),
  adminDeleteBrief:    (id)         => api.delete(`/admin/community/briefs/${id}`),
};

/* ── Client journey: proposals, engagements, invoices, follow-ups ── */
export const journeyAPI = {
  getMyProposals:        ()               => api.get('/proposals'),
  respondProposal:       (id, data)       => api.put(`/proposals/${id}/respond`, data),
  getEngagements:        (p)              => api.get('/engagements', { params: p }),
  getEngagement:         (id)             => api.get(`/engagements/${id}`),
  updateEngagement:      (id, data)       => api.put(`/engagements/${id}`, data),
  addQaItem:             (id, label)      => api.post(`/engagements/${id}/qa`, { label }),
  setQaItem:             (itemId, checked) => api.put(`/engagement-qa/${itemId}`, { checked }),
  payInvoiceOnline:      (id)             => api.post(`/engagement-invoices/${id}/pay`),
  adminGetProposals:     (p)              => api.get('/admin/proposals', { params: p }),
  adminSaveProposal:     (id, data)       => id ? api.put(`/admin/proposals/${id}`, data) : api.post('/admin/proposals', data),
  adminSendProposal:     (id)             => api.post(`/admin/proposals/${id}/send`),
  adminWithdrawProposal: (id)             => api.post(`/admin/proposals/${id}/withdraw`),
  adminGetInvoices:      (p)              => api.get('/admin/engagement-invoices', { params: p }),
  adminRecordPayment:    (id, data)       => api.post(`/admin/engagement-invoices/${id}/payment`, data),
  adminGetFollowups:     (p)              => api.get('/admin/followups', { params: p }),
  adminUpdateFollowup:   (id, data)       => api.put(`/admin/followups/${id}`, data),
};

/* ── Staffing: team directory, team logins, engagement team ── */
export const teamAPI = {
  getMyScope:       ()             => api.get('/team/me'),
  getStaff:         ()             => api.get('/admin/team/staff'),
  saveStaff:        (id, data)     => id ? api.put(`/admin/team/staff/${id}`, data) : api.post('/admin/team/staff', data),
  getLogins:        ()             => api.get('/admin/team/logins'),
  grantLogin:       (email, scope) => api.post('/admin/team/logins', { email, scope }),
  revokeLogin:      (userId)       => api.delete(`/admin/team/logins/${userId}`),
  getEngagementTeam:(id)           => api.get(`/engagements/${id}/team`),
  saveTeamMember:   (engId, data)  => api.put(`/admin/engagements/${engId}/team`, data),
  removeTeamMember: (assignmentId) => api.delete(`/admin/engagement-team/${assignmentId}`),
};

/* ── AI drafts (always reviewed by a person before use) ─────── */
const aiTimeout = { timeout: 180000 };
export const aiAPI = {
  proposalDraft:  (proposalId)   => api.post('/ai/proposal-draft', { proposal_id: proposalId }, aiTimeout),
  leadReply:      (leadId)       => api.post('/ai/lead-reply', { lead_id: leadId }, aiTimeout),
  briefDraft:     (data)         => api.post('/ai/brief-draft', data, aiTimeout),
  financialModel: (engagementId) => api.post('/ai/financial-model', { engagement_id: engagementId }, aiTimeout),
  checklist:      (caseId)       => api.post('/ai/checklist', { case_id: caseId }, aiTimeout),
};

/* ── Deliverables: QA checklist + approval before release ───── */
export const deliverableAPI = {
  list:     (engId)            => api.get(`/engagements/${engId}/deliverables`),
  create:   (engId, fd)        => api.post(`/engagements/${engId}/deliverables`, fd),
  update:   (id, data)         => api.put(`/deliverables/${id}`, data),
  action:   (id, action, note) => api.post(`/deliverables/${id}/action`, { action, note }),
  setQa:    (itemId, checked)  => api.put(`/deliverable-qa/${itemId}`, { checked }),
  download: (id)               => api.get(`/deliverables/${id}/download`, { responseType: 'blob' }),
};

/* ── Law firm / partner MOU workflow ── */
export const partnerAPI = {
  // admin
  list:           (status)          => api.get('/admin/partners', { params: { status } }),
  detail:         (id)              => api.get(`/admin/partners/${id}`),
  create:         (data)            => api.post('/admin/partners', data),
  update:         (id, data)        => api.put(`/admin/partners/${id}`, data),
  createMou:      (id, data)        => api.post(`/admin/partners/${id}/mous`, data),
  updateMou:      (id, mouId, data) => api.put(`/admin/partners/${id}/mous/${mouId}`, data),
  referrals:      (params)          => api.get('/admin/partner-referrals', { params }),
  createReferral: (data)            => api.post('/admin/partner-referrals', data),
  updateReferral: (id, data)        => api.put(`/admin/partner-referrals/${id}`, data),
  reviews:        (quarter)         => api.get('/admin/partner-reviews', { params: { quarter } }),
  saveReview:     (id, data)        => api.put(`/admin/partners/${id}/review`, data),
  // client
  myReferrals:    ()                => api.get('/referrals'),
  respond:        (id, consent)     => api.put(`/referrals/${id}/respond`, { consent }),
};

/* ── Public (no login needed) ──────────────────────────────── */
export const publicAPI = {
  getSettings: ()     => api.get('/settings'),
  getPlans:    ()     => api.get('/subscriptions/plans'),
  contact:     (data) => api.post('/contact', data),
};

import { supabase } from '../lib/supabase';

/*
 * Serverless API layer: talks to Supabase directly (REACT_APP_BACKEND=supabase).
 *
 * Every function keeps the old axios contract so pages don't change:
 * it resolves to `{ data: { data, meta? } }` and rejects with an error that has
 * `err.response.data.message`. All business logic and permission checks live in
 * the `api_*` Postgres functions (backend/supabase/migrations).
 */

const DOCS_BUCKET = 'documents';

const toError = (message, status = 400) => {
  const err = new Error(message || 'Something went wrong');
  err.response = { status, data: { message: err.message } };
  return err;
};

const SESSION_ERRORS = /not authenticated|jwt|permission denied for function|suspended/i;

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    // Equivalent of the old 401 interceptor: drop the session and go to login
    if (SESSION_ERRORS.test(error.message) && !window.location.pathname.startsWith('/auth')) {
      await supabase.auth.signOut();
      window.location.href = '/auth/login';
    }
    throw toError(error.message);
  }
  return data;
};

const ok     = (data) => ({ data: { success: true, data } });
const okList = (res)  => ({ data: { success: true, data: res.data, meta: res.meta } });

const authFail = (error) => { if (error) throw toError(error.message, error.status); };

/* ── Auth ──────────────────────────────────────────────────── */
export const authAPI = {
  login: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    authFail(error);
    try {
      const user = await rpc('api_login');
      return { data: { token: data.session.access_token, user } };
    } catch (err) {
      await supabase.auth.signOut();
      throw err;
    }
  },

  register: async ({ email, password, full_name, role }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, role },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });
    authFail(error);
    return { data: { success: true } };
  },

  verifyOtp: async ({ email, otp }) => {
    let { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) ({ data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' }));
    authFail(error);
    const user = await rpc('api_login');
    return { data: { token: data.session?.access_token, user } };
  },

  resendOtp: async ({ email }) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    authFail(error);
    return ok(null);
  },

  forgotPassword: async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    authFail(error);
    return ok(null);
  },

  // The reset link signs the user in with a recovery session; set the new
  // password on it, then sign out so they log in fresh.
  resetPassword: async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    authFail(error);
    await supabase.auth.signOut();
    return ok(null);
  },

  getMe: async () => ({ data: { user: await rpc('api_me') } }),

  /* Session helpers used by AuthContext */
  restoreSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    try {
      return await rpc('api_me');
    } catch {
      await supabase.auth.signOut();
      return null;
    }
  },
  logout: () => supabase.auth.signOut(),
  onSignedOut: (cb) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') cb();
    });
    return () => subscription.unsubscribe();
  },

  changePassword: async ({ current_password, new_password }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw toError('Not authenticated', 401);
    const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current_password });
    if (verifyErr) throw toError('Current password is incorrect');
    const { error } = await supabase.auth.updateUser({ password: new_password });
    authFail(error);
    return ok(null);
  },
};

/* ── Users ─────────────────────────────────────────────────── */
export const userAPI = {
  getDashboard:        ()         => rpc('api_user_dashboard').then(ok),
  getProfile:          ()         => rpc('api_me').then(ok),
  updateProfile:       (data)     => rpc('api_update_profile', { p: data }).then(ok),
  getConsultations:    (p = {})   => rpc('api_consultations', { p }).then(ok),
  bookConsultation:    (data)     => rpc('api_book_consultation', { p: data }).then(ok),
  updateConsultation:  (id, data) => rpc('api_update_consultation', { p_id: Number(id), p: data }).then(ok),
  getConsultationJoin: (id)       => rpc('api_consultation_join', { p_id: Number(id) }).then(ok),
  getNotificationPrefs:    ()     => rpc('api_notification_prefs').then(ok),
  updateNotificationPrefs: (data) => rpc('api_update_notification_prefs', { p: data }).then(ok),
};

/* ── Advisors ──────────────────────────────────────────────── */
export const advisorAPI = {
  list:          (p = {}) => rpc('api_advisors', { p }).then(ok),
  getDashboard:  ()       => rpc('api_advisor_dashboard').then(ok),
  getProfile:    ()       => rpc('api_advisor_profile').then(ok),
  updateProfile: (data)   => rpc('api_update_advisor_profile', { p: data }).then(ok),
};

/* ── Cases ─────────────────────────────────────────────────── */
export const caseAPI = {
  list:   (p = {})   => rpc('api_cases', { p }).then(okList),
  create: (data)     => rpc('api_create_case', { p: data }).then(ok),
  update: (id, data) => rpc('api_update_case', { p_id: Number(id), p: data }).then(ok),
};

/* ── Documents (files in the private `documents` storage bucket) ── */
export const documentAPI = {
  list: (p = {}) => rpc('api_documents', { p }).then(okList),

  // Accepts the same FormData the page already builds: `file`, `category`, optional `case_id`
  upload: async (fd) => {
    const file = fd.get('file');
    if (!file) throw toError('Please choose a file');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw toError('Not authenticated', 401);

    const safeName = file.name.replace(/[^\w.-]+/g, '_');
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
    });
    if (upErr) throw toError(upErr.message);

    try {
      return ok(await rpc('api_create_document', {
        p: {
          file_path: path,
          original_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          category: fd.get('category') || 'other',
          jurisdiction: fd.get('jurisdiction') || null,
          case_id: fd.get('case_id') || null,
        },
      }));
    } catch (err) {
      await supabase.storage.from(DOCS_BUCKET).remove([path]);
      throw err;
    }
  },

  // Resolves to `{ data: Blob }`, like axios with responseType 'blob'
  download: async (id) => {
    const path = await rpc('api_document_path', { p_id: Number(id) });
    const { data, error } = await supabase.storage.from(DOCS_BUCKET).download(path);
    if (error) throw toError(error.message);
    return { data };
  },

  review: (id, data) => rpc('api_review_document', { p_id: Number(id), p: data }).then(ok),

  delete: async (id) => {
    const path = await rpc('api_delete_document', { p_id: Number(id) });
    await supabase.storage.from(DOCS_BUCKET).remove([path]);
    return ok(null);
  },
};

/* ── Case workspace: milestones, kickoff checklist, status updates ── */
export const caseWorkspaceAPI = {
  getDetail:           (caseId)             => rpc('api_case_detail', { p_id: Number(caseId) }).then(ok),
  saveMilestone:       (caseId, id, data)   => rpc('api_save_milestone', { p_case_id: Number(caseId), p_id: id ? Number(id) : null, p: data }).then(ok),
  deleteMilestone:     (id)                 => rpc('api_delete_milestone', { p_id: Number(id) }).then(ok),
  saveChecklistItem:   (caseId, id, data)   => rpc('api_save_checklist_item', { p_case_id: Number(caseId), p_id: id ? Number(id) : null, p: data }).then(ok),
  deleteChecklistItem: (id)                 => rpc('api_delete_checklist_item', { p_id: Number(id) }).then(ok),
  addUpdate:           (caseId, data)       => rpc('api_add_case_update', { p_case_id: Number(caseId), p: data }).then(ok),
};

/* ── Pre-call intake (onboarding needs + discovery questions) ── */
export const intakeAPI = {
  save: (data)          => rpc('api_save_intake', { p: data }).then(ok),
  get:  (userId = null) => rpc('api_get_intake', { p_user_id: userId }).then(ok),
};

/* ── Notifications ─────────────────────────────────────────── */
export const notifAPI = {
  list:     (p = {})    => rpc('api_notifications', { p }).then(okList),
  markRead: (data = {}) => rpc('api_mark_notifications_read', { p: data }).then(ok),
};

/* ── Admin ─────────────────────────────────────────────────── */
export const adminAPI = {
  getDashboard:        (p = {})   => rpc('api_admin_dashboard', { p_period: p.period || null }).then(ok),
  getUsers:            (p = {})   => rpc('api_admin_users', { p }).then(okList),
  toggleUserStatus:    (id)       => rpc('api_admin_toggle_user', { p_id: id }).then(ok),
  getAdvisors:         (p = {})   => rpc('api_admin_advisors', { p }).then(okList),
  updateAdvisorStatus: (id, data) => rpc('api_admin_update_advisor_status', { p_id: Number(id), p_status: data.status }).then(ok),
  getRevenue:          ()         => rpc('api_admin_revenue').then(ok),
  getSettings:         ()         => rpc('api_admin_settings').then(ok),
  updateSettings:      (data)     => rpc('api_admin_update_settings', { p: data }).then(ok),
  getLeads:            (p = {})   => rpc('api_admin_leads', { p }).then(okList),
  updateLead:          (id, data) => rpc('api_admin_update_lead', { p_id: Number(id), p: data }).then(ok),
};

/* ── Subscriptions & payments ──────────────────────────────── */
export const subscriptionAPI = {
  getPlans:        ()      => rpc('api_plans').then(ok),
  getMyPlan:       ()      => rpc('api_my_subscription').then(ok),
  purchase:        (data)  => rpc('api_purchase_plan', { p: data }).then(ok),
  adminGetPlans:   ()      => rpc('api_admin_plans').then(ok),
  adminCreatePlan: (data)  => rpc('api_admin_save_plan', { p_id: null, p: data }).then(ok),
  adminUpdatePlan: (id, d) => rpc('api_admin_save_plan', { p_id: Number(id), p: d }).then(ok),
  adminDeletePlan: (id)    => rpc('api_admin_delete_plan', { p_id: Number(id) }).then(ok),
  // Online checkout needs the Express server; nothing to confirm in serverless mode
  confirmCheckout: ()      => Promise.resolve(ok(null)),
};

export const paymentAPI = {
  list: () => rpc('api_payments').then(ok),
};

/* ── Public (no login needed) ──────────────────────────────── */
export const publicAPI = {
  getSettings: ()     => rpc('api_public_settings').then(ok),
  getPlans:    ()     => rpc('api_plans').then(ok),
  contact:     (data) => rpc('api_contact', { p: data }).then(ok),
};

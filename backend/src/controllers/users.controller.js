const { rpc, pool } = require('../config/db');
const { send } = require('../utils/http');
const { sendMailSafe } = require('../services/mailer');
const { wantsEmail, contactFor } = require('../services/prefs');
const tpl = require('../services/emailTemplates');

exports.dashboard = async (req, res) => send(res, await rpc('api_user_dashboard', {}, req.userId));

exports.getProfile = async (req, res) => send(res, await rpc('api_me', {}, req.userId));

exports.updateProfile = async (req, res) =>
  send(res, await rpc('api_update_profile', { p: req.body }, req.userId));

// Used by clients and advisors; the function returns each caller's own sessions
exports.listConsultations = async (req, res) =>
  send(res, await rpc('api_consultations', { p: req.query }, req.userId));

exports.bookConsultation = async (req, res) => {
  const c = await rpc('api_book_consultation', { p: req.body }, req.userId);
  send(res, c, 201);
  emailBooking(c).catch((err) => console.error('[mail] booking emails failed:', err.message));
};

// Confirmation to the client and a heads-up to the advisor
const emailBooking = async (c) => {
  const { rows: [r] } = await pool.query(
    `select u.full_name as client_name, u.email as client_email,
            ap.full_name as advisor_name, ap.email as advisor_email
       from public.profiles u, public.advisors a join public.profiles ap on ap.id = a.profile_id
      where u.id = $1 and a.id = $2`,
    [c.user_id, c.advisor_id]
  );
  if (!r) return;
  const common = { when: c.scheduled_at, duration: c.duration_min, medium: c.medium };
  sendMailSafe({ to: r.client_email, ...tpl.bookingClient({ ...common, name: r.client_name, advisorName: r.advisor_name }) });
  sendMailSafe({ to: r.advisor_email, ...tpl.bookingAdvisor({ ...common, name: r.advisor_name, clientName: r.client_name, notes: c.user_notes }) });
};

exports.updateConsultation = async (req, res) => {
  const c = await rpc('api_update_consultation', { p_id: req.params.id, p: req.body }, req.userId);
  send(res, c);

  const handover = Array.isArray(req.body.action_items) || req.body.recording_url;
  if (handover && c.user_id !== req.userId) emailHandover(c);
};

// "Consultant messages" preference covers session notes / action items
const emailHandover = (c) =>
  (async () => {
    if (!(await wantsEmail(c.user_id, 'consultant_messages'))) return;
    const who = await contactFor(c.user_id);
    if (!who) return;
    const items = (c.action_items || [])
      .map((i) => `- ${typeof i === 'string' ? i : i.text}${i && i.owner ? ` (${i.owner})` : ''}`).join('\n');
    const summary = [c.next_step && `Next step: ${c.next_step}`, items, c.recording_url && `Recording: ${c.recording_url}`]
      .filter(Boolean).join('\n\n') || 'Your advisor shared notes from your session.';
    sendMailSafe({ to: who.email, ...tpl.caseUpdate({ name: who.full_name, title: 'Session notes and action items', summary }) });
  })().catch((err) => console.error('[mail] handover email failed:', err.message));

exports.joinConsultation = async (req, res) =>
  send(res, await rpc('api_consultation_join', { p_id: req.params.id }, req.userId));

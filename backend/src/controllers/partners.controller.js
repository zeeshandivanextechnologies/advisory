const { rpc, pool } = require('../config/db');
const { send } = require('../utils/http');
const { sendMailSafe } = require('../services/mailer');
const mail = require('../services/journeyEmails');

/*
 * Law firm / partner MOU workflow: partner profiles, MOUs, referral handoffs
 * (client consent + documented purpose) and quarterly partner reviews.
 */

const emailClient = (referralId, build) => {
  (async () => {
    const { rows: [c] } = await pool.query(
      `select u.email, u.full_name, p.name as partner, r.purpose
         from public.partner_referrals r join public.profiles u on u.id = r.user_id join public.partners p on p.id = r.partner_id
        where r.id = $1`, [referralId]);
    if (c) sendMailSafe({ to: c.email, ...build({ name: c.full_name, partner: c.partner, purpose: c.purpose }) });
  })().catch((err) => console.error('[mail] referral email failed:', err.message));
};

// ── Admin: partners & MOUs ──
exports.list = async (req, res) => {
  const r = await rpc('api_admin_partners', { p: { status: req.query.status || '' } }, req.userId);
  res.json({ success: true, data: r.data, meta: r.meta });
};
exports.detail = async (req, res) => send(res, await rpc('api_admin_partner_detail', { p_id: req.params.id }, req.userId));
exports.create = async (req, res) => send(res, await rpc('api_admin_save_partner', { p_id: null, p: req.body }, req.userId), 201);
exports.update = async (req, res) => send(res, await rpc('api_admin_save_partner', { p_id: req.params.id, p: req.body }, req.userId));
exports.createMou = async (req, res) =>
  send(res, await rpc('api_admin_save_mou', { p_partner_id: req.params.id, p_id: null, p: req.body }, req.userId), 201);
exports.updateMou = async (req, res) =>
  send(res, await rpc('api_admin_save_mou', { p_partner_id: req.params.id, p_id: req.params.mouId, p: req.body }, req.userId));

// ── Admin: referral handoffs ──
exports.referrals = async (req, res) =>
  send(res, await rpc('api_admin_referrals', { p: { status: req.query.status || '', partner_id: req.query.partner_id || '' } }, req.userId));

exports.createReferral = async (req, res) => {
  const r = await rpc('api_admin_create_referral', { p: req.body }, req.userId);
  send(res, r, 201);
  if (r.status === 'awaiting_consent') emailClient(r.id, mail.referralConsent);
};

exports.updateReferral = async (req, res) => {
  const r = await rpc('api_admin_update_referral', { p_id: req.params.id, p: req.body }, req.userId);
  send(res, r);
  if (req.body.status === 'introduced') emailClient(r.id, mail.referralIntroduced);
};

// ── Admin: quarterly reviews ──
exports.reviews = async (req, res) =>
  send(res, await rpc('api_admin_partner_reviews', { p_quarter: req.query.quarter || null }, req.userId));
exports.saveReview = async (req, res) =>
  send(res, await rpc('api_admin_save_partner_review', { p_partner_id: req.params.id, p: req.body }, req.userId));

// ── Client: my introductions + consent ──
exports.myReferrals = async (req, res) => send(res, await rpc('api_my_referrals', {}, req.userId));
exports.respond = async (req, res) =>
  send(res, await rpc('api_respond_referral', { p_id: req.params.id, p_consent: !!req.body.consent }, req.userId));

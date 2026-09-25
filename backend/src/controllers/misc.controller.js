const { rpc } = require('../config/db');
const { send, sendList } = require('../utils/http');
const env = require('../config/env');
const { sendMailSafe } = require('../services/mailer');
const tpl = require('../services/emailTemplates');

/* ── Notifications ── */
exports.listNotifications = async (req, res) =>
  sendList(res, await rpc('api_notifications', { p: req.query }, req.userId));

// Body {} marks everything read; { ids: [..] } marks specific ones
exports.markNotificationsRead = async (req, res) =>
  send(res, await rpc('api_mark_notifications_read', { p: req.body || {} }, req.userId));

/* ── Intake ── */
exports.getMyIntake = async (req, res) => send(res, await rpc('api_get_intake', { p_user_id: null }, req.userId));

exports.getUserIntake = async (req, res) =>
  send(res, await rpc('api_get_intake', { p_user_id: req.params.userId }, req.userId));

exports.saveIntake = async (req, res) => send(res, await rpc('api_save_intake', { p: req.body }, req.userId));

/* ── Subscriptions & payments ── */
exports.plans = async (req, res) => send(res, await rpc('api_plans'));

exports.mySubscription = async (req, res) => send(res, await rpc('api_my_subscription', {}, req.userId));

exports.purchase = async (req, res) => {
  const result = await rpc('api_purchase_plan', { p: req.body }, req.userId);
  send(res, result, 201);

  const pay = result.payment;
  if (pay) {
    rpc('api_me', {}, req.userId)
      .then((me) => rpc('api_my_subscription', {}, req.userId).then((sub) => sendMailSafe({
        to: me.email,
        ...tpl.paymentReceipt({
          name: me.full_name, planName: sub?.plan_name || me.plan, amount: pay.amount,
          currency: pay.currency, invoiceNo: pay.invoice_no, expiresAt: sub?.expires_at,
        }),
      })))
      .catch((err) => console.error('[mail] receipt failed:', err.message));
  }
};

exports.payments = async (req, res) => send(res, await rpc('api_payments', {}, req.userId));

exports.adminPlans = async (req, res) => send(res, await rpc('api_admin_plans', {}, req.userId));

exports.adminCreatePlan = async (req, res) =>
  send(res, await rpc('api_admin_save_plan', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdatePlan = async (req, res) =>
  send(res, await rpc('api_admin_save_plan', { p_id: req.params.id, p: req.body }, req.userId));

exports.adminDeletePlan = async (req, res) =>
  send(res, await rpc('api_admin_delete_plan', { p_id: req.params.id }, req.userId));

/* ── Public ── */
exports.publicSettings = async (req, res) => send(res, await rpc('api_public_settings'));

exports.contact = async (req, res) => {
  await rpc('api_contact', { p: req.body });
  send(res, null, 201);

  const { name, email, company, subject, message } = req.body;
  sendMailSafe({ to: email, ...tpl.contactAck({ name }) });
  if (env.adminEmail) sendMailSafe({ to: env.adminEmail, ...tpl.contactAdmin({ name, email, company, subject, message }) });
};

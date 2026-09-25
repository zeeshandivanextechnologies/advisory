const { rpc } = require('../config/db');
const { send, sendList } = require('../utils/http');
const env = require('../config/env');
const { sendMailSafe } = require('../services/mailer');
const tpl = require('../services/emailTemplates');
const payments = require('../services/payments');
const { wantsEmail } = require('../services/prefs');

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

// Manual gateway: plan activates immediately. Stripe: returns `redirect_url`
// to the hosted checkout page (the Plans page already follows it).
exports.purchase = async (req, res) => {
  if ((await payments.gateway()) !== 'manual') {
    const checkout = await payments.startCheckout(req.userId, req.body.plan_id);
    return res.status(201).json({ success: true, redirect_url: checkout.redirect_url, data: checkout });
  }

  const result = await rpc('api_purchase_plan', { p: req.body }, req.userId);
  send(res, result, 201);

  const pay = result.payment;
  if (pay && (await wantsEmail(req.userId, 'billing_notifs'))) {
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

// Return from Stripe Checkout: /user/plans?session_id=...
exports.confirmCheckout = async (req, res) =>
  send(res, await payments.confirmSession(req.userId, String(req.query.session_id || '')));

// Back from the Tap payment page: ?tap_id=chg_...
exports.confirmTap = async (req, res) =>
  send(res, await payments.confirmTapCharge(req.userId, String(req.query.tap_id || '')));

// Tap -> us. Always answers 200; the charge is verified with the Tap API.
exports.tapWebhook = async (req, res) => {
  await payments.handleTapWebhook(req.body).catch((err) => console.error('[tap webhook]', err.message));
  res.json({ received: true });
};

// Stripe -> us. Needs the raw body for signature verification (see app.js).
exports.stripeWebhook = async (req, res) => {
  await payments.handleWebhook(req.body, req.headers['stripe-signature']);
  res.json({ received: true });
};

/* ── Notification preferences ── */
exports.getNotificationPrefs = async (req, res) => send(res, await rpc('api_notification_prefs', {}, req.userId));

exports.updateNotificationPrefs = async (req, res) =>
  send(res, await rpc('api_update_notification_prefs', { p: req.body }, req.userId));

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

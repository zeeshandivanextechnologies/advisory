const { rpc } = require('../config/db');
const { send, sendList } = require('../utils/http');

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

exports.purchase = async (req, res) => send(res, await rpc('api_purchase_plan', { p: req.body }, req.userId), 201);

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

exports.contact = async (req, res) => send(res, await rpc('api_contact', { p: req.body }), 201);

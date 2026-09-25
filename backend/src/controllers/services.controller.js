const { rpc } = require('../config/db');
const env = require('../config/env');
const { send, sendList } = require('../utils/http');
const { sendMailSafe } = require('../services/mailer');
const tpl = require('../services/emailTemplates');

/* ── Catalog ── */
exports.catalog = async (req, res) => send(res, await rpc('api_service_catalog'));

exports.adminOfferings = async (req, res) => send(res, await rpc('api_admin_offerings', {}, req.userId));

exports.adminCreateOffering = async (req, res) =>
  send(res, await rpc('api_admin_save_offering', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateOffering = async (req, res) =>
  send(res, await rpc('api_admin_save_offering', { p_id: req.params.id, p: req.body }, req.userId));

/* ── Service requests ── */
exports.requestService = async (req, res) => {
  const r = await rpc('api_request_service', { p: req.body }, req.userId);
  send(res, r, 201);

  // Step 2 of the client journey: acknowledge right away, and alert the team
  sendMailSafe({ to: r.client_email, ...tpl.serviceRequestAck({ name: r.client_name, offering: r.offering_name }) });
  if (env.adminEmail) {
    sendMailSafe({ to: env.adminEmail, ...tpl.serviceRequestAdmin({
      name: r.client_name, email: r.client_email, offering: r.offering_name, message: r.message, budget: r.budget,
    }) });
  }
};

exports.myRequests = async (req, res) => send(res, await rpc('api_my_service_requests', {}, req.userId));

exports.cancelRequest = async (req, res) =>
  send(res, await rpc('api_cancel_service_request', { p_id: req.params.id }, req.userId));

exports.adminRequests = async (req, res) =>
  sendList(res, await rpc('api_admin_service_requests', { p: req.query }, req.userId));

exports.adminUpdateRequest = async (req, res) =>
  send(res, await rpc('api_admin_update_service_request', { p_id: req.params.id, p: req.body }, req.userId));

/* ── Retainers ── */
exports.retainers = async (req, res) => send(res, await rpc('api_retainers', { p: req.query }, req.userId));

exports.retainerDetail = async (req, res) =>
  send(res, await rpc('api_retainer_detail', { p_id: req.params.id }, req.userId));

exports.adminCreateRetainer = async (req, res) =>
  send(res, await rpc('api_admin_save_retainer', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateRetainer = async (req, res) =>
  send(res, await rpc('api_admin_save_retainer', { p_id: req.params.id, p: req.body }, req.userId));

exports.logHours = async (req, res) =>
  send(res, await rpc('api_log_retainer_hours', { p_retainer_id: req.params.id, p: req.body }, req.userId), 201);

exports.deleteLog = async (req, res) =>
  send(res, await rpc('api_delete_retainer_log', { p_id: req.params.logId }, req.userId));

/* ── Community: memberships, events, market briefs ── */
exports.myMemberships = async (req, res) => send(res, await rpc('api_my_memberships', {}, req.userId));

exports.respondMembership = async (req, res) =>
  send(res, await rpc('api_respond_membership', { p_id: req.params.id, p_accept: !!req.body.accept }, req.userId));

exports.adminMemberships = async (req, res) => send(res, await rpc('api_admin_memberships', { p: req.query }, req.userId));

exports.adminCreateMembership = async (req, res) =>
  send(res, await rpc('api_admin_save_membership', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateMembership = async (req, res) =>
  send(res, await rpc('api_admin_save_membership', { p_id: req.params.id, p: req.body }, req.userId));

exports.events = async (req, res) => send(res, await rpc('api_events', {}, req.userId));

exports.rsvp = async (req, res) =>
  send(res, await rpc('api_rsvp_event', { p_event_id: req.params.id, p_going: req.body.going !== false }, req.userId));

exports.adminEvents = async (req, res) => send(res, await rpc('api_admin_events', {}, req.userId));

exports.adminCreateEvent = async (req, res) =>
  send(res, await rpc('api_admin_save_event', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateEvent = async (req, res) =>
  send(res, await rpc('api_admin_save_event', { p_id: req.params.id, p: req.body }, req.userId));

exports.adminDeleteEvent = async (req, res) =>
  send(res, await rpc('api_admin_delete_event', { p_id: req.params.id }, req.userId));

exports.briefs = async (req, res) => send(res, await rpc('api_market_briefs', {}, req.userId));

exports.adminCreateBrief = async (req, res) =>
  send(res, await rpc('api_admin_save_brief', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateBrief = async (req, res) =>
  send(res, await rpc('api_admin_save_brief', { p_id: req.params.id, p: req.body }, req.userId));

exports.adminDeleteBrief = async (req, res) =>
  send(res, await rpc('api_admin_delete_brief', { p_id: req.params.id }, req.userId));

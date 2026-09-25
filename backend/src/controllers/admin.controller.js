const { rpc } = require('../config/db');
const { send, sendList } = require('../utils/http');

exports.dashboard = async (req, res) => {
  const period = ['7d', '30d', 'all'].includes(req.query.period) ? req.query.period : null;
  send(res, await rpc('api_admin_dashboard', { p_period: period }, req.userId));
};

exports.users = async (req, res) => sendList(res, await rpc('api_admin_users', { p: req.query }, req.userId));

exports.toggleUser = async (req, res) =>
  send(res, await rpc('api_admin_toggle_user', { p_id: req.params.id }, req.userId));

exports.advisors = async (req, res) => sendList(res, await rpc('api_admin_advisors', { p: req.query }, req.userId));

exports.updateAdvisorStatus = async (req, res) =>
  send(res, await rpc('api_admin_update_advisor_status', { p_id: req.params.id, p_status: req.body.status }, req.userId));

exports.revenue = async (req, res) => send(res, await rpc('api_admin_revenue', {}, req.userId));

exports.getSettings = async (req, res) => send(res, await rpc('api_admin_settings', {}, req.userId));

exports.updateSettings = async (req, res) =>
  send(res, await rpc('api_admin_update_settings', { p: req.body }, req.userId));

exports.leads = async (req, res) => sendList(res, await rpc('api_admin_leads', { p: req.query }, req.userId));

exports.updateLead = async (req, res) =>
  send(res, await rpc('api_admin_update_lead', { p_id: req.params.id, p: req.body }, req.userId));

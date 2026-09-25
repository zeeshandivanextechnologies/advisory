const { rpc } = require('../config/db');
const { send } = require('../utils/http');

/* ── Staffing: team directory, team logins, engagement team ── */
exports.myScope = async (req, res) => send(res, await rpc('api_my_team_scope', {}, req.userId));

exports.staff = async (req, res) => send(res, await rpc('api_admin_staff', {}, req.userId));

exports.createStaff = async (req, res) =>
  send(res, await rpc('api_admin_save_staff', { p_id: null, p: req.body }, req.userId), 201);

exports.updateStaff = async (req, res) =>
  send(res, await rpc('api_admin_save_staff', { p_id: req.params.id, p: req.body }, req.userId));

exports.logins = async (req, res) => send(res, await rpc('api_admin_team_logins', {}, req.userId));

exports.grantLogin = async (req, res) =>
  send(res, await rpc('api_admin_grant_team_login', { p_email: req.body.email || '', p_scope: req.body.scope || '' }, req.userId), 201);

exports.revokeLogin = async (req, res) =>
  send(res, await rpc('api_admin_revoke_team_login', { p_user_id: req.params.userId }, req.userId));

exports.engagementTeam = async (req, res) =>
  send(res, await rpc('api_engagement_team', { p_engagement_id: req.params.id }, req.userId));

exports.saveTeamMember = async (req, res) =>
  send(res, await rpc('api_admin_save_team_member', { p_engagement_id: req.params.id, p: req.body }, req.userId));

exports.removeTeamMember = async (req, res) =>
  send(res, await rpc('api_admin_remove_team_member', { p_id: req.params.assignmentId }, req.userId));

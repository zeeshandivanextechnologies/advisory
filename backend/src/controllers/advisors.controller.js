const { rpc } = require('../config/db');
const { send } = require('../utils/http');

exports.list = async (req, res) => send(res, await rpc('api_advisors', { p: req.query }, req.userId));

exports.dashboard = async (req, res) => send(res, await rpc('api_advisor_dashboard', {}, req.userId));

exports.getProfile = async (req, res) => send(res, await rpc('api_advisor_profile', {}, req.userId));

exports.updateProfile = async (req, res) =>
  send(res, await rpc('api_update_advisor_profile', { p: req.body }, req.userId));

const { rpc } = require('../config/db');
const { send } = require('../utils/http');

exports.dashboard = async (req, res) => send(res, await rpc('api_user_dashboard', {}, req.userId));

exports.getProfile = async (req, res) => send(res, await rpc('api_me', {}, req.userId));

exports.updateProfile = async (req, res) =>
  send(res, await rpc('api_update_profile', { p: req.body }, req.userId));

// Used by clients and advisors; the function returns each caller's own sessions
exports.listConsultations = async (req, res) =>
  send(res, await rpc('api_consultations', { p: req.query }, req.userId));

exports.bookConsultation = async (req, res) =>
  send(res, await rpc('api_book_consultation', { p: req.body }, req.userId), 201);

exports.updateConsultation = async (req, res) =>
  send(res, await rpc('api_update_consultation', { p_id: req.params.id, p: req.body }, req.userId));

exports.joinConsultation = async (req, res) =>
  send(res, await rpc('api_consultation_join', { p_id: req.params.id }, req.userId));

const { rpc } = require('../config/db');
const { authClient, adminClient } = require('../config/supabase');
const { signToken } = require('../middleware/auth');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

/*
 * Accounts live in Supabase Auth (email + password, email OTP). This API
 * verifies credentials there, then issues its own JWT for later requests.
 */

const requireFields = (body, fields) => {
  const missing = fields.filter((f) => !String(body[f] || '').trim());
  if (missing.length) throw new HttpError(400, `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
};

// Loads the profile (and records last_login), then returns { token, user }
const startSession = async (userId) => {
  const user = await rpc('api_login', {}, userId);
  return { token: signToken(user), user };
};

exports.login = async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const { data, error } = await authClient().auth.signInWithPassword({
    email: req.body.email.trim(),
    password: req.body.password,
  });
  if (error) {
    throw new HttpError(401, /confirm/i.test(error.message)
      ? 'Please verify your email before signing in'
      : 'Invalid email or password');
  }
  res.json({ success: true, ...(await startSession(data.user.id)) });
};

exports.register = async (req, res) => {
  requireFields(req.body, ['email', 'password', 'full_name']);
  const { email, password, full_name, role } = req.body;
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const { error } = await authClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: full_name.trim(), role: role === 'advisor' ? 'advisor' : 'user' },
      emailRedirectTo: `${env.frontendUrl}/auth/login`,
    },
  });
  if (error) throw new HttpError(400, error.message);
  res.status(201).json({ success: true, message: 'Verification code sent to your email' });
};

exports.verifyOtp = async (req, res) => {
  requireFields(req.body, ['email', 'otp']);
  const email = req.body.email.trim();
  const token = String(req.body.otp).trim();
  const client = authClient();

  let { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  if (error) ({ data, error } = await client.auth.verifyOtp({ email, token, type: 'signup' }));
  if (error || !data.user) throw new HttpError(400, 'Invalid or expired code');

  res.json({ success: true, ...(await startSession(data.user.id)) });
};

exports.resendOtp = async (req, res) => {
  requireFields(req.body, ['email']);
  const { error } = await authClient().auth.resend({ type: 'signup', email: req.body.email.trim() });
  if (error) throw new HttpError(400, error.message);
  res.json({ success: true, message: 'A new code has been sent' });
};

exports.forgotPassword = async (req, res) => {
  requireFields(req.body, ['email']);
  // Same response whether or not the email exists, so accounts can't be enumerated
  await authClient().auth.resetPasswordForEmail(req.body.email.trim(), {
    redirectTo: `${env.frontendUrl}/auth/reset-password`,
  });
  res.json({ success: true, message: 'If the email is registered, a reset link has been sent' });
};

// `token` is the recovery access token the reset link signs the browser in with
exports.resetPassword = async (req, res) => {
  requireFields(req.body, ['token', 'password']);
  if (req.body.password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(req.body.token);
  if (error || !data.user) throw new HttpError(400, 'Reset link is invalid or has expired');

  const { error: updErr } = await admin.auth.admin.updateUserById(data.user.id, { password: req.body.password });
  if (updErr) throw new HttpError(400, updErr.message);
  res.json({ success: true, message: 'Password updated' });
};

exports.me = async (req, res) => {
  res.json({ success: true, user: await rpc('api_me', {}, req.userId) });
};

exports.changePassword = async (req, res) => {
  requireFields(req.body, ['current_password', 'new_password']);
  const { current_password, new_password } = req.body;
  if (new_password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');

  const me = await rpc('api_me', {}, req.userId);
  const { error } = await authClient().auth.signInWithPassword({ email: me.email, password: current_password });
  if (error) throw new HttpError(400, 'Current password is incorrect');

  const { error: updErr } = await adminClient().auth.admin.updateUserById(req.userId, { password: new_password });
  if (updErr) throw new HttpError(400, updErr.message);
  res.json({ success: true, message: 'Password changed' });
};

const { rpc } = require('../config/db');
const { authClient, adminClient } = require('../config/supabase');
const { signToken } = require('../middleware/auth');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const codes = require('../services/authCodes');
const { sendMail, sendMailSafe } = require('../services/mailer');
const tpl = require('../services/emailTemplates');

/*
 * Accounts live in Supabase Auth (email + password). This API creates them
 * with the admin API, sends its own verification codes / reset links through
 * nodemailer, and issues its own JWT for later requests.
 */

const requireFields = (body, fields) => {
  const missing = fields.filter((f) => !String(body[f] || '').trim());
  if (missing.length) throw new HttpError(400, `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
};

const checkPassword = (pwd) => {
  if (String(pwd).length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
};

// Loads the profile (and records last_login), then returns { token, user }
const startSession = async (userId) => {
  const user = await rpc('api_login', {}, userId);
  return { token: signToken(user), user };
};

const sendSignupCode = async (user) => {
  const { value, minutes } = await codes.issue(user, 'signup');
  try {
    await sendMail({ to: user.email, ...tpl.signupCode({ name: user.full_name, code: value, minutes }) });
  } catch (err) {
    console.error('[mail] signup code failed:', err.message);
    throw new HttpError(502, 'Could not send the verification email. Please try again shortly.');
  }
};

exports.login = async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const email = req.body.email.trim();

  const { data, error } = await authClient().auth.signInWithPassword({ email, password: req.body.password });
  if (error) {
    throw new HttpError(401, /confirm/i.test(error.message)
      ? 'Please verify your email before signing in'
      : 'Invalid email or password');
  }
  if (!data.user.email_confirmed_at) throw new HttpError(401, 'Please verify your email before signing in');
  res.json({ success: true, ...(await startSession(data.user.id)) });
};

exports.register = async (req, res) => {
  requireFields(req.body, ['email', 'password', 'full_name']);
  const email = req.body.email.trim().toLowerCase();
  const fullName = req.body.full_name.trim();
  const role = req.body.role === 'advisor' ? 'advisor' : 'user';
  checkPassword(req.body.password);

  const settings = await rpc('api_public_settings');
  if (settings.allow_registration === '0') throw new HttpError(403, 'Registration is currently disabled');

  let user = await codes.findUserByEmail(email);
  if (user?.email_confirmed_at) throw new HttpError(409, 'An account with this email already exists. Please sign in.');

  const admin = adminClient();
  if (user) {
    // Registered before but never verified: refresh the password and send a new code
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: req.body.password });
    if (error) throw new HttpError(400, error.message);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: req.body.password,
      email_confirm: false,
      user_metadata: { full_name: fullName, role },
    });
    if (error) throw new HttpError(400, /database error/i.test(error.message) ? 'Registration failed. Please try again.' : error.message);
    user = { id: data.user.id, email, full_name: fullName };
  }

  await sendSignupCode(user);
  res.status(201).json({ success: true, message: 'Verification code sent to your email' });
};

exports.verifyOtp = async (req, res) => {
  requireFields(req.body, ['email', 'otp']);
  const email = req.body.email.trim();
  const code = String(req.body.otp).replace(/\D/g, '');
  if (code.length !== 6) throw new HttpError(400, 'Please enter the 6-digit code');

  const userId = await codes.consumeSignupCode(email, code);
  const { error } = await adminClient().auth.admin.updateUserById(userId, { email_confirm: true });
  if (error) throw new HttpError(500, 'Could not verify email. Please try again.');

  res.json({ success: true, ...(await startSession(userId)) });
};

exports.resendOtp = async (req, res) => {
  requireFields(req.body, ['email']);
  const user = await codes.findUserByEmail(req.body.email.trim());
  if (user && !user.email_confirmed_at) await sendSignupCode(user);
  res.json({ success: true, message: 'If the account needs verification, a new code has been sent' });
};

exports.forgotPassword = async (req, res) => {
  requireFields(req.body, ['email']);
  const user = await codes.findUserByEmail(req.body.email.trim());

  // Same response whether or not the email exists, so accounts can't be enumerated
  if (user?.email_confirmed_at) {
    try {
      const { value, minutes } = await codes.issue(user, 'reset');
      const link = `${env.frontendUrl}/auth/reset-password?token=${value}`;
      await sendMail({ to: user.email, ...tpl.passwordReset({ name: user.full_name, link, minutes }) });
    } catch (err) {
      if (!(err instanceof HttpError)) console.error('[mail] reset email failed:', err.message);
    }
  }
  res.json({ success: true, message: 'If the email is registered, a reset link has been sent' });
};

// `token` is either our emailed reset token (64 hex chars) or, for links sent by
// Supabase itself, the recovery session's access token.
exports.resetPassword = async (req, res) => {
  requireFields(req.body, ['token', 'password']);
  checkPassword(req.body.password);
  const admin = adminClient();

  let userId;
  if (/^[0-9a-f]{64}$/.test(req.body.token)) {
    userId = await codes.consumeResetToken(req.body.token);
  } else {
    const { data, error } = await admin.auth.getUser(req.body.token);
    if (error || !data.user) throw new HttpError(400, 'Reset link is invalid or has expired');
    userId = data.user.id;
  }

  const { data, error } = await admin.auth.admin.updateUserById(userId, { password: req.body.password });
  if (error) throw new HttpError(400, error.message);
  sendMailSafe({ to: data.user.email, ...tpl.passwordChanged({ name: data.user.user_metadata?.full_name }) });
  res.json({ success: true, message: 'Password updated' });
};

exports.me = async (req, res) => {
  res.json({ success: true, user: await rpc('api_me', {}, req.userId) });
};

exports.changePassword = async (req, res) => {
  requireFields(req.body, ['current_password', 'new_password']);
  const { current_password, new_password } = req.body;
  checkPassword(new_password);

  const me = await rpc('api_me', {}, req.userId);
  const { error } = await authClient().auth.signInWithPassword({ email: me.email, password: current_password });
  if (error) throw new HttpError(400, 'Current password is incorrect');

  const { error: updErr } = await adminClient().auth.admin.updateUserById(req.userId, { password: new_password });
  if (updErr) throw new HttpError(400, updErr.message);
  sendMailSafe({ to: me.email, ...tpl.passwordChanged({ name: me.full_name }) });
  res.json({ success: true, message: 'Password changed' });
};

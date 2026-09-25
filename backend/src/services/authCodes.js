const crypto = require('crypto');
const { pool } = require('../config/db');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

/*
 * One-time codes stored (hashed) in public.auth_codes.
 *   signup: 6-digit code, 10 minutes, 5 attempts
 *   reset:  random link token, 60 minutes, single use
 */

const RULES = {
  signup: { minutes: 10, maxAttempts: 5 },
  reset:  { minutes: 60, maxAttempts: 5 },
};
const RESEND_COOLDOWN_SEC = 60;
const MAX_PER_HOUR = 5;

const hash = (value) => crypto.createHmac('sha256', env.jwtSecret).update(String(value)).digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Look up an auth account by email (server-side, bypasses RLS as the DB owner)
const findUserByEmail = async (email) => {
  const { rows } = await pool.query(
    `select u.id, u.email, u.email_confirmed_at, p.full_name
       from auth.users u left join public.profiles p on p.id = u.id
      where lower(u.email) = lower($1) limit 1`,
    [email]
  );
  return rows[0] || null;
};

/** Create a fresh code/token for the user, invalidating older ones. Returns the plain value. */
const issue = async (user, purpose) => {
  const { rows: [stats] } = await pool.query(
    `select count(*) filter (where created_at > now() - interval '1 hour')::int as last_hour,
            max(created_at) as last_at
       from public.auth_codes where user_id = $1 and purpose = $2`,
    [user.id, purpose]
  );
  if (stats.last_at && Date.now() - new Date(stats.last_at).getTime() < RESEND_COOLDOWN_SEC * 1000) {
    throw new HttpError(429, `Please wait ${RESEND_COOLDOWN_SEC} seconds before requesting another email`);
  }
  if (stats.last_hour >= MAX_PER_HOUR) {
    throw new HttpError(429, 'Too many requests. Please try again in an hour.');
  }

  const value = purpose === 'signup'
    ? String(crypto.randomInt(0, 1000000)).padStart(6, '0')
    : crypto.randomBytes(32).toString('hex');

  await pool.query(
    `update public.auth_codes set consumed_at = now()
      where user_id = $1 and purpose = $2 and consumed_at is null`,
    [user.id, purpose]
  );
  await pool.query(
    `insert into public.auth_codes (user_id, email, purpose, code_hash, expires_at)
     values ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
    [user.id, user.email, purpose, hash(value), RULES[purpose].minutes]
  );
  return { value, minutes: RULES[purpose].minutes };
};

/** Check a signup code for an email. Returns the user id; consumes the code. */
const consumeSignupCode = async (email, code) => {
  const { rows: [row] } = await pool.query(
    `select * from public.auth_codes
      where lower(email) = lower($1) and purpose = 'signup' and consumed_at is null
      order by created_at desc limit 1`,
    [email]
  );
  if (!row || new Date(row.expires_at) < new Date()) throw new HttpError(400, 'Code has expired. Please request a new one.');
  if (row.attempts >= RULES.signup.maxAttempts) throw new HttpError(400, 'Too many wrong attempts. Please request a new code.');

  if (!safeEqual(hash(code), row.code_hash)) {
    await pool.query('update public.auth_codes set attempts = attempts + 1 where id = $1', [row.id]);
    throw new HttpError(400, 'Invalid code. Please check and try again.');
  }
  await pool.query('update public.auth_codes set consumed_at = now() where id = $1', [row.id]);
  return row.user_id;
};

/** Check a reset-link token. Returns the user id; consumes the token. */
const consumeResetToken = async (token) => {
  const { rows: [row] } = await pool.query(
    `update public.auth_codes set consumed_at = now()
      where code_hash = $1 and purpose = 'reset' and consumed_at is null and expires_at > now()
      returning user_id`,
    [hash(token)]
  );
  if (!row) throw new HttpError(400, 'Reset link is invalid or has expired. Please request a new one.');
  return row.user_id;
};

module.exports = { findUserByEmail, issue, consumeSignupCode, consumeResetToken };

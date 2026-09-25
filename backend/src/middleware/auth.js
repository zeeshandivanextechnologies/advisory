const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

// Requires `Authorization: Bearer <token>`; sets req.userId.
// Role and active-status checks happen inside the api_* functions.
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Not authenticated'));
  try {
    req.userId = jwt.verify(token, env.jwtSecret).sub;
    return next();
  } catch {
    return next(new HttpError(401, 'Session expired. Please log in again.'));
  }
};

module.exports = { signToken, requireAuth };

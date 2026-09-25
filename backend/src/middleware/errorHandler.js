const multer = require('multer');
const HttpError = require('../utils/HttpError');

// Messages raised by the api_* functions (`raise exception '...'`) are meant for users.
const statusFromDbError = (err) => {
  const msg = err.message || '';
  if (/not authenticated/i.test(msg)) return 401;
  if (/suspended|permission|only the/i.test(msg) || err.code === '42501') return 403;
  if (/not found/i.test(msg)) return 404;
  if (err.code === 'P0001') return 400;
  if (err.code && /^22/.test(err.code)) return 400; // invalid input (bad number, date, uuid…)
  return 500;
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  let status = 500;
  let message = 'Something went wrong. Please try again.';

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (err.code) {
    status = statusFromDbError(err);
    if (status !== 500) message = err.message;
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(status).json({ success: false, message });
};

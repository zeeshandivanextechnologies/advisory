// Wraps async route handlers so rejected promises reach the error middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Response shapes the frontend expects: { success, data } and { success, data, meta } for lists
const send = (res, data, status = 200) => res.status(status).json({ success: true, data });
const sendList = (res, result) => res.json({ success: true, data: result.data, meta: result.meta });

module.exports = { asyncHandler, send, sendList };

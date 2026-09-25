const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
// API responses are per-user and change often: no ETags (which made browsers
// revalidate and get 304 Not Modified) and no caching anywhere.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || env.corsOrigins.includes(origin.replace(/\/$/, ''))),
}));
// Stripe signs the exact raw bytes, so this route must skip JSON parsing
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` }));
app.use(errorHandler);

module.exports = app;

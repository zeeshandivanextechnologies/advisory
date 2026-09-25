const env = require('./config/env');
const app = require('./app');
const { pool } = require('./config/db');

const server = app.listen(env.port, async () => {
  console.log(`AunAdvisory API listening on http://localhost:${env.port}/api`);
  try {
    await pool.query('select 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
  if (!env.supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set: document upload/download and password changes will fail');
  }
});

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

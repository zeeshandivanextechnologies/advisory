const env = require('./config/env');
const app = require('./app');
const { pool } = require('./config/db');
const mailer = require('./services/mailer');
const reminders = require('./services/reminders');
const journeyJobs = require('./services/journeyJobs');

const server = app.listen(env.port, async () => {
  console.log(`AunAdvisory API listening on http://localhost:${env.port}/api`);
  try {
    await pool.query('select 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }
  if (mailer.isConfigured()) {
    mailer.verify()
      .then(() => console.log(`SMTP ready (${env.smtp.host})`))
      .catch((err) => console.error(`SMTP connection failed (${env.smtp.host}):`, err.message));
  } else {
    console.warn('SMTP not configured: emails (OTP codes, reset links) will be printed here in the console');
  }
  if (env.remindersEnabled) {
    reminders.start();
    console.log('Session reminders: on (checked every minute)');
  }
  if (env.journeyJobsEnabled) {
    journeyJobs.start();
    console.log('Client-journey jobs: on (invoice reminders, follow-ups, Friday nudges — hourly)');
  }
  if (!env.supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set: document upload/download and password changes will fail');
  }
});

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

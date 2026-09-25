const { pool } = require('../config/db');
const wa = require('./whatsapp');
const { sendMailSafe } = require('./mailer');
const tpl = require('./emailTemplates');

/*
 * Every minute: claim sessions starting within 30 minutes (each only once),
 * which also adds in-app notifications, then email both sides unless they
 * turned off "Session reminders".
 */
const INTERVAL_MS = 60 * 1000;

const runOnce = async () => {
  const { rows } = await pool.query('select public._claim_session_reminders() as r');
  for (const s of rows[0].r || []) {
    const common = { when: s.scheduled_at, duration: s.duration_min, medium: s.medium };
    if (s.client_wants_email) {
      sendMailSafe({ to: s.client_email, ...tpl.sessionReminder({ ...common, name: s.client_name, withName: s.advisor_name, link: '/user/consultations' }) });
      wa.sendWhatsAppSafe({ email: s.client_email, template: 'session_reminder', params: { name: s.client_name, with: s.advisor_name, when: wa.fmtDateTime(s.scheduled_at) } });
    }
    if (s.advisor_wants_email) {
      sendMailSafe({ to: s.advisor_email, ...tpl.sessionReminder({ ...common, name: s.advisor_name, withName: s.client_name, link: '/advisor/schedule' }) });
      wa.sendWhatsAppSafe({ email: s.advisor_email, template: 'session_reminder', params: { name: s.advisor_name, with: s.client_name, when: wa.fmtDateTime(s.scheduled_at) } });
    }
  }
  return rows[0].r?.length || 0;
};

const start = () => {
  const tick = () => runOnce().catch((err) => console.error('[reminders]', err.message));
  tick();
  return setInterval(tick, INTERVAL_MS);
};

module.exports = { start, runOnce };

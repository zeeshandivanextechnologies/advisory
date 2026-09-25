const { pool } = require('../config/db');
const { sendMailSafe } = require('./mailer');
const { wantsEmail } = require('./prefs');
const mail = require('./journeyEmails');
const wa = require('./whatsapp');

/*
 * Hourly client-journey jobs (each item is claimed once in the database):
 *   - expire proposals past their validity
 *   - invoice reminders on days 7, 14 and 15 after issue (step 11)
 *   - follow-ups on days 7, 30, 60, 90 (referral ask) and 180 (step 12)
 *   - Friday nudges when an active engagement has no weekly update (step 8)
 * The database also creates the matching in-app notifications.
 */
const INTERVAL_MS = 60 * 60 * 1000;

const runOnce = async () => {
  const { rows } = await pool.query('select public._run_journey_jobs() as r');
  const r = rows[0].r;
  // Sales rules: expired proposals → nurture, and close nurture periods that ended
  const { rows: [sales] } = await pool.query('select public._run_sales_jobs() as r');
  r.sales = sales.r;
  // Partners: expire MOUs past their end date, and the quarterly review reminder
  const { rows: [partners] } = await pool.query('select public._run_partner_jobs() as r');
  r.partners = partners.r;

  for (const i of r.invoice_reminders || []) {
    sendMailSafe({ to: i.email, ...mail.invoiceReminder({
      name: i.name, title: i.title, invoiceNo: i.invoice_no, amount: i.amount, currency: i.currency, dueDate: i.due_date, day: i.day,
    }) });
    wa.sendWhatsAppSafe({ email: i.email, template: 'invoice_reminder', params: {
      name: i.name, invoice_no: i.invoice_no, amount: wa.fmtMoney(i.amount, i.currency), due: wa.fmtDate(i.due_date),
    } });
  }
  for (const f of r.followups || []) {
    sendMailSafe({ to: f.email, ...mail.followUp({ name: f.name, title: f.title, kind: f.kind, day: f.day }) });
  }
  for (const n of r.friday_nudges || []) {
    sendMailSafe({ to: n.email, ...mail.fridayNudge({
      name: n.name, title: n.title, link: n.role === 'admin' ? '/admin/engagements' : '/advisor/engagements',
    }) });
  }
  return r;
};

const start = () => {
  const tick = () => runOnce().catch((err) => console.error('[journey jobs]', err.message));
  tick();
  return setInterval(tick, INTERVAL_MS);
};

module.exports = { start, runOnce, wantsEmail };

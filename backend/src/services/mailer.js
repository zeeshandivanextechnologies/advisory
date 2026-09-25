const nodemailer = require('nodemailer');
const env = require('../config/env');

/*
 * Outgoing email via SMTP (nodemailer).
 * Without SMTP settings, emails are printed to the server console instead,
 * so signup codes and reset links can still be used during development.
 */

let transporter = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
}

const isConfigured = () => !!transporter;

const verify = async () => {
  if (!transporter) return false;
  await transporter.verify();
  return true;
};

const sendMail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.log(`\n──── EMAIL (SMTP not configured) ────\nTo: ${to}\nSubject: ${subject}\n\n${text}\n─────────────────────────────────────\n`);
    return;
  }
  await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
};

// For non-critical emails (confirmations, receipts): never fail the request
const sendMailSafe = (msg) =>
  sendMail(msg).catch((err) => console.error(`[mail] failed to send "${msg.subject}" to ${msg.to}:`, err.message));

module.exports = { sendMail, sendMailSafe, isConfigured, verify };

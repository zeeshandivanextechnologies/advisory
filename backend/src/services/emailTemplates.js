const env = require('../config/env');

const BRAND = env.appName;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Minimal, email-client-safe layout (inline styles, single column)
const layout = (title, bodyHtml) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
      <tr><td style="background:#111827;color:#ffffff;padding:18px 28px;font-size:18px;font-weight:bold">${esc(BRAND)}</td></tr>
      <tr><td style="padding:28px">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827">${esc(title)}</h2>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px">
        ${esc(BRAND)} provides business advisory services and is not a law firm.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

const p = (text) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5">${text}</p>`;
const button = (href, label) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#111827;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', {
  timeZone: 'Asia/Qatar', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) + ' (AST)';

exports.signupCode = ({ name, code, minutes }) => ({
  subject: `${code} is your ${BRAND} verification code`,
  html: layout('Verify your email', [
    p(`Hi ${esc(name || 'there')},`),
    p('Enter this code to verify your email address:'),
    `<p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:8px 0 20px;color:#111827">${esc(code)}</p>`,
    p(`The code expires in ${minutes} minutes. If you didn't create an account, you can ignore this email.`),
  ].join('')),
  text: `Your ${BRAND} verification code is ${code}. It expires in ${minutes} minutes.`,
});

exports.passwordReset = ({ name, link, minutes }) => ({
  subject: `Reset your ${BRAND} password`,
  html: layout('Reset your password', [
    p(`Hi ${esc(name || 'there')},`),
    p('We received a request to reset your password. Click the button below to choose a new one:'),
    button(link, 'Reset password'),
    p(`This link expires in ${minutes} minutes and can only be used once. If you didn't request a reset, you can ignore this email.`),
  ].join('')),
  text: `Reset your ${BRAND} password: ${link}\nThis link expires in ${minutes} minutes.`,
});

exports.passwordChanged = ({ name }) => ({
  subject: `Your ${BRAND} password was changed`,
  html: layout('Password changed', [
    p(`Hi ${esc(name || 'there')},`),
    p("Your password was just changed. If this wasn't you, reset your password immediately and contact support."),
  ].join('')),
  text: `Your ${BRAND} password was changed. If this wasn't you, reset it immediately and contact support.`,
});

exports.bookingClient = ({ name, advisorName, when, duration, medium }) => ({
  subject: `Consultation confirmed — ${fmtDate(when)}`,
  html: layout('Your consultation is booked', [
    p(`Hi ${esc(name)},`),
    p(`Your ${duration}-minute ${esc(medium.replace('_', ' '))} session with <b>${esc(advisorName)}</b> is confirmed for <b>${esc(fmtDate(when))}</b>.`),
    button(`${env.frontendUrl}/user/consultations`, 'View my consultations'),
    p('You can join video sessions from your dashboard 10 minutes before the start time.'),
  ].join('')),
  text: `Your ${duration}-minute session with ${advisorName} is confirmed for ${fmtDate(when)}.`,
});

exports.bookingAdvisor = ({ name, clientName, when, duration, medium, notes }) => ({
  subject: `New consultation booked — ${fmtDate(when)}`,
  html: layout('New consultation booked', [
    p(`Hi ${esc(name)},`),
    p(`<b>${esc(clientName)}</b> booked a ${duration}-minute ${esc(medium.replace('_', ' '))} session on <b>${esc(fmtDate(when))}</b>.`),
    notes ? p(`<i>Client brief:</i> ${esc(notes)}`) : '',
    button(`${env.frontendUrl}/advisor/schedule`, 'Open my schedule'),
  ].join('')),
  text: `${clientName} booked a ${duration}-minute session on ${fmtDate(when)}.`,
});

exports.paymentReceipt = ({ name, planName, amount, currency, invoiceNo, expiresAt }) => ({
  subject: `Payment received — ${planName} plan (${invoiceNo})`,
  html: layout('Payment received', [
    p(`Hi ${esc(name)},`),
    p(`Thank you. Your <b>${esc(planName)}</b> plan is now active.`),
    `<table cellpadding="6" style="font-size:14px;margin:0 0 14px">
       <tr><td style="color:#6b7280">Invoice</td><td><b>${esc(invoiceNo)}</b></td></tr>
       <tr><td style="color:#6b7280">Amount</td><td><b>${esc(currency)} ${esc(Number(amount).toFixed(2))}</b></td></tr>
       ${expiresAt ? `<tr><td style="color:#6b7280">Valid until</td><td>${esc(new Date(expiresAt).toDateString())}</td></tr>` : ''}
     </table>`,
    button(`${env.frontendUrl}/user/settings`, 'View billing'),
  ].join('')),
  text: `Your ${planName} plan is active. Invoice ${invoiceNo}: ${currency} ${amount}.`,
});

exports.contactAck = ({ name }) => ({
  subject: `We received your message — ${BRAND}`,
  html: layout('Thanks for reaching out', [
    p(`Hi ${esc(name)},`),
    p('We have received your message and will reply within 4–6 working hours.'),
  ].join('')),
  text: `Hi ${name}, we received your message and will reply within 4–6 working hours.`,
});

exports.contactAdmin = ({ name, email, company, subject, message }) => ({
  subject: `New inquiry: ${subject || 'Contact form'} — ${name}`,
  html: layout('New website inquiry', [
    p(`<b>${esc(name)}</b> &lt;${esc(email)}&gt;${company ? ` · ${esc(company)}` : ''}`),
    subject ? p(`<b>Subject:</b> ${esc(subject)}`) : '',
    p(esc(message).replace(/\n/g, '<br>')),
    button(`mailto:${email}`, 'Reply'),
  ].join('')),
  text: `New inquiry from ${name} <${email}>${company ? ` (${company})` : ''}\n${subject || ''}\n\n${message}`,
});

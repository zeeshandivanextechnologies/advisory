const { pool } = require('../config/db');
const env = require('../config/env');

/*
 * WhatsApp notifications via the Meta WhatsApp Cloud API.
 *
 * Business-initiated messages must use templates approved in WhatsApp Manager.
 * Each key below is a template name (override with WHATSAPP_TPL_<KEY>) and the
 * order of its {{1}}, {{2}}… body variables. See backend/README.md for the text.
 *
 * Only sent to people who switched on "WhatsApp notifications" in Settings and
 * saved a phone number. Without WHATSAPP_TOKEN, messages are printed instead.
 */
const TEMPLATES = {
  session_reminder:     ['name', 'with', 'when'],
  proposal_sent:        ['name', 'title', 'valid_until'],
  invoice_issued:       ['name', 'invoice_no', 'amount', 'due'],
  invoice_reminder:     ['name', 'invoice_no', 'amount', 'due'],
  deliverable_released: ['name', 'title', 'engagement'],
  referral_consent:     ['name', 'partner'],
};

const isConfigured = () => !!(env.whatsapp.token && env.whatsapp.phoneNumberId);

// E.164 digits without "+". Local numbers get the default country code.
const toWhatsAppNumber = (phone) => {
  const raw = String(phone || '').trim();
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (raw.startsWith('00')) d = d.slice(2);
  else if (!raw.startsWith('+') && d.length <= 8) d = env.whatsapp.defaultCountryCode + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
};

const recipient = async (email) => {
  const { rows } = await pool.query(
    `select phone, coalesce((notification_prefs->>'whatsapp_notifs')::boolean, false) as opted_in
       from public.profiles where lower(email) = lower($1) and is_active`, [email]);
  const r = rows[0];
  return r && r.opted_in ? toWhatsAppNumber(r.phone) : null;
};

const sendWhatsApp = async ({ email, template, params }) => {
  const vars = TEMPLATES[template];
  if (!vars) throw new Error(`Unknown WhatsApp template: ${template}`);
  const to = await recipient(email);
  if (!to) return false;

  const name = process.env[`WHATSAPP_TPL_${template.toUpperCase()}`] || template;
  const values = vars.map((k) => String(params[k] ?? '').slice(0, 1000) || '-');

  if (!isConfigured()) {
    console.log(`\n──── WHATSAPP (not configured) ────\nTo: +${to}\nTemplate: ${name}\n${values.map((v, i) => `{{${i + 1}}} ${v}`).join('\n')}\n───────────────────────────────────\n`);
    return true;
  }

  const res = await fetch(`https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.whatsapp.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name,
        language: { code: env.whatsapp.language },
        components: [{ type: 'body', parameters: values.map((text) => ({ type: 'text', text })) }],
      },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `HTTP ${res.status}`);
  }
  return true;
};

// Fire-and-forget, like sendMailSafe: a WhatsApp failure never breaks the request
const sendWhatsAppSafe = (msg) => {
  sendWhatsApp(msg).catch((err) => console.error(`[whatsapp] ${msg.template} failed:`, err.message));
};

const fmtMoney = (amount, currency) =>
  `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Qatar' });
const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Qatar',
}) + ' (Qatar)';

module.exports = { sendWhatsApp, sendWhatsAppSafe, isConfigured, toWhatsAppNumber, TEMPLATES, fmtMoney, fmtDate, fmtDateTime };

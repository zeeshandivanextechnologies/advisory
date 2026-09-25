const Stripe = require('stripe');
const { pool, rpc } = require('../config/db');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const { sendMailSafe } = require('./mailer');
const { wantsEmail, contactFor } = require('./prefs');
const tpl = require('./emailTemplates');

/*
 * Online payments with Stripe Checkout or Tap Payments (hosted payment pages).
 *   1. api_start_checkout creates a *pending* payment
 *   2. we open a Checkout Session and return its URL (frontend redirects)
 *   3. Stripe confirms via webhook (or the success redirect) → _complete_payment
 *      activates the plan. Completion is idempotent.
 * Tap works the same way: a charge with a hosted payment page, confirmed on
 * return (?tap_id=...) or by webhook. Tap charges are always re-fetched from the
 * Tap API before anything is marked paid.
 */

let stripe = null;
const client = () => {
  if (!env.stripeSecretKey) throw new HttpError(503, 'Online payments are not configured. Please contact support.');
  if (!stripe) stripe = (Stripe.default || Stripe)(env.stripeSecretKey);
  return stripe;
};

// Stripe amounts are in the smallest unit; these currencies have none
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const toMinor = (amount, currency) => Math.round(Number(amount) * (ZERO_DECIMAL.has(currency) ? 1 : 100));

/* ── Tap Payments ── */
const TAP_API = 'https://api.tap.company/v2';
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR']);
const ONLINE = ['stripe', 'tap'];

const tap = async (method, path, body) => {
  if (!env.tapSecretKey) throw new HttpError(503, 'Online payments are not configured. Please contact support.');
  const res = await fetch(TAP_API + path, {
    method,
    headers: { Authorization: `Bearer ${env.tapSecretKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.errors?.[0]?.description || data.message || `HTTP ${res.status}`;
    throw new HttpError(res.status === 404 ? 404 : 502, `Payment provider error: ${msg}`);
  }
  return data;
};

// Opens a Tap charge and returns it (charge.transaction.url is the payment page)
const createTapCharge = async ({ amount, currency, email, name, description, reference, metadata, returnPath }) => {
  const cur = String(currency || 'QAR').toUpperCase();
  const body = {
    amount: Number(Number(amount).toFixed(THREE_DECIMAL.has(cur) ? 3 : 2)),
    currency: cur,
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    description,
    metadata,
    reference: { transaction: reference, order: reference },
    receipt: { email: true, sms: false },
    customer: { first_name: (name || 'Customer').slice(0, 50), email },
    source: { id: 'src_all' },
    redirect: { url: `${env.frontendUrl}${returnPath}` },
  };
  if (env.apiPublicUrl) body.post = { url: `${env.apiPublicUrl}/api/payments/tap/webhook` };
  const charge = await tap('POST', '/charges', body);
  if (!charge.transaction?.url) throw new HttpError(502, 'Payment provider did not return a payment page');
  return charge;
};

// What a Tap charge pays for: from our metadata, or the reference as a fallback
const tapTarget = (charge) => {
  const m = charge.metadata || {};
  const ref = String(charge.reference?.transaction || '');
  return {
    userId: m.user_id || null,
    invoiceId: Number(m.engagement_invoice_id) || (ref.startsWith('inv-') ? Number(ref.slice(4)) : 0),
    paymentId: Number(m.payment_id) || (ref.startsWith('plan-') ? Number(ref.slice(5)) : 0),
  };
};
const TAP_FAILED = new Set(['FAILED', 'DECLINED', 'CANCELLED', 'ABANDONED', 'RESTRICTED', 'VOID', 'TIMEDOUT']);
const TAP_ID = /^chg_\w+$/;

const gateway = async () => {
  const { rows } = await pool.query(`select value from public.settings where key = 'payment_gateway'`);
  return rows[0]?.value || 'manual';
};

const startCheckout = async (userId, planId) => {
  const gw = await gateway();
  if (!ONLINE.includes(gw)) throw new HttpError(400, `The ${gw} payment gateway is not supported yet. Please contact support.`);
  const stripeApi = gw === 'stripe' ? client() : null;
  if (gw === 'tap' && !env.tapSecretKey) throw new HttpError(503, 'Online payments are not configured. Please contact support.');

  const { payment, plan, email } = await rpc('api_start_checkout', { p: { plan_id: planId } }, userId);

  if (gw === 'tap') {
    const who = await contactFor(userId);
    const charge = await createTapCharge({
      amount: payment.amount, currency: payment.currency, email, name: who?.full_name,
      description: `${env.appName} ${plan.name} plan`,
      reference: `plan-${payment.id}`,
      metadata: { payment_id: String(payment.id), user_id: userId },
      returnPath: '/user/plans?checkout=success',
    });
    await pool.query('update public.payments set gateway_ref = $1 where id = $2', [charge.id, payment.id]);
    return { redirect_url: charge.transaction.url, payment_id: payment.id };
  }

  const currency = String(payment.currency || 'QAR').toLowerCase();

  const session = await stripeApi.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    client_reference_id: userId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toMinor(payment.amount, currency),
        product_data: { name: `${env.appName} ${plan.name} plan`, description: payment.description },
      },
    }],
    metadata: { payment_id: String(payment.id), user_id: userId },
    success_url: `${env.frontendUrl}/user/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/user/plans?checkout=cancelled`,
  });

  await pool.query('update public.payments set gateway_ref = $1 where id = $2', [session.id, payment.id]);
  return { redirect_url: session.url, payment_id: payment.id };
};

const sendReceipt = async (result) => {
  const pay = result.payment;
  if (!(await wantsEmail(pay.user_id, 'billing_notifs'))) return;
  const who = await contactFor(pay.user_id);
  if (!who) return;
  sendMailSafe({
    to: who.email,
    ...tpl.paymentReceipt({
      name: who.full_name, planName: result.plan_name, amount: pay.amount, currency: pay.currency,
      invoiceNo: pay.invoice_no, expiresAt: result.subscription?.expires_at,
    }),
  });
};

// Engagement invoices (deposit / final) paid online
const startInvoiceCheckout = async (userId, invoiceId) => {
  const gw = await gateway();
  if (!ONLINE.includes(gw)) {
    throw new HttpError(400, 'Online payment is not enabled. Please pay by bank transfer using the invoice details.');
  }
  const stripeApi = gw === 'stripe' ? client() : null;
  if (gw === 'tap' && !env.tapSecretKey) throw new HttpError(503, 'Online payments are not configured. Please contact support.');
  const inv = await rpc('api_invoice_for_checkout', { p_invoice_id: invoiceId }, userId);

  if (gw === 'tap') {
    const who = await contactFor(userId);
    const charge = await createTapCharge({
      amount: inv.amount, currency: inv.currency || 'USD', email: inv.email, name: who?.full_name,
      description: `${inv.title} — ${inv.kind === 'deposit' ? 'deposit' : 'final payment'} (${inv.invoice_no})`,
      reference: `inv-${inv.id}`,
      metadata: { engagement_invoice_id: String(inv.id), user_id: userId },
      returnPath: '/user/engagements?checkout=success',
    });
    return { redirect_url: charge.transaction.url, invoice_id: inv.id };
  }
  const currency = String(inv.currency || 'USD').toLowerCase();

  const session = await stripeApi.checkout.sessions.create({
    mode: 'payment',
    customer_email: inv.email,
    client_reference_id: userId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency,
        unit_amount: toMinor(inv.amount, currency),
        product_data: { name: `${inv.title} — ${inv.kind === 'deposit' ? 'deposit' : 'final payment'} (${inv.invoice_no})` },
      },
    }],
    metadata: { engagement_invoice_id: String(inv.id), user_id: userId },
    success_url: `${env.frontendUrl}/user/engagements?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/user/engagements?checkout=cancelled`,
  });
  return { redirect_url: session.url, invoice_id: inv.id };
};

const payInvoice = async (invoiceId, ref) => {
  const { rows } = await pool.query('select public._pay_engagement_invoice($1, $2, $3) as r', [invoiceId, 'card', ref]);
  const result = rows[0].r;
  if (!result.already_paid) {
    // Lazy require: the journey controller also depends on this module
    require('../controllers/journey.controller').afterInvoicePaid(invoiceId)
      .catch((err) => console.error('[mail] invoice payment emails failed:', err.message));
  }
  return result;
};

const completePlanPayment = async (paymentId, ref) => {
  const { rows } = await pool.query('select public._complete_payment($1, $2) as r', [paymentId, ref]);
  const result = rows[0].r;
  if (!result.already_completed) await sendReceipt(result);
  return result;
};

// Completes the payment behind a paid Checkout Session (webhook and success redirect)
const completeFromSession = async (session) => {
  const invoiceId = Number(session.metadata?.engagement_invoice_id);
  if (invoiceId && session.payment_status === 'paid') return payInvoice(invoiceId, session.id);

  const paymentId = Number(session.metadata?.payment_id);
  if (!paymentId || session.payment_status !== 'paid') return null;
  return completePlanPayment(paymentId, session.id);
};

// Tap: completes (or fails) what a charge pays for. `charge` must come from the Tap API.
const completeFromTapCharge = async (charge) => {
  const t = tapTarget(charge);
  if (charge.status === 'CAPTURED') {
    if (t.invoiceId) return payInvoice(t.invoiceId, charge.id);
    if (t.paymentId) return completePlanPayment(t.paymentId, charge.id);
  } else if (TAP_FAILED.has(charge.status) && t.paymentId) {
    await pool.query('select public._fail_payment($1, $2)', [t.paymentId, charge.id]);
  }
  return null;
};

// Called when the user lands back on ...?tap_id=chg_... (works without webhooks locally)
const confirmTapCharge = async (userId, tapId) => {
  if (!TAP_ID.test(tapId)) throw new HttpError(404, 'Payment not found');
  const charge = await tap('GET', `/charges/${encodeURIComponent(tapId)}`);
  if (tapTarget(charge).userId !== userId) throw new HttpError(404, 'Payment not found');
  const result = await completeFromTapCharge(charge);
  return {
    status: charge.status === 'CAPTURED' ? 'paid' : String(charge.status || '').toLowerCase(),
    failed: TAP_FAILED.has(charge.status),
    completed: !!result,
  };
};

// Tap -> us. The payload is only used for the charge id; the charge is re-fetched from Tap.
const handleTapWebhook = async (body) => {
  const id = String(body?.id || '');
  if (!TAP_ID.test(id)) return;
  await completeFromTapCharge(await tap('GET', `/charges/${encodeURIComponent(id)}`));
};

// Called when the user lands back on /user/plans?session_id=… (works without webhooks locally)
const confirmSession = async (userId, sessionId) => {
  const session = await client().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== userId) throw new HttpError(404, 'Payment not found');
  const result = await completeFromSession(session);
  return { status: session.payment_status, completed: !!result };
};

const handleWebhook = async (rawBody, signature) => {
  if (!env.stripeWebhookSecret) throw new HttpError(503, 'STRIPE_WEBHOOK_SECRET is not set');
  let event;
  try {
    event = client().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
  } catch (err) {
    throw new HttpError(400, `Webhook signature verification failed: ${err.message}`);
  }

  const session = event.data.object;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await completeFromSession(session);
  } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const paymentId = Number(session.metadata?.payment_id);
    if (paymentId) await pool.query('select public._fail_payment($1, $2)', [paymentId, session.id]);
  }
};

module.exports = {
  gateway, startCheckout, startInvoiceCheckout, confirmSession, handleWebhook, sendReceipt,
  confirmTapCharge, handleTapWebhook,
  _test: { tapTarget, completeFromTapCharge },
};

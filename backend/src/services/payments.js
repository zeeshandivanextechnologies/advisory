const Stripe = require('stripe');
const { pool, rpc } = require('../config/db');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');
const { sendMailSafe } = require('./mailer');
const { wantsEmail, contactFor } = require('./prefs');
const tpl = require('./emailTemplates');

/*
 * Online plan payments with Stripe Checkout (hosted payment page).
 *   1. api_start_checkout creates a *pending* payment
 *   2. we open a Checkout Session and return its URL (frontend redirects)
 *   3. Stripe confirms via webhook (or the success redirect) → _complete_payment
 *      activates the plan. Completion is idempotent.
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

const gateway = async () => {
  const { rows } = await pool.query(`select value from public.settings where key = 'payment_gateway'`);
  return rows[0]?.value || 'manual';
};

const startCheckout = async (userId, planId) => {
  const gw = await gateway();
  if (gw !== 'stripe') throw new HttpError(400, `The ${gw} payment gateway is not supported yet. Please contact support.`);
  const stripeApi = client();

  const { payment, plan, email } = await rpc('api_start_checkout', { p: { plan_id: planId } }, userId);
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

// Completes the payment behind a paid Checkout Session (webhook and success redirect)
const completeFromSession = async (session) => {
  const paymentId = Number(session.metadata?.payment_id);
  if (!paymentId || session.payment_status !== 'paid') return null;
  const { rows } = await pool.query('select public._complete_payment($1, $2) as r', [paymentId, session.id]);
  const result = rows[0].r;
  if (!result.already_completed) await sendReceipt(result);
  return result;
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

module.exports = { gateway, startCheckout, confirmSession, handleWebhook, sendReceipt };

const { rpc, pool } = require('../config/db');
const env = require('../config/env');
const { send } = require('../utils/http');
const { sendMailSafe } = require('../services/mailer');
const { wantsEmail, contactFor } = require('../services/prefs');
const payments = require('../services/payments');
const mail = require('../services/journeyEmails');

const adminEmails = async () => {
  const { rows } = await pool.query(`select email, full_name from public.profiles where role = 'admin' and is_active`);
  return rows;
};

const logFail = (what) => (err) => console.error(`[mail] ${what} failed:`, err.message);

// Emails that follow an invoice being paid (by admin record or gateway)
const afterInvoicePaid = async (invoiceId) => {
  const { rows: [i] } = await pool.query(
    `select i.*, e.title, e.status as engagement_status, u.email, u.full_name, ap.full_name as advisor_name
       from public.engagement_invoices i
       join public.engagements e on e.id = i.engagement_id
       join public.profiles u on u.id = i.user_id
       left join public.advisors a on a.id = e.advisor_id
       left join public.profiles ap on ap.id = a.profile_id
      where i.id = $1`, [invoiceId]);
  if (!i) return;
  if (await wantsEmail(i.user_id, 'billing_notifs')) {
    sendMailSafe({ to: i.email, ...mail.invoicePaid({ name: i.full_name, title: i.title, invoiceNo: i.invoice_no, amount: i.amount, currency: i.currency }) });
  }
  if (i.kind === 'deposit') {
    sendMailSafe({ to: i.email, ...mail.welcomePacket({ name: i.full_name, title: i.title, advisorName: i.advisor_name }) });
  }
};
exports.afterInvoicePaid = afterInvoicePaid;

const emailInvoice = async (inv, title) => {
  const who = await contactFor(inv.user_id);
  if (who) {
    sendMailSafe({ to: who.email, ...mail.invoiceIssued({
      name: who.full_name, title, invoiceNo: inv.invoice_no, kind: inv.kind, amount: inv.amount, currency: inv.currency, dueDate: inv.due_date,
    }) });
  }
};

/* ── Step 5: proposals ── */
exports.adminProposals = async (req, res) => send(res, await rpc('api_admin_proposals', { p: req.query }, req.userId));

exports.adminCreateProposal = async (req, res) =>
  send(res, await rpc('api_admin_save_proposal', { p_id: null, p: req.body }, req.userId), 201);

exports.adminUpdateProposal = async (req, res) =>
  send(res, await rpc('api_admin_save_proposal', { p_id: req.params.id, p: req.body }, req.userId));

exports.adminSendProposal = async (req, res) => {
  const pr = await rpc('api_admin_send_proposal', { p_id: req.params.id }, req.userId);
  send(res, pr);
  sendMailSafe({ to: pr.client_email, ...mail.proposalSent({
    name: pr.client_name, title: pr.title, amount: pr.amount, currency: pr.currency, validUntil: pr.valid_until,
  }) });
};

exports.adminWithdrawProposal = async (req, res) =>
  send(res, await rpc('api_admin_withdraw_proposal', { p_id: req.params.id }, req.userId));

exports.myProposals = async (req, res) => send(res, await rpc('api_my_proposals', {}, req.userId));

/* ── Step 6: accept (contract) or decline ── */
exports.respondProposal = async (req, res) => {
  const result = await rpc('api_respond_proposal', { p_id: req.params.id, p: req.body }, req.userId);
  send(res, result);

  (async () => {
    const accepted = result.status === 'accepted';
    for (const a of await adminEmails()) {
      sendMailSafe({ to: a.email, ...mail.proposalResponseAdmin({
        client: result.client_name, title: result.title, accepted, reason: result.decline_reason,
      }) });
    }
    if (accepted && result.invoice) await emailInvoice(result.invoice, result.title);
  })().catch(logFail('proposal response'));
};

/* ── Engagements ── */
exports.engagements = async (req, res) => send(res, await rpc('api_engagements', { p: req.query }, req.userId));

exports.engagementDetail = async (req, res) =>
  send(res, await rpc('api_engagement_detail', { p_id: req.params.id }, req.userId));

// Staff move the engagement forward; delivering issues the final invoice (step 11)
exports.updateEngagement = async (req, res) => {
  const e = await rpc('api_update_engagement', { p_id: req.params.id, p: req.body }, req.userId);
  send(res, e);

  if (req.body.status === 'delivered') {
    (async () => {
      const { rows: [inv] } = await pool.query(
        `select * from public.engagement_invoices where engagement_id = $1 and kind = 'final' and status = 'unpaid'
          order by id desc limit 1`, [e.id]);
      if (inv) await emailInvoice(inv, e.title);
    })().catch(logFail('final invoice'));
  }
};

/* ── Step 9: QA checklist ── */
exports.setQaItem = async (req, res) =>
  send(res, await rpc('api_set_qa_item', { p_item_id: req.params.itemId, p_checked: !!req.body.checked }, req.userId));

exports.addQaItem = async (req, res) =>
  send(res, await rpc('api_add_qa_item', { p_engagement_id: req.params.id, p_label: req.body.label || '' }, req.userId), 201);

/* ── Invoices ── */
exports.adminInvoices = async (req, res) => send(res, await rpc('api_admin_invoices', { p: req.query }, req.userId));

exports.adminRecordPayment = async (req, res) => {
  const result = await rpc('api_admin_record_invoice_payment', { p_invoice_id: req.params.id, p: req.body }, req.userId);
  send(res, result);
  if (!result.already_paid) afterInvoicePaid(Number(req.params.id)).catch(logFail('payment emails'));
};

// Client pays an engagement invoice online (Stripe Checkout, when enabled)
exports.payInvoiceOnline = async (req, res) => {
  const checkout = await payments.startInvoiceCheckout(req.userId, req.params.id);
  res.status(201).json({ success: true, redirect_url: checkout.redirect_url, data: checkout });
};

/* ── Step 12: follow-ups ── */
exports.adminFollowups = async (req, res) => send(res, await rpc('api_admin_followups', { p: req.query }, req.userId));

exports.adminUpdateFollowup = async (req, res) =>
  send(res, await rpc('api_admin_update_followup', { p_id: req.params.id, p: req.body }, req.userId));

exports.onlinePaymentsEnabled = async () => (await payments.gateway()) === 'stripe' && !!env.stripeSecretKey;

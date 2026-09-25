const env = require('../config/env');
const { helpers: { layout, p, button, esc } } = require('./emailTemplates');

/* Emails for the client journey: proposal → engagement → invoices → follow-ups */

const moneyText = (amount, currency) =>
  `${currency} ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateText = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const engagementsLink = () => `${env.frontendUrl}/user/engagements`;

exports.proposalSent = ({ name, title, amount, currency, validUntil }) => ({
  subject: `Your proposal: ${title}`,
  html: layout('Your proposal is ready', [
    p(`Hi ${esc(name)},`),
    p(`Your proposal for <b>${esc(title)}</b> (${esc(moneyText(amount, currency))}) is ready. It sets out the scope, deliverables, timeline, payment terms and what is not included.`),
    p(`It is valid until <b>${esc(dateText(validUntil))}</b>.`),
    button(engagementsLink(), 'Review proposal'),
  ].join('')),
  text: `Your proposal for ${title} (${moneyText(amount, currency)}) is ready. Valid until ${dateText(validUntil)}: ${engagementsLink()}`,
});

exports.proposalResponseAdmin = ({ client, title, accepted, reason }) => ({
  subject: `Proposal ${accepted ? 'accepted' : 'declined'}: ${title} — ${client}`,
  html: layout(`Proposal ${accepted ? 'accepted' : 'declined'}`, [
    p(`<b>${esc(client)}</b> ${accepted ? 'accepted' : 'declined'} <b>${esc(title)}</b>.`),
    reason ? p(`<i>Reason:</i> ${esc(reason)}`) : '',
    button(`${env.frontendUrl}/admin/engagements`, 'Open engagements'),
  ].join('')),
  text: `${client} ${accepted ? 'accepted' : 'declined'} ${title}.${reason ? ` Reason: ${reason}` : ''}`,
});

exports.invoiceIssued = ({ name, title, invoiceNo, kind, amount, currency, dueDate }) => ({
  subject: `${kind === 'deposit' ? 'Deposit' : 'Final'} invoice ${invoiceNo} — ${title}`,
  html: layout(`${kind === 'deposit' ? 'Deposit' : 'Final'} invoice ${esc(invoiceNo)}`, [
    p(`Hi ${esc(name)},`),
    kind === 'deposit'
      ? p(`Thank you for accepting the proposal for <b>${esc(title)}</b>. Work begins as soon as the deposit is received.`)
      : p(`Your deliverables for <b>${esc(title)}</b> have been delivered. Here is the invoice for the balance.`),
    `<table cellpadding="6" style="font-size:14px;margin:0 0 14px">
       <tr><td style="color:#6b7280">Invoice</td><td><b>${esc(invoiceNo)}</b></td></tr>
       <tr><td style="color:#6b7280">Amount</td><td><b>${esc(moneyText(amount, currency))}</b></td></tr>
       <tr><td style="color:#6b7280">Due</td><td>${esc(dateText(dueDate))}</td></tr>
     </table>`,
    button(engagementsLink(), 'View invoice'),
  ].join('')),
  text: `Invoice ${invoiceNo}: ${moneyText(amount, currency)} due ${dateText(dueDate)} for ${title}. ${engagementsLink()}`,
});

exports.invoiceReminder = ({ name, title, invoiceNo, amount, currency, dueDate, day }) => ({
  subject: `Reminder: invoice ${invoiceNo} (${moneyText(amount, currency)})`,
  html: layout('Payment reminder', [
    p(`Hi ${esc(name)},`),
    p(`A friendly reminder that invoice <b>${esc(invoiceNo)}</b> for <b>${esc(title)}</b> (${esc(moneyText(amount, currency))}) was issued ${day} days ago and is due <b>${esc(dateText(dueDate))}</b>.`),
    button(engagementsLink(), 'View invoice'),
    p('If you have already paid, thank you — please ignore this message.'),
  ].join('')),
  text: `Reminder: invoice ${invoiceNo} (${moneyText(amount, currency)}) is due ${dateText(dueDate)}. ${engagementsLink()}`,
});

exports.invoicePaid = ({ name, title, invoiceNo, amount, currency }) => ({
  subject: `Payment received — ${invoiceNo}`,
  html: layout('Payment received', [
    p(`Hi ${esc(name)},`),
    p(`We received ${esc(moneyText(amount, currency))} for invoice <b>${esc(invoiceNo)}</b> (${esc(title)}). Thank you.`),
    button(engagementsLink(), 'View engagement'),
  ].join('')),
  text: `We received ${moneyText(amount, currency)} for invoice ${invoiceNo}. Thank you.`,
});

exports.welcomePacket = ({ name, title, advisorName }) => ({
  subject: `Welcome aboard — ${title} has started`,
  html: layout('Welcome aboard', [
    p(`Hi ${esc(name)},`),
    p(`Your deposit is received and <b>${esc(title)}</b> has officially started.${advisorName ? ` Your advisor is <b>${esc(advisorName)}</b>.` : ''}`),
    p('<b>How the engagement runs</b>'),
    `<ul style="font-size:14px;line-height:1.6;margin:0 0 14px;padding-left:18px">
       <li>Your workspace has a kickoff checklist and the delivery phases.</li>
       <li>Upload your company documents from Documents.</li>
       <li>You receive a status update every Friday.</li>
       <li>Every deliverable goes through a quality check before it reaches you.</li>
       <li>We finish with a delivery meeting and a live walkthrough.</li>
     </ul>`,
    button(engagementsLink(), 'Open my workspace'),
  ].join('')),
  text: `Your deposit is received and ${title} has started. Open your workspace: ${engagementsLink()}`,
});

exports.followUp = ({ name, title, kind, day }) => ({
  subject: kind === 'referral' ? 'Know someone we could help?' : `Checking in — ${title}`,
  html: layout(kind === 'referral' ? 'A quick favour' : 'Checking in', [
    p(`Hi ${esc(name)},`),
    kind === 'referral'
      ? p(`It has been ${day} days since we completed <b>${esc(title)}</b>. If a colleague or partner is considering the GCC, we would be glad to help them too — just reply with an introduction.`)
      : p(`It has been ${day} days since we completed <b>${esc(title)}</b>. How are things going? Reply any time if a question has come up.`),
    button(engagementsLink(), 'Open my engagements'),
  ].join('')),
  text: kind === 'referral'
    ? 'If a colleague is considering the GCC, we would be glad to help. Reply with an introduction.'
    : `Checking in ${day} days after ${title}. Reply any time if a question has come up.`,
});

exports.fridayNudge = ({ name, title, link }) => ({
  subject: `Friday status update due — ${title}`,
  html: layout('Friday status update due', [
    p(`Hi ${esc(name)},`),
    p(`<b>${esc(title)}</b> has no status update this week. Please post the weekly update from the case workspace.`),
    button(`${env.frontendUrl}${link}`, 'Open engagements'),
  ].join('')),
  text: `${title} has no status update this week. Please post the weekly update.`,
});

const { rpc } = require('../config/db');
const { send, sendList } = require('../utils/http');
const { sendMailSafe } = require('../services/mailer');
const { wantsEmail, contactFor } = require('../services/prefs');
const tpl = require('../services/emailTemplates');

// "Consultant messages" preference covers case updates
const emailClient = (caseRow, build) =>
  (async () => {
    if (!(await wantsEmail(caseRow.user_id, 'consultant_messages'))) return;
    const who = await contactFor(caseRow.user_id);
    if (who) sendMailSafe({ to: who.email, ...build(who) });
  })().catch((err) => console.error('[mail] case email failed:', err.message));

exports.list = async (req, res) => sendList(res, await rpc('api_cases', { p: req.query }, req.userId));

exports.create = async (req, res) => send(res, await rpc('api_create_case', { p: req.body }, req.userId), 201);

exports.update = async (req, res) =>
  send(res, await rpc('api_update_case', { p_id: req.params.id, p: req.body }, req.userId));

// Case workspace: case + milestones + checklist + status updates + progress
exports.detail = async (req, res) => send(res, await rpc('api_case_detail', { p_id: req.params.id }, req.userId));

exports.createMilestone = async (req, res) =>
  send(res, await rpc('api_save_milestone', { p_case_id: req.params.id, p_id: null, p: req.body }, req.userId), 201);

exports.updateMilestone = async (req, res) =>
  send(res, await rpc('api_save_milestone', { p_case_id: req.params.id, p_id: req.params.itemId, p: req.body }, req.userId));

exports.deleteMilestone = async (req, res) =>
  send(res, await rpc('api_delete_milestone', { p_id: req.params.itemId }, req.userId));

exports.createChecklistItem = async (req, res) =>
  send(res, await rpc('api_save_checklist_item', { p_case_id: req.params.id, p_id: null, p: req.body }, req.userId), 201);

exports.updateChecklistItem = async (req, res) =>
  send(res, await rpc('api_save_checklist_item', { p_case_id: req.params.id, p_id: req.params.itemId, p: req.body }, req.userId));

exports.deleteChecklistItem = async (req, res) =>
  send(res, await rpc('api_delete_checklist_item', { p_id: req.params.itemId }, req.userId));

exports.addUpdate = async (req, res) => {
  const update = await rpc('api_add_case_update', { p_case_id: req.params.id, p: req.body }, req.userId);
  send(res, update, 201);

  const c = await rpc('api_case_detail', { p_id: req.params.id }, req.userId);
  const label = { weekly: 'Weekly status update', kickoff: 'Kickoff summary', delivery: 'Delivery update' }[update.update_type] || 'Case update';
  emailClient(c, (who) => tpl.caseUpdate({
    name: who.full_name, title: `${label} — ${c.case_number}`, summary: update.summary, nextSteps: update.next_steps,
  }));
};

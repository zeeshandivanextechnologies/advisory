const crypto = require('crypto');
const { rpc, pool } = require('../config/db');
const { adminClient } = require('../config/supabase');
const { send } = require('../utils/http');
const HttpError = require('../utils/HttpError');
const { sendMailSafe } = require('../services/mailer');
const mail = require('../services/journeyEmails');

/* QA checklist before any deliverable goes out: draft → QA → approval → release */
const BUCKET = 'documents';

exports.list = async (req, res) =>
  send(res, await rpc('api_deliverables', { p_engagement_id: req.params.id }, req.userId));

// multipart/form-data: title, description, optional file, optional link_url
exports.create = async (req, res) => {
  let path = null;
  const storage = adminClient().storage.from(BUCKET);
  if (req.file) {
    const safeName = req.file.originalname.replace(/[^\w.-]+/g, '_');
    path = `${req.userId}/deliverables/${req.params.id}/${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${safeName}`;
    const { error } = await storage.upload(path, req.file.buffer, { contentType: req.file.mimetype || 'application/octet-stream' });
    if (error) throw new HttpError(500, `Upload failed: ${error.message}`);
  }
  try {
    const d = await rpc('api_create_deliverable', {
      p_engagement_id: req.params.id,
      p: {
        title: req.body.title, description: req.body.description, link_url: req.body.link_url || null,
        file_path: path, file_name: req.file?.originalname || null, file_type: req.file?.mimetype || null, file_size: req.file?.size || null,
      },
    }, req.userId);
    send(res, d, 201);
  } catch (err) {
    if (path) await storage.remove([path]);
    throw err;
  }
};

exports.update = async (req, res) =>
  send(res, await rpc('api_update_deliverable', { p_id: req.params.id, p: req.body }, req.userId));

exports.setQa = async (req, res) =>
  send(res, await rpc('api_set_deliverable_qa', { p_item_id: req.params.itemId, p_checked: !!req.body.checked }, req.userId));

exports.action = async (req, res) => {
  const d = await rpc('api_deliverable_action', { p_id: req.params.id, p: req.body }, req.userId);
  send(res, d);

  // Released: tell the client by email as well
  if (req.body.action === 'release') {
    (async () => {
      const { rows: [c] } = await pool.query(
        `select u.email, u.full_name, e.title from public.engagements e join public.profiles u on u.id = e.user_id where e.id = $1`,
        [d.engagement_id]);
      if (c) sendMailSafe({ to: c.email, ...mail.deliverableReleased({ name: c.full_name, engagement: c.title, title: d.title }) });
    })().catch((err) => console.error('[mail] deliverable release email failed:', err.message));
  }
};

exports.download = async (req, res) => {
  const path = await rpc('api_deliverable_path', { p_id: req.params.id }, req.userId);
  const { data, error } = await adminClient().storage.from(BUCKET).download(path);
  if (error) throw new HttpError(404, 'File not found in storage');
  const fileName = path.split('/').pop().replace(/^\d+-[0-9a-f]+-/, '');
  res.setHeader('Content-Type', data.type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.send(Buffer.from(await data.arrayBuffer()));
};

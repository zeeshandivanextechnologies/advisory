const crypto = require('crypto');
const { rpc } = require('../config/db');
const { adminClient } = require('../config/supabase');
const { send, sendList } = require('../utils/http');
const HttpError = require('../utils/HttpError');

const BUCKET = 'documents';

exports.list = async (req, res) => sendList(res, await rpc('api_documents', { p: req.query }, req.userId));

// multipart/form-data: file, category, jurisdiction?, case_id?
exports.upload = async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please choose a file');
  const { originalname, mimetype, size, buffer } = req.file;

  // Files are stored under the owner's folder; api_create_document enforces this
  const safeName = originalname.replace(/[^\w.-]+/g, '_');
  const path = `${req.userId}/${Date.now()}-${crypto.randomBytes(3).toString('hex')}-${safeName}`;

  const storage = adminClient().storage.from(BUCKET);
  const { error } = await storage.upload(path, buffer, { contentType: mimetype || 'application/octet-stream' });
  if (error) throw new HttpError(500, `Upload failed: ${error.message}`);

  try {
    const doc = await rpc('api_create_document', {
      p: {
        file_path: path,
        original_name: originalname,
        file_type: mimetype || 'application/octet-stream',
        file_size: size,
        category: req.body.category || 'other',
        jurisdiction: req.body.jurisdiction || null,
        case_id: req.body.case_id || null,
      },
    }, req.userId);
    send(res, doc, 201);
  } catch (err) {
    await storage.remove([path]);
    throw err;
  }
};

exports.download = async (req, res) => {
  // Permission check happens here: throws "Document not found" if the caller can't see it
  const path = await rpc('api_document_path', { p_id: req.params.id }, req.userId);
  const { data, error } = await adminClient().storage.from(BUCKET).download(path);
  if (error) throw new HttpError(404, 'File not found in storage');

  const fileName = path.split('/').pop().replace(/^\d+-[0-9a-f]+-/, '');
  res.setHeader('Content-Type', data.type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
  res.send(Buffer.from(await data.arrayBuffer()));
};

exports.review = async (req, res) =>
  send(res, await rpc('api_review_document', { p_id: req.params.id, p: req.body }, req.userId));

exports.remove = async (req, res) => {
  const path = await rpc('api_delete_document', { p_id: req.params.id }, req.userId);
  await adminClient().storage.from(BUCKET).remove([path]);
  send(res, null);
};

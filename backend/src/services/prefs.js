const { pool } = require('../config/db');

/*
 * Notification preferences (user Settings → Notifications). Missing = enabled.
 *   session_reminders    email 30 minutes before a session
 *   document_updates     email when a document is reviewed
 *   billing_notifs       payment receipts
 *   consultant_messages  case status updates and session handover notes
 *   compliance_reminders stored for when compliance deadlines are added
 * Account emails (codes, resets, security alerts) are always sent.
 */
const wantsEmail = async (userId, pref) => {
  const { rows } = await pool.query('select public._pref_enabled($1, $2) as on', [userId, pref]);
  return rows[0]?.on !== false;
};

const contactFor = async (userId) => {
  const { rows } = await pool.query('select id, email, full_name from public.profiles where id = $1', [userId]);
  return rows[0] || null;
};

module.exports = { wantsEmail, contactFor };

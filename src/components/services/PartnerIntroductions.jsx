import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { Badge, ConfirmModal, showToast } from '../common/index';
import { partnerAPI } from '../../services/api';
import { fmtDate } from '../../utils/services';

const STATUS = {
  awaiting_consent:  { badge: 'pending',   label: 'Your consent needed' },
  consented:         { badge: 'approved',  label: 'Consented' },
  client_declined:   { badge: 'declined',  label: 'Declined' },
  introduced:        { badge: 'open',      label: 'Introduced' },
  partner_responded: { badge: 'in_progress', label: 'In touch' },
  completed:         { badge: 'completed', label: 'Completed' },
  closed:            { badge: 'closed',    label: 'Closed' },
};
const list = (v) => (v || []).join(', ');

/*
 * Introductions to partner law firms / licensed professionals.
 * Nothing is shared with a partner until the client consents here.
 * Renders nothing when the client has no introductions.
 */
export default function PartnerIntroductions() {
  const [rows, setRows]       = useState([]);
  const [decline, setDecline] = useState(null);
  const [busy, setBusy]       = useState(false);

  const load = useCallback(() => {
    partnerAPI.myReferrals().then(r => setRows(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (id, consent) => {
    setBusy(true);
    try {
      await partnerAPI.respond(id, consent);
      showToast(consent ? 'Thank you — we will make the introduction' : 'Introduction declined');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save your answer', 'error');
    } finally { setBusy(false); }
  };

  if (!rows.length) return null;

  return (
    <div className="ai-table-section mt-3">
      <div className="table-header">
        <h5 className="fz-14 text-black fw-600 mb-0">Introductions to Licensed Partners</h5>
      </div>
      <div className="table-responsive">
        <table className="table billing-table align-middle mb-0 ai-case-table">
          <thead><tr><th>Partner</th><th>Purpose</th><th>Shared with them</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map(r => {
              const s = STATUS[r.status] || { badge: r.status, label: r.status };
              return (
                <tr key={r.id}>
                  <td><div className="plan-table-content"><h5>{r.partner_name}</h5><p>{list(r.specialties)}{r.languages?.length ? ` · ${list(r.languages)}` : ''}</p></div></td>
                  <td><div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>{r.purpose}</h5><p>{fmtDate(r.created_at)}</p></div></td>
                  <td>{r.scope_note || 'Your name and contact details'}</td>
                  <td><Badge status={s.badge} text={s.label} /></td>
                  <td>
                    {r.status === 'awaiting_consent' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-success btn-sm" disabled={busy} onClick={() => respond(r.id, true)}><FiCheck /> I consent</button>
                        <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => setDecline(r.id)}><FiX /> Decline</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-dark-4)', margin: '8px 12px' }}>
        We only introduce you to a partner, and share the details above, with your consent. We remain your point of contact throughout.
      </p>

      <ConfirmModal open={!!decline} onClose={() => setDecline(null)} onConfirm={() => respond(decline, false)}
        title="Decline introduction" message="We will not share your details with this partner." confirmLabel="Decline" danger />
    </div>
  );
}

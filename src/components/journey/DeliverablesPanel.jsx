import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Badge, Spinner, showToast } from '../common/index';
import { deliverableAPI } from '../../services/api';
import { fmtDate, fmtDateTime } from '../../utils/services';
import { FiCheckSquare, FiSquare, FiDownload, FiExternalLink, FiPlus, FiAlertTriangle, FiX } from 'react-icons/fi';

const STATUS = {
  draft:             { badge: 'draft',     label: 'Draft' },
  in_qa:             { badge: 'review',    label: 'In QA' },
  changes_requested: { badge: 'pending',   label: 'Changes requested' },
  approved:          { badge: 'approved',  label: 'Approved' },
  released:          { badge: 'completed', label: 'Released' },
};
const errMsg = (err, fb) => err.response?.data?.message || fb;
const blank = { title: '', description: '', link_url: '' };

/*
 * QA checklist before any deliverable goes out:
 * draft → QA (7 points) → approval (founder / full admin, not the author) → release.
 * mode="staff" manages the flow; mode="client" lists released deliverables.
 */
export default function DeliverablesPanel({ engagementId, mode = 'staff' }) {
  const [list, setList]       = useState(null);
  const [meta, setMeta]       = useState({});
  const [adding, setAdding]   = useState(false);
  const [form, setForm]       = useState(blank);
  const [notes, setNotes]     = useState({});
  const [busy, setBusy]       = useState(false);
  const fileRef               = useRef(null);
  const staff = mode === 'staff' && meta.access === 'staff';

  const load = useCallback(() => {
    deliverableAPI.list(engagementId)
      .then(r => { const x = r.data.data || {}; setList(x.data || []); setMeta({ access: x.access, can_approve: x.can_approve }); })
      .catch(() => setList([]));
  }, [engagementId]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); if (msg) showToast(msg); load(); return true; }
    catch (err) { showToast(errMsg(err, 'Action failed'), 'error'); return false; }
    finally { setBusy(false); }
  };

  const create = async () => {
    if (!form.title.trim()) return showToast('Title is required', 'error');
    const file = fileRef.current?.files?.[0];
    if (!file && !form.link_url.trim()) return showToast('Attach a file or add a link', 'error');
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('link_url', form.link_url);
    if (file) fd.append('file', file);
    if (await act(() => deliverableAPI.create(engagementId, fd), 'Deliverable added as a draft')) {
      setForm(blank); setAdding(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const download = async (d) => {
    try {
      const r = await deliverableAPI.download(d.id);
      const url = URL.createObjectURL(new Blob([r.data], { type: d.file_type || 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = d.file_name || `${d.title}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { showToast('Could not download the file', 'error'); }
  };

  const doAction = (d, action, msg) => act(() => deliverableAPI.action(d.id, action, notes[d.id] || ''), msg)
    .then(okDone => { if (okDone) setNotes(n => ({ ...n, [d.id]: '' })); });

  if (list === null) return <Spinner size={24} />;

  const Files = ({ d }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {d.has_file && <button type="button" className="ai-thm-btn outline" onClick={() => download(d)}><FiDownload /> {d.file_name || 'Download'}</button>}
      {d.link_url && <a className="ai-thm-btn outline" href={d.link_url} target="_blank" rel="noopener noreferrer"><FiExternalLink /> Open link</a>}
    </div>
  );

  /* Client: released deliverables only */
  if (mode === 'client') {
    if (!list.length) return <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0 }}>Deliverables appear here once they pass our quality check.</p>;
    return list.map(d => (
      <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{d.title}</div>
        {d.description && <div style={{ fontSize: 12, color: '#4A4949' }}>{d.description}</div>}
        <div style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>Shared {fmtDate(d.released_at)}</div>
        <Files d={d} />
      </div>
    ));
  }

  return (
    <div>
      {staff && !adding && <button type="button" className="thm-btn" onClick={() => setAdding(true)}><FiPlus /> New deliverable</button>}
      {staff && adding && (
        <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div className="row g-2">
            <div className="col-md-6 form-group"><label className="form-label">Title *</label>
              <input className="form-input" placeholder="e.g. Readiness memo" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="col-md-6 form-group"><label className="form-label">Link (optional)</label>
              <input className="form-input" placeholder="https://…" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">Description</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">File (optional)</label>
              <input type="file" ref={fileRef} className="form-control" /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="ai-thm-btn outline" onClick={() => { setAdding(false); setForm(blank); }}><FiX /> Cancel</button>
            <button type="button" className="ai-thm-btn" disabled={busy} onClick={create}>{busy ? 'Saving…' : 'Save draft'}</button>
          </div>
        </div>
      )}

      {!list.length && <p style={{ fontSize: 12, color: 'var(--text-dark-4)', marginTop: 8 }}>No deliverables yet. Each one goes through the QA checklist and an approval before the client sees it.</p>}

      {list.map(d => {
        const st = STATUS[d.status] || { badge: d.status, label: d.status };
        const qaHours = d.qa_completed_at ? (Date.now() - new Date(d.qa_completed_at).getTime()) / 36e5 : null;
        return (
          <div key={d.id} style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>{d.title}</div>
                <div style={{ fontSize: 12, color: '#4A4949' }}>
                  {d.description ? `${d.description} · ` : ''}by {d.created_by_name || '—'}
                  {d.approved_by_name ? ` · approved by ${d.approved_by_name}` : ''}
                  {d.released_at ? ` · released ${fmtDate(d.released_at)}` : ''}
                </div>
              </div>
              <Badge status={st.badge} text={st.label} />
            </div>
            <Files d={d} />

            {d.review_note && (
              <p style={{ fontSize: 12, color: '#92400E', background: '#F59E0B1F', borderRadius: 6, padding: '6px 10px', margin: '8px 0 0' }}>
                <b>Reviewer:</b> {d.review_note}
              </p>
            )}

            {/* QA checklist (tickable while in QA) */}
            {['in_qa', 'approved', 'released'].includes(d.status) && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#000', marginBottom: 4 }}>QA checklist ({d.qa_done}/{d.qa_total})</div>
                {d.qa_items.map(q => (
                  <div key={q.id} onClick={() => !busy && d.status === 'in_qa' && act(() => deliverableAPI.setQa(q.id, !q.is_checked))}
                    style={{ display: 'flex', gap: 8, padding: '4px 0', cursor: d.status === 'in_qa' ? 'pointer' : 'default' }}>
                    <span style={{ fontSize: 16, color: q.is_checked ? 'var(--green)' : '#9CA3AF', flexShrink: 0 }}>{q.is_checked ? <FiCheckSquare /> : <FiSquare />}</span>
                    <span style={{ fontSize: 12, color: '#000' }}>{q.label}
                      {q.is_checked && q.checked_by_name && <span style={{ color: 'var(--text-dark-4)' }}> · {q.checked_by_name}, {fmtDateTime(q.checked_at)}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions for each stage */}
            {staff && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                {['draft', 'changes_requested'].includes(d.status) && (
                  <button type="button" className="thm-btn" disabled={busy} onClick={() => doAction(d, 'submit', 'Submitted for QA and approval')}>Submit for QA</button>
                )}
                {d.status === 'in_qa' && meta.can_approve && (
                  <button type="button" className="thm-btn" disabled={busy || d.qa_done < d.qa_total} onClick={() => doAction(d, 'approve', 'Deliverable approved')}>
                    {d.qa_done < d.qa_total ? `Complete QA to approve (${d.qa_total - d.qa_done} left)` : 'Approve'}
                  </button>
                )}
                {d.status === 'in_qa' && !meta.can_approve && d.qa_done === d.qa_total && (
                  <span style={{ fontSize: 12, color: '#4A4949' }}>QA complete — waiting for a founder / admin to approve.</span>
                )}
                {d.status === 'approved' && (
                  <button type="button" className="thm-btn" disabled={busy} onClick={() => doAction(d, 'release', 'Released to the client')}>Release to client</button>
                )}
                {['in_qa', 'approved'].includes(d.status) && meta.can_approve && (
                  <>
                    <input className="form-input" style={{ maxWidth: 260 }} placeholder="What needs to change?" value={notes[d.id] || ''}
                      onChange={e => setNotes(n => ({ ...n, [d.id]: e.target.value }))} />
                    <button type="button" className="ai-remove-btn" disabled={busy} onClick={() => doAction(d, 'request_changes', 'Sent back for changes')}>Request changes</button>
                  </>
                )}
              </div>
            )}
            {staff && d.status === 'approved' && qaHours !== null && qaHours < 24 && (
              <p style={{ fontSize: 11, color: 'var(--orange)', margin: '6px 0 0' }}>
                <FiAlertTriangle style={{ verticalAlign: '-2px' }} /> QA finished {Math.max(0, Math.round(qaHours))}h ago — the standard is QA at least 24 hours before final delivery.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

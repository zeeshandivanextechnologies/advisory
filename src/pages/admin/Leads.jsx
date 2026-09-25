import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, Modal, showToast } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { fmtDateTime } from '../../utils/services';
import { LEAD_SOURCES, LEAD_STATUSES, leadSourceLabel } from '../../utils/journey';
import { FiInbox } from 'react-icons/fi';

const statusBadge = (s) => ({ new: 'open', contacted: 'in_progress', qualified: 'review', proposal: 'pending', won: 'completed', lost: 'cancelled', nurture: 'draft' }[s] || s);
const statusLabel = (s) => LEAD_STATUSES.find(x => x.value === s)?.label || s;

// Step 1 of the client journey: every inquiry is a lead with a source and status
export default function AdminLeads() {
  const [rows, setRows]       = useState([]);
  const [meta, setMeta]       = useState({ total: 0, page: 1, limit: 20, new: 0 });
  const [status, setStatus]   = useState('');
  const [source, setSource]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback((page = 1) => {
    setLoading(true);
    adminAPI.getLeads({ status, source, search, page, limit: 20 })
      .then(r => { setRows(r.data.data || []); setMeta(r.data.meta || { total: 0, page: 1, limit: 20 }); })
      .catch(() => showToast('Failed to load leads', 'error'))
      .finally(() => setLoading(false));
  }, [status, source, search]);

  useEffect(() => { load(1); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateLead(edit.id, { status: edit.status, source: edit.source, notes: edit.notes });
      showToast('Lead updated');
      setEdit(null);
      load(meta.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const select = { fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' };

  return (
    <>
      <AppHeader breadcrumb="Leads" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3 flex-wrap">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Leads</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>
              {meta.total} leads · {meta.new || 0} new — reply within 4–6 working hours
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="form-select" style={select} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className="form-select" style={select} value={source} onChange={e => setSource(e.target.value)}>
              <option value="">All Sources</option>
              {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">Inquiries</h5>
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, company…" />
          </div>
          {loading ? <Spinner /> : (
            <div className="table-responsive">
              <table className="table billing-table align-middle mb-0 ai-case-table">
                <thead><tr><th>Contact</th><th>Company</th><th>Subject</th><th>Source</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.length ? rows.map(l => (
                    <tr key={l.id}>
                      <td><div className="plan-table-content"><h5>{l.name}</h5><p>{l.email}</p></div></td>
                      <td>{l.company || '—'}</td>
                      <td>{l.subject || '—'}</td>
                      <td>{leadSourceLabel(l.source)}</td>
                      <td>{fmtDateTime(l.created_at)}</td>
                      <td><Badge status={statusBadge(l.status)} text={statusLabel(l.status)} /></td>
                      <td><button className="thm-btn" onClick={() => setEdit({ ...l, notes: l.notes || '' })}>Open</button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7}><EmptyState icon={<FiInbox />} title="No leads" text="Contact-form inquiries appear here" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.name}${edit.company ? ` — ${edit.company}` : ''}` : 'Lead'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {edit && <a className="ai-thm-btn outline" href={`mailto:${edit.email}?subject=${encodeURIComponent(`Re: ${edit.subject || 'Your inquiry'}`)}`}>Reply by email</a>}
            <button className="ai-thm-btn outline" onClick={() => setEdit(null)}>Cancel</button>
            <button className="ai-thm-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        }>
        {edit && (
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label">Message</label>
              <p style={{ fontSize: 13, color: '#4A4949', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{edit.message}</p>
            </div>
            <div className="col-md-6 form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={edit.status} onChange={e => setEdit(p => ({ ...p, status: e.target.value }))}>
                {LEAD_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-md-6 form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={edit.source} onChange={e => setEdit(p => ({ ...p, source: e.target.value }))}>
                {LEAD_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-12 form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={edit.notes} onChange={e => setEdit(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

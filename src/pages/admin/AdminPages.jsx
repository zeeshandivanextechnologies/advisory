import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, Modal, ConfirmModal, StatCard, showToast } from '../../components/common/index';
import { adminAPI, caseAPI, documentAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import { useSettings } from '../../context/SettingsContext';

/* ═══ ADVISORS ════════════════════════════════════════════ */
export function AdminAdvisors() {
  const [advisors, setAdvisors] = useState([]);
  const [meta, setMeta]         = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading]   = useState(true);
  const { currency }            = useSettings();

  const load = useCallback((page = 1) => {
    setLoading(true);
    adminAPI.getAdvisors({ search, status: statusFilter, page, limit: 20 })
      .then(r => { setAdvisors(r.data.data); setMeta(r.data.meta); })
      .catch(console.error).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateAdvisorStatus(id, { status });
      showToast(`Advisor ${status} successfully`);
      load(meta.page);
    } catch { showToast('Action failed', 'error'); }
  };

  return (
    <>
      <AppHeader breadcrumb="Advisors" badge="SUPER ADMIN" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Advisor Management</h1>
            <p className="page-subtitle">{meta.total} advisors registered</p>
          </div>
          <select className="form-select" style={{ fontSize: 12, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-title">All Advisors</span>
            <SearchInput value={search} onChange={setSearch} placeholder="Search advisors…" />
          </div>
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Advisor</th><th>Rate/hr</th><th>Clients</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {advisors.length ? advisors.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="doc-name">{a.full_name}</div>
                      <div className="doc-meta">{a.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{a.hourly_rate ? `${currency} ${a.hourly_rate}` : '—'}</td>
                    <td style={{ fontSize: 13 }}>{a.total_clients}</td>
                    <td style={{ fontSize: 13 }}>⭐ {Number(a.rating).toFixed(1)}</td>
                    <td><Badge status={a.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {a.status !== 'active'    && <button className="btn btn-success btn-sm" onClick={() => updateStatus(a.id, 'active')}>Approve</button>}
                      {a.status !== 'suspended' && <button className="btn btn-danger btn-sm" onClick={() => updateStatus(a.id, 'suspended')}>Suspend</button>}
                    </td>
                  </tr>
                )) : <tr><td colSpan={6}><EmptyState icon="🎯" title="No advisors found" /></td></tr>}
              </tbody>
            </table>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>
    </>
  );
}

/* ═══ CASES ═══════════════════════════════════════════════ */
export function AdminCases() {
  const [cases, setCases]     = useState([]);
  const [meta, setMeta]       = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1) => {
    setLoading(true);
    caseAPI.list({ search, status: statusFilter, page, limit: 20 })
      .then(r => { setCases(r.data.data); setMeta(r.data.meta); })
      .catch(console.error).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const statuses = ['open', 'in_progress', 'pending_docs', 'review', 'closed', 'cancelled'];

  return (
    <>
      <AppHeader breadcrumb="All Cases" badge="SUPER ADMIN" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Case Management</h1>
            <p className="page-subtitle">{meta.total} total cases</p>
          </div>
          <select className="form-select" style={{ fontSize: 12, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="table-card">
          <div className="table-header">
            <span className="table-title">All Cases</span>
            <SearchInput value={search} onChange={setSearch} placeholder="Search cases…" />
          </div>
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Case</th><th>Client</th><th>Advisor</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead>
              <tbody>
                {cases.length ? cases.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="doc-name">{c.title}</div>
                      <div className="doc-meta">{c.case_number}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{c.user_name}</td>
                    <td style={{ fontSize: 13 }}>{c.advisor_name || '—'}</td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize', color: 'var(--text-dark-4)' }}>
                      {c.category?.replace(/_/g, ' ')}
                    </td>
                    <td><Badge status={c.priority} /></td>
                    <td><Badge status={c.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : <tr><td colSpan={7}><EmptyState icon="📋" title="No cases found" /></td></tr>}
              </tbody>
            </table>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>
    </>
  );
}

/* ═══ DOCUMENTS ═══════════════════════════════════════════ */
export function AdminDocuments() {
  const [docs, setDocs]       = useState([]);
  const [meta, setMeta]       = useState({ total: 0, page: 1, limit: 20 });
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote]   = useState('');

  const load = useCallback((page = 1) => {
    setLoading(true);
    documentAPI.list({ status: statusFilter, page, limit: 20 })
      .then(r => { setDocs(r.data.data); setMeta(r.data.meta); })
      .catch(console.error).finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const handleReview = async (status) => {
    try {
      await documentAPI.review(reviewModal.id, { status, notes: reviewNote });
      showToast(`Document ${status}`);
      setReviewModal(null); setReviewNote('');
      load(meta.page);
    } catch { showToast('Action failed', 'error'); }
  };

  return (
    <>
      <AppHeader breadcrumb="Documents" badge="SUPER ADMIN" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Document Management</h1>
            <p className="page-subtitle">Review and manage uploaded documents</p>
          </div>
          <select className="form-select" style={{ fontSize: 12, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-card">
          <div className="table-header"><span className="table-title">All Documents</span></div>
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Document</th><th>Uploaded By</th><th>Category</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {docs.length ? docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="doc-name">{d.original_name}</div>
                      <div className="doc-meta">{new Date(d.created_at).toLocaleDateString()}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{d.uploader_name}</td>
                    <td style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-dark-4)' }}>{d.category}</td>
                    <td style={{ fontSize: 12 }}>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                    <td><Badge status={d.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {d.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => setReviewModal(d)}>Review</button>
                      )}
                      <a href={`/uploads/${d.file_name}`} target="_blank" rel="noreferrer" className="table-action-btn">View</a>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6}><EmptyState icon="📄" title="No documents found" /></td></tr>}
              </tbody>
            </table>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>

      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)} title="Review Document"
        footer={
          <>
            <button className="btn btn-danger btn-sm" onClick={() => handleReview('rejected')}>Reject</button>
            <button className="btn btn-success btn-sm" onClick={() => handleReview('approved')}>Approve</button>
          </>
        }
      >
        <p style={{ fontSize: 14, marginBottom: 12 }}><strong>{reviewModal?.original_name}</strong></p>
        <div className="form-group">
          <label className="form-label">Review Notes (optional)</label>
          <textarea className="form-textarea" value={reviewNote} onChange={e => setReviewNote(e.target.value)}
            placeholder="Add notes about this document…" />
        </div>
      </Modal>
    </>
  );
}

/* ═══ REVENUE ═════════════════════════════════════════════ */
export function AdminRevenue() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { currency }      = useSettings();

  useEffect(() => {
    adminAPI.getRevenue()
      .then(r => setData(r.data.data))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <><AppHeader breadcrumb="Revenue" badge="SUPER ADMIN" /><Spinner /></>;

  const { stats, summary, recent_payments } = data || {};

  return (
    <>
      <AppHeader breadcrumb="Revenue" badge="SUPER ADMIN" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Revenue & Payments</h1>
            <p className="page-subtitle">Financial overview of the platform</p>
          </div>
          <button className="btn btn-accent btn-sm">Export CSV</button>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          <StatCard icon="💰" label="Total Revenue"  value={`${currency} ${Number(stats?.total_revenue || 0).toLocaleString()}`} borderColor="var(--green)" />
          <StatCard icon="⏳" label="Pending"        value={`${currency} ${Number(stats?.pending_amount || 0).toLocaleString()}`} borderColor="var(--orange)" />
          <StatCard icon="📊" label="Months Tracked" value={summary?.length || 0} borderColor="var(--blue)" />
        </div>

        {summary?.length > 0 && (
          <div className="card-light" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', marginBottom: 20 }}>Monthly Revenue</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#A6A5A4' }} />
                <YAxis tick={{ fontSize: 11, fill: '#A6A5A4' }} />
                <Tooltip formatter={(v) => [`${currency} ${Number(v).toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="total" stroke="#16A34A" strokeWidth={2} dot={{ r: 4, fill: '#16A34A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="table-card">
          <div className="table-header"><span className="table-title">Recent Transactions</span></div>
          <table className="data-table">
            <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {recent_payments?.length ? recent_payments.map(p => (
                <tr key={p.id}>
                  <td><div className="doc-name">{p.invoice_no}</div></td>
                  <td style={{ fontSize: 13 }}>{p.user_name}</td>
                  <td style={{ fontSize: 13, fontWeight: 600 }}>{p.currency} {Number(p.amount).toLocaleString()}</td>
                  <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{p.payment_method}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</td>
                  <td><Badge status={p.status} /></td>
                </tr>
              )) : <tr><td colSpan={6}><EmptyState icon="💳" title="No transactions yet" /></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ═══ SETTINGS ════════════════════════════════════════════ */
export function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    adminAPI.getSettings()
      .then(r => setSettings(r.data.data || {}))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      showToast('Settings saved successfully');
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <><AppHeader breadcrumb="Settings" badge="SUPER ADMIN" /><Spinner /></>;

  return (
    <>
      <AppHeader breadcrumb="Settings" badge="SUPER ADMIN" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Platform Settings</h1>
            <p className="page-subtitle">Manage global platform configuration</p>
          </div>
          <button className="btn btn-accent" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>General</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'platform_name',  label: 'Platform Name' },
                { key: 'platform_email', label: 'Contact Email' },
                { key: 'default_currency', label: 'Default Currency' },
                { key: 'consultation_fee', label: `Default Consultation Fee (${currency})` },
              ].map(({ key, label }) => (
                <div className="form-group" key={key}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={settings[key] || ''} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Access Control</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'allow_registration', label: 'Allow New Registrations' },
                { key: 'maintenance_mode',   label: 'Maintenance Mode' },
              ].map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>{label}</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={settings[key] === '1'} onChange={e => set(key, e.target.checked ? '1' : '0')} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

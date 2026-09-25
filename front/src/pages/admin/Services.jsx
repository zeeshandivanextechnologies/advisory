import { FiArrowRight, FiClock, FiInbox } from 'react-icons/fi';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, Modal, showToast } from '../../components/common/index';
import { serviceAPI, adminAPI, intakeAPI, journeyAPI, salesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogHoursModal, RetainerLogModal } from '../../components/services/RetainerModals';
import { tabsFor, isFullAdmin } from '../../utils/team';
import {
  priceLabel, money, hours, fmtDate, CATEGORY_LABELS, PRICING_MODELS, REQUEST_STATUSES, OPEN_REQUEST,
  linesToList, listToLines, PROSPECT_TYPES,
} from '../../utils/services';

const statusText = (s) => REQUEST_STATUSES.find(x => x.value === s)?.label || s;
const Field = ({ label, children, col = 12 }) => (
  <div className={`col-md-${col} form-group`}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);
const Footer = ({ onCancel, onSave, saving, label = 'Save' }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
    <button className="ai-thm-btn outline" onClick={onCancel}>Cancel</button>
    <button className="ai-thm-btn" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
  </div>
);

/* ═══ Requests ═══════════════════════════════════════════════ */
function RequestsTab({ onRetainerCreated }) {
  const navigate              = useNavigate();
  const { user }              = useAuth();
  const full                  = isFullAdmin(user);
  const [intake, setIntake]   = useState(null);
  const [sales, setSales]     = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [rows, setRows]       = useState([]);
  const [meta, setMeta]       = useState({ total: 0, page: 1, limit: 20 });
  const [status, setStatus]   = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback((page = 1) => {
    setLoading(true);
    serviceAPI.adminGetRequests({ status, search, page, limit: 20 })
      .then(r => { setRows(r.data.data || []); setMeta(r.data.meta || { total: 0, page: 1, limit: 20 }); })
      .catch(() => showToast('Failed to load requests', 'error'))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => { load(1); }, [load]);

  // Show the client's pre-call intake next to the request
  useEffect(() => {
    setIntake(null);
    setSales(null);
    setActionNote('');
    if (edit?.user_id) {
      intakeAPI.get(edit.user_id).then(r => setIntake(r.data.data || false)).catch(() => setIntake(false));
      salesAPI.adminGetProfile(edit.user_id).then(r => setSales(r.data.data)).catch(() => {});
    }
  }, [edit?.user_id]);

  const saveProspect = async (patch) => {
    try {
      const r = await salesAPI.adminSetProspect(edit.user_id, patch);
      setSales(r.data.data);
      showToast('Prospect profile saved');
    } catch (err) { showToast(err.response?.data?.message || 'Save failed', 'error'); }
  };

  // Fit discipline: nurture for the configured period, or refer out
  const requestAction = async (action) => {
    setSaving(true);
    try {
      await serviceAPI.adminRequestAction(edit.id, { action, note: actionNote });
      showToast(action === 'nurture' ? 'Moved to nurture' : 'Client referred');
      setEdit(null);
      load(meta.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setSaving(false); }
  };

  // Step 5: draft a proposal pre-filled from the request and its service
  const createProposal = async () => {
    if (edit.fit_ok === false && !window.confirm(`This request is below the fit threshold (${(edit.fit_reasons || []).join('; ')}). Create a proposal anyway?`)) return;
    setSaving(true);
    try {
      const r = await journeyAPI.adminSaveProposal(null, { request_id: edit.id, amount: edit.quoted_amount || '' });
      setEdit(null);
      navigate('/admin/engagements', { state: { tab: 'proposals', proposalId: r.data.data.id } });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create proposal', 'error');
    } finally { setSaving(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await serviceAPI.adminUpdateRequest(edit.id, { status: edit.status, quoted_amount: edit.quoted_amount ?? '', admin_notes: edit.admin_notes || '' });
      showToast('Request updated');
      setEdit(null);
      load(meta.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const startRetainer = async () => {
    setSaving(true);
    try {
      await serviceAPI.adminSaveRetainer(null, { request_id: edit.id });
      showToast('Retainer started — assign an advisor in the Retainers tab');
      setEdit(null);
      load(meta.page);
      onRetainerCreated?.();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not start retainer', 'error');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Service Requests</h5>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select className="form-select" style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {REQUEST_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <SearchInput value={search} onChange={setSearch} placeholder="Search client or service…" />
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Service</th><th>Budget</th><th>Fit</th><th>Quote</th><th>Received</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(r => (
                  <tr key={r.id}>
                    <td><div className="plan-table-content"><h5>{r.client_name}</h5><p>{r.client_email}</p></div></td>
                    <td><div className="plan-table-content"><h5>{r.offering_name}</h5><p>{CATEGORY_LABELS[r.category]}</p></div></td>
                    <td>{r.budget || '—'}</td>
                    <td>{r.fit_applies ? <Badge status={r.fit_ok ? 'approved' : 'pending'} text={r.fit_ok ? 'OK' : 'Below threshold'} /> : '—'}</td>
                    <td>{r.quoted_amount ? money(r.quoted_amount, r.currency) : '—'}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td><Badge status={r.status} text={statusText(r.status)} /></td>
                    <td><button className="thm-btn" onClick={() => setEdit({ ...r })}>Manage</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={8}><EmptyState icon={<FiInbox />} title="No requests" text="Service requests from clients appear here" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit ? `${edit.offering_name} — ${edit.client_name}` : 'Request'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}
      >
        {edit && (
          <div className="row g-3">
            {edit.message && (
              <div className="col-12">
                <label className="form-label">Client message</label>
                <p style={{ fontSize: 13, color: '#4A4949', whiteSpace: 'pre-wrap', marginBottom: 0 }}>{edit.message}</p>
              </div>
            )}
            {edit.fit_applies && (
              <div className="col-12">
                <div style={{ background: edit.fit_ok ? '#22C55E1F' : '#F59E0B1F', border: `0.9px solid ${edit.fit_ok ? '#22C55E' : '#F59E0B'}`, borderRadius: 'var(--radius)', padding: '10px 12px', fontSize: 12, color: edit.fit_ok ? '#166534' : '#92400E' }}>
                  {edit.fit_ok
                    ? `Fit check passed${edit.documents_committed ? ' · documents committed' : ''}.`
                    : `Below fit threshold: ${(edit.fit_reasons || []).join('; ')}. ${edit.fit_advice}.`}
                </div>
              </div>
            )}
            {edit.status === 'nurture' && <div className="col-12" style={{ fontSize: 12, color: '#4A4949' }}>In nurture until <b>{fmtDate(edit.nurture_until)}</b>.</div>}
            {edit.status === 'referred' && <div className="col-12" style={{ fontSize: 12, color: '#4A4949' }}>Referred to: <b>{edit.referral_note}</b></div>}
            <Field label="Status" col={6}>
              <select className="form-select" value={edit.status} onChange={e => setEdit(p => ({ ...p, status: e.target.value }))}>
                {REQUEST_STATUSES.filter(s => !['nurture', 'referred'].includes(s.value) || s.value === edit.status).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label={`Quoted amount (${edit.currency || 'USD'})`} col={6}>
              <input type="number" className="form-input" value={edit.quoted_amount ?? ''} placeholder={edit.price_min || ''}
                onChange={e => setEdit(p => ({ ...p, quoted_amount: e.target.value }))} />
            </Field>
            <Field label="Internal notes">
              <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={edit.admin_notes || ''}
                onChange={e => setEdit(p => ({ ...p, admin_notes: e.target.value }))} />
            </Field>
            <div className="col-12">
              <label className="form-label">Client intake</label>
              {intake === null ? <Spinner size={20} center={false} /> : intake ? (
                <div style={{ fontSize: 12, color: '#4A4949', lineHeight: 1.7 }}>
                  {[['Industry', intake.industry], ['Country', intake.country_of_origin], ['Target market', intake.target_market],
                    ['Stage', intake.business_stage], ['Capital', intake.capital_range], ['Documents', intake.documents_ready],
                    ['Timeline', intake.timeline]].filter(([, v]) => v).map(([k, v]) => <div key={k}><b style={{ color: '#000' }}>{k}:</b> {v}</div>)}
                  {intake.main_question && <div><b style={{ color: '#000' }}>Main question:</b> {intake.main_question}</div>}
                  {intake.needs?.length > 0 && <div><b style={{ color: '#000' }}>Needs:</b> {intake.needs.join(', ')}</div>}
                </div>
              ) : <p style={{ fontSize: 12, color: 'var(--orange)', marginBottom: 0 }}>Intake not completed yet.</p>}
            </div>
            {sales && full && (
              <div className="col-12">
                <label className="form-label">Prospect profile (meeting rules)</label>
                <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 6 }}>
                  {sales.meetings} meeting{sales.meetings === 1 ? '' : 's'} so far · {sales.paid_pathway ? 'paid pathway' : `free calls: ${sales.free_calls_limit}`} · {sales.proposal_stage ? 'proposal sent' : `max ${sales.max_premeetings} before proposal`}
                  {sales.exempt ? ' · exempt from limits' : ''}{sales.can_book ? '' : ' · booking blocked'}
                </p>
                <div className="row g-2">
                  <div className="col-md-6">
                    <select className="form-select" value={sales.prospect_type} onChange={e => saveProspect({ prospect_type: e.target.value })}>
                      {PROSPECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  {sales.prospect_type === 'strategic' && (
                    <div className="col-md-6">
                      <input className="form-input" placeholder="Defined deal (enables +1 relationship call)" defaultValue={sales.relationship_deal || ''}
                        onBlur={e => e.target.value !== (sales.relationship_deal || '') && saveProspect({ relationship_deal: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>
            )}
            {full && OPEN_REQUEST.includes(edit.status) && (
              <div className="col-12">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="thm-btn" disabled={saving} onClick={createProposal}>Create Proposal / SOW</button>
                  <button className="ai-thm-btn outline" disabled={saving} onClick={() => requestAction('nurture')}>Move to Nurture</button>
                  <button className="ai-thm-btn outline" disabled={saving} onClick={() => requestAction('refer')}>Refer Out</button>
                </div>
                <input className="form-input" style={{ marginTop: 8 }} placeholder="Note — who you refer to, or why you nurture"
                  value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </div>
            )}
            {full && edit.offering_slug === 'executive-advisory-retainer' && OPEN_REQUEST.includes(edit.status) && (
              <div className="col-12">
                <button className="ai-thm-btn outline" disabled={saving} onClick={startRetainer}>Start Retainer for this Client</button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Offerings ══════════════════════════════════════════════ */
const BLANK_OFFERING = {
  name: '', category: 'decision', summary: '', pricing_model: 'fixed', price_min: '', price_max: '', price_note: '',
  currency: 'USD', min_term_months: '', included_hours: '', in_scope: '', deliverables: '', out_of_scope: '',
  best_fit: '', timeline: '', sort_order: '',
};

function OfferingsTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    serviceAPI.adminGetOfferings()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load offerings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (o) => setEdit(o ? {
    ...BLANK_OFFERING, ...o,
    price_min: o.price_min ?? '', price_max: o.price_max ?? '', price_note: o.price_note || '',
    min_term_months: o.min_term_months ?? '', included_hours: o.included_hours ?? '',
    in_scope: listToLines(o.in_scope), deliverables: listToLines(o.deliverables), out_of_scope: listToLines(o.out_of_scope),
    best_fit: o.best_fit || '', timeline: o.timeline || '', summary: o.summary || '',
  } : { ...BLANK_OFFERING });

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!edit.name.trim()) return showToast('Name is required', 'error');
    setSaving(true);
    try {
      const { id, ...rest } = edit;
      await serviceAPI.adminSaveOffering(id, {
        name: rest.name, category: rest.category, summary: rest.summary, pricing_model: rest.pricing_model,
        price_min: rest.price_min, price_max: rest.price_max, price_note: rest.price_note, currency: rest.currency,
        min_term_months: rest.min_term_months, included_hours: rest.included_hours,
        in_scope: linesToList(rest.in_scope), deliverables: linesToList(rest.deliverables), out_of_scope: linesToList(rest.out_of_scope),
        best_fit: rest.best_fit, timeline: rest.timeline, sort_order: rest.sort_order,
      });
      showToast(id ? 'Offering updated' : 'Offering created');
      setEdit(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const toggle = async (o) => {
    try {
      await serviceAPI.adminSaveOffering(o.id, { is_active: !o.is_active });
      showToast(o.is_active ? 'Offering hidden from clients' : 'Offering is live');
      load();
    } catch { showToast('Update failed', 'error'); }
  };

  const hasPrice = edit && !['membership', 'on_request'].includes(edit.pricing_model);

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Service Catalog</h5>
          <button className="thm-btn" onClick={() => openEdit(null)}>+ New Offering</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Offering</th><th>Category</th><th>Price</th><th>Open requests</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map(o => (
                  <tr key={o.id}>
                    <td><div className="plan-table-content"><h5>{o.name}</h5><p>{o.summary}</p></div></td>
                    <td>{o.category_name}</td>
                    <td>{priceLabel(o)}{o.price_note ? <div style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>{o.price_note}</div> : null}</td>
                    <td>{o.open_requests}</td>
                    <td><Badge status={o.is_active ? 'active' : 'draft'} text={o.is_active ? 'Live' : 'Hidden'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="thm-btn" onClick={() => openEdit(o)}>Edit</button>
                        <button className="ai-thm-btn outline" onClick={() => toggle(o)}>{o.is_active ? 'Hide' : 'Publish'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Edit: ${edit.name}` : 'New Offering'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}
      >
        {edit && (
          <div className="row g-3">
            <Field label="Name *" col={8}><input className="form-input" value={edit.name} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Category" col={4}>
              <select className="form-select" value={edit.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Summary (client problem)"><input className="form-input" value={edit.summary} onChange={e => set('summary', e.target.value)} /></Field>
            <Field label="Pricing" col={4}>
              <select className="form-select" value={edit.pricing_model} onChange={e => set('pricing_model', e.target.value)}>
                {PRICING_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            {hasPrice && (
              <Field label={edit.pricing_model === 'range' ? 'Min price' : 'Price'} col={3}>
                <input type="number" className="form-input" value={edit.price_min} onChange={e => set('price_min', e.target.value)} />
              </Field>
            )}
            {edit.pricing_model === 'range' && (
              <Field label="Max price" col={3}><input type="number" className="form-input" value={edit.price_max} onChange={e => set('price_max', e.target.value)} /></Field>
            )}
            <Field label="Currency" col={2}><input className="form-input" value={edit.currency} onChange={e => set('currency', e.target.value.toUpperCase())} /></Field>
            <Field label="Price note" col={6}><input className="form-input" placeholder="e.g. for 3 structured calls" value={edit.price_note} onChange={e => set('price_note', e.target.value)} /></Field>
            <Field label="Timeline" col={6}><input className="form-input" placeholder="e.g. 3 sessions × 60 minutes" value={edit.timeline} onChange={e => set('timeline', e.target.value)} /></Field>
            {edit.pricing_model === 'monthly' && (
              <>
                <Field label="Minimum term (months)" col={6}><input type="number" className="form-input" value={edit.min_term_months} onChange={e => set('min_term_months', e.target.value)} /></Field>
                <Field label="Included hours / month" col={6}><input type="number" className="form-input" value={edit.included_hours} onChange={e => set('included_hours', e.target.value)} /></Field>
              </>
            )}
            <Field label="Best fit"><input className="form-input" value={edit.best_fit} onChange={e => set('best_fit', e.target.value)} /></Field>
            <Field label="In scope (one per line)">
              <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={edit.in_scope} onChange={e => set('in_scope', e.target.value)} />
            </Field>
            <Field label="Deliverables (one per line)">
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.deliverables} onChange={e => set('deliverables', e.target.value)} />
            </Field>
            <Field label="Out of scope (one per line)">
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.out_of_scope} onChange={e => set('out_of_scope', e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Retainers ══════════════════════════════════════════════ */
function RetainersTab({ reloadKey }) {
  const { user }                  = useAuth();
  const [rows, setRows]           = useState([]);
  const [advisors, setAdvisors]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [edit, setEdit]           = useState(null);
  const [saving, setSaving]       = useState(false);
  const [logFor, setLogFor]       = useState(null);
  const [viewId, setViewId]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([serviceAPI.getRetainers(), adminAPI.getAdvisors({ status: 'active', limit: 200 })])
      .then(([r, a]) => { setRows(r.data.data || []); setAdvisors(a.data.data || []); })
      .catch(() => showToast('Failed to load retainers', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));

  const openNew = () => setEdit({
    client_email: '', advisor_id: '', monthly_hours: 4, monthly_fee: 2500, currency: 'USD',
    start_date: new Date().toISOString().slice(0, 10), min_term_months: 3,
  });
  const openEdit = (r) => setEdit({
    id: r.id, client_name: r.client_name, advisor_id: r.advisor_id || '', monthly_hours: r.monthly_hours,
    monthly_fee: r.monthly_fee, currency: r.currency, start_date: r.start_date, min_term_months: r.min_term_months,
    end_date: r.end_date || '', status: r.status, notes: r.notes || '', min_term_end: r.min_term_end,
  });

  const save = async () => {
    setSaving(true);
    try {
      const { id, client_name, min_term_end, ...data } = edit;
      await serviceAPI.adminSaveRetainer(id, data);
      showToast(id ? 'Retainer updated' : 'Retainer created');
      setEdit(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Executive Advisory Retainers</h5>
          <button className="thm-btn" onClick={openNew}>+ New Retainer</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Advisor</th><th>This month</th><th>Fee</th><th>Term</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(r => (
                  <tr key={r.id}>
                    <td><div className="plan-table-content"><h5>{r.client_name}</h5><p>{r.client_email}</p></div></td>
                    <td>{r.advisor_name || <span style={{ color: 'var(--orange)' }}>Unassigned</span>}</td>
                    <td>{hours(r.month_used)} / {hours(r.monthly_hours)}</td>
                    <td>{money(r.monthly_fee, r.currency)} / mo</td>
                    <td>
                      <div className="plan-table-content">
                        <h5>{fmtDate(r.start_date)} <FiArrowRight style={{ verticalAlign: '-2px' }} /></h5>
                        <p>{r.end_date ? `Ends ${fmtDate(r.end_date)}` : `Min. until ${fmtDate(r.min_term_end)}`}</p>
                      </div>
                    </td>
                    <td><Badge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="thm-btn" disabled={r.status !== 'active' || Number(r.month_remaining) <= 0} onClick={() => setLogFor(r)}>Log Hours</button>
                        <button className="ai-thm-btn outline" onClick={() => setViewId(r.id)}>Log</button>
                        <button className="ai-thm-btn outline" onClick={() => openEdit(r)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FiClock />} title="No retainers yet" text="Start one from a retainer request or create it here" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?.id ? `Retainer — ${edit.client_name}` : 'New Retainer'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}
      >
        {edit && (
          <div className="row g-3">
            {!edit.id && (
              <Field label="Client email *"><input type="email" className="form-input" value={edit.client_email} onChange={e => set('client_email', e.target.value)} /></Field>
            )}
            <Field label="Advisor">
              <select className="form-select" value={edit.advisor_id} onChange={e => set('advisor_id', e.target.value)}>
                <option value="">Unassigned</option>
                {advisors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </Field>
            <Field label="Hours / month" col={4}><input type="number" className="form-input" value={edit.monthly_hours} onChange={e => set('monthly_hours', e.target.value)} /></Field>
            <Field label="Monthly fee" col={4}><input type="number" className="form-input" value={edit.monthly_fee} onChange={e => set('monthly_fee', e.target.value)} /></Field>
            <Field label="Currency" col={4}><input className="form-input" value={edit.currency} onChange={e => set('currency', e.target.value.toUpperCase())} /></Field>
            <Field label="Start date" col={6}><input type="date" className="form-input" value={edit.start_date} onChange={e => set('start_date', e.target.value)} /></Field>
            <Field label="Minimum term (months)" col={6}><input type="number" className="form-input" value={edit.min_term_months} onChange={e => set('min_term_months', e.target.value)} /></Field>
            {edit.id && (
              <>
                <Field label="Status" col={6}>
                  <select className="form-select" value={edit.status} onChange={e => set('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                </Field>
                <Field label={`End date (earliest ${fmtDate(edit.min_term_end)})`} col={6}>
                  <input type="date" className="form-input" value={edit.end_date} onChange={e => set('end_date', e.target.value)} />
                </Field>
                <Field label="Notes">
                  <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.notes} onChange={e => set('notes', e.target.value)} />
                </Field>
              </>
            )}
          </div>
        )}
      </Modal>

      <LogHoursModal open={!!logFor} retainer={logFor} onClose={() => setLogFor(null)} onSaved={load} />
      <RetainerLogModal open={!!viewId} retainerId={viewId} onClose={() => setViewId(null)} currentUserId={user?.id} isAdmin onChanged={load} />
    </>
  );
}

/* ═══ Page ═══════════════════════════════════════════════════ */
export default function AdminServices() {
  const { user }                  = useAuth();
  const [tab, setTab]             = useState('requests');
  const [retainerKey, setRetainerKey] = useState(0);
  // Limited team logins only see their tabs
  const TABS = tabsFor(user, 'services', [
    { id: 'requests',  label: 'Requests' },
    { id: 'offerings', label: 'Offerings & Pricing' },
    { id: 'retainers', label: 'Retainers' },
  ]);

  return (
    <>
      <AppHeader breadcrumb="Services" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Services & Pricing</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>Offerings catalog, client requests and advisory retainers</p>
          </div>
        </div>

        <div className="case-search-box mb-3">
          <div className="filter-tabs">
            <div className="nav nav-pills gap-2">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`nav-link filter-nav-btn ${tab === t.id ? 'active' : ''}`} style={{ border: '1px solid var(--border-light)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'requests'  && <RequestsTab onRetainerCreated={() => setRetainerKey(k => k + 1)} />}
        {tab === 'offerings' && <OfferingsTab />}
        {tab === 'retainers' && <RetainersTab reloadKey={retainerKey} />}
      </div>
    </>
  );
}

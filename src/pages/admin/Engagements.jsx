import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { journeyAPI, serviceAPI, adminAPI } from '../../services/api';
import EngagementManager from '../../components/journey/EngagementManager';
import { money, fmtDate, linesToList, listToLines } from '../../utils/services';
import {
  PROPOSAL_LABELS, proposalBadge, ENGAGEMENT_LABELS, engagementBadge, invoiceBadge, PAYMENT_METHODS,
} from '../../utils/journey';
import { FiFileText, FiBriefcase, FiDollarSign, FiRepeat, FiX } from 'react-icons/fi';

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
const errMsg = (err, fb) => err.response?.data?.message || fb;
const todayPlus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const StatusFilter = ({ value, onChange, options }) => (
  <select className="form-select" style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">All Status</option>
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

/* ═══ Step 5: proposals ══════════════════════════════════════ */
function ProposalsTab({ openEditId, onSent }) {
  const [rows, setRows]         = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [edit, setEdit]         = useState(null);
  const [create, setCreate]     = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    journeyAPI.adminGetProposals({ status })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load proposals', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { serviceAPI.adminGetOfferings().then(r => setOfferings(r.data.data || [])).catch(() => {}); }, []);

  const openEdit = (pr) => setEdit({
    id: pr.id, client_name: pr.client_name, title: pr.title, scope: pr.scope || '', timeline: pr.timeline || '',
    deliverables: listToLines(pr.deliverables), out_of_scope: listToLines(pr.out_of_scope),
    amount: pr.amount, currency: pr.currency, deposit_percent: pr.deposit_percent,
    payment_terms: pr.payment_terms || '', valid_until: pr.valid_until,
  });

  // Coming from Services → Requests → "Create proposal"
  useEffect(() => {
    if (!openEditId || !rows.length) return;
    const pr = rows.find(x => x.id === openEditId);
    if (pr) openEdit(pr);
  }, [openEditId, rows]);

  const save = async (andSend) => {
    setSaving(true);
    try {
      const { id, client_name, ...data } = edit;
      await journeyAPI.adminSaveProposal(id, {
        ...data, deliverables: linesToList(data.deliverables), out_of_scope: linesToList(data.out_of_scope),
      });
      if (andSend) {
        await journeyAPI.adminSendProposal(id);
        showToast('Proposal sent to the client');
        onSent?.();
      } else showToast('Draft saved');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const createDraft = async () => {
    if (!create.client_email.trim() || !create.offering_id) return showToast('Client email and service are required', 'error');
    setSaving(true);
    try {
      const r = await journeyAPI.adminSaveProposal(null, create);
      setCreate(null);
      load();
      openEdit(r.data.data);
    } catch (err) {
      showToast(errMsg(err, 'Could not create proposal'), 'error');
    } finally { setSaving(false); }
  };

  const withdraw = async (pr) => {
    if (!window.confirm(`Withdraw "${pr.title}"?`)) return;
    try { await journeyAPI.adminWithdrawProposal(pr.id); showToast('Proposal withdrawn'); load(); }
    catch (err) { showToast(errMsg(err, 'Withdraw failed'), 'error'); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Proposals / SOW</h5>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusFilter value={status} onChange={setStatus} options={Object.entries(PROPOSAL_LABELS)} />
            <button className="thm-btn" onClick={() => setCreate({ client_email: '', offering_id: '', amount: '' })}>+ New Proposal</button>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Proposal</th><th>Amount</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(pr => (
                  <tr key={pr.id}>
                    <td><div className="plan-table-content"><h5>{pr.client_name}</h5><p>{pr.client_email}</p></div></td>
                    <td><div className="plan-table-content"><h5>{pr.title}</h5><p>{pr.offering_name || '—'}</p></div></td>
                    <td><div className="plan-table-content"><h5>{money(pr.amount, pr.currency)}</h5><p>{pr.deposit_percent}% deposit: {money(pr.deposit_amount, pr.currency)}</p></div></td>
                    <td>{fmtDate(pr.valid_until)}</td>
                    <td><Badge status={proposalBadge(pr)} text={pr.is_expired ? 'Expired' : PROPOSAL_LABELS[pr.status]} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {pr.status === 'draft' && <button className="thm-btn" onClick={() => openEdit(pr)}>Edit & Send</button>}
                        {['draft', 'sent'].includes(pr.status) && <button className="ai-remove-btn" onClick={() => withdraw(pr)}>Withdraw</button>}
                        {pr.status === 'declined' && pr.decline_reason && <span style={{ fontSize: 12, color: '#4A4949' }}>“{pr.decline_reason}”</span>}
                        {pr.status === 'accepted' && <span style={{ fontSize: 12, color: '#4A4949' }}>Signed: {pr.signed_name}</span>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FiFileText />} title="No proposals" text="Create one from a service request or with + New Proposal" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!create} onClose={() => setCreate(null)} title="New Proposal"
        footer={<Footer onCancel={() => setCreate(null)} onSave={createDraft} saving={saving} label="Create Draft" />}>
        {create && (
          <div className="row g-3">
            <Field label="Client email *"><input type="email" className="form-input" value={create.client_email} onChange={e => setCreate(p => ({ ...p, client_email: e.target.value }))} /></Field>
            <Field label="Service *" col={8}>
              <select className="form-select" value={create.offering_id} onChange={e => setCreate(p => ({ ...p, offering_id: e.target.value }))}>
                <option value="">Select service</option>
                {offerings.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Amount" col={4}><input type="number" className="form-input" placeholder="From catalog" value={create.amount} onChange={e => setCreate(p => ({ ...p, amount: e.target.value }))} /></Field>
            <p style={{ fontSize: 12, color: 'var(--text-dark-4)', marginBottom: 0 }}>Scope, deliverables and boundaries are pre-filled from the service — you can edit them next.</p>
          </div>
        )}
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Proposal — ${edit.client_name}` : 'Proposal'}
        footer={edit && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setEdit(null)}>Cancel</button>
            <button className="ai-thm-btn outline" disabled={saving} onClick={() => save(false)}>Save Draft</button>
            <button className="ai-thm-btn" disabled={saving} onClick={() => save(true)}>{saving ? 'Sending…' : 'Save & Send'}</button>
          </div>
        )}>
        {edit && (
          <div className="row g-3">
            <Field label="Title"><input className="form-input" value={edit.title} onChange={e => setEdit(p => ({ ...p, title: e.target.value }))} /></Field>
            <Field label="Scope *">
              <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={edit.scope} onChange={e => setEdit(p => ({ ...p, scope: e.target.value }))} />
            </Field>
            <Field label="Deliverables (one per line)">
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.deliverables} onChange={e => setEdit(p => ({ ...p, deliverables: e.target.value }))} />
            </Field>
            <Field label="Boundaries — not included (one per line)">
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.out_of_scope} onChange={e => setEdit(p => ({ ...p, out_of_scope: e.target.value }))} />
            </Field>
            <Field label="Timeline"><input className="form-input" placeholder="e.g. 4 weeks from kickoff" value={edit.timeline} onChange={e => setEdit(p => ({ ...p, timeline: e.target.value }))} /></Field>
            <Field label="Price *" col={4}><input type="number" className="form-input" value={edit.amount} onChange={e => setEdit(p => ({ ...p, amount: e.target.value }))} /></Field>
            <Field label="Currency" col={4}><input className="form-input" value={edit.currency} onChange={e => setEdit(p => ({ ...p, currency: e.target.value.toUpperCase() }))} /></Field>
            <Field label="Deposit %" col={4}><input type="number" className="form-input" value={edit.deposit_percent} onChange={e => setEdit(p => ({ ...p, deposit_percent: e.target.value }))} /></Field>
            <Field label="Payment terms"><input className="form-input" value={edit.payment_terms} onChange={e => setEdit(p => ({ ...p, payment_terms: e.target.value }))} /></Field>
            <Field label="Valid until (15–30 days)" col={6}>
              <input type="date" className="form-input" min={todayPlus(15)} max={todayPlus(30)} value={edit.valid_until} onChange={e => setEdit(p => ({ ...p, valid_until: e.target.value }))} />
            </Field>
            <div className="col-md-6" style={{ fontSize: 12, color: '#4A4949', alignSelf: 'end' }}>
              Deposit due on acceptance: <b>{money(Number(edit.amount || 0) * Number(edit.deposit_percent || 0) / 100, edit.currency)}</b>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Engagements (steps 6–11) ═══════════════════════════════ */
function EngagementsTab({ reloadKey }) {
  const [rows, setRows]         = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [advisors, setAdvisors] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    journeyAPI.getEngagements({ status })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load engagements', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load, reloadKey]);
  useEffect(() => { adminAPI.getAdvisors({ status: 'active', limit: 200 }).then(r => setAdvisors(r.data.data || [])).catch(() => {}); }, []);

  return (
    <>
      {selected && (
        <div className="advisor-legal-cards mb-3">
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setSelected(null)}><FiX /> Close</button>
          </div>
          <EngagementManager key={selected} engagementId={selected} role="admin" advisors={advisors} onChanged={load} />
        </div>
      )}

      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Engagements</h5>
          <StatusFilter value={status} onChange={setStatus} options={Object.entries(ENGAGEMENT_LABELS)} />
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Engagement</th><th>Advisor</th><th>Value</th><th>QA</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(e => (
                  <tr key={e.id}>
                    <td><div className="plan-table-content"><h5>{e.client_name}</h5><p>{e.client_email}</p></div></td>
                    <td><div className="plan-table-content"><h5>{e.title}</h5><p>{e.case_number || 'Workspace after deposit'}</p></div></td>
                    <td>{e.advisor_name || <span style={{ color: 'var(--orange)' }}>Unassigned</span>}</td>
                    <td><div className="plan-table-content"><h5>{money(e.amount, e.currency)}</h5><p>Paid {money(e.paid_amount, e.currency)}</p></div></td>
                    <td>{e.qa_total ? `${e.qa_done}/${e.qa_total}` : '—'}</td>
                    <td><Badge status={engagementBadge(e.status)} text={ENGAGEMENT_LABELS[e.status]} /></td>
                    <td><button className="thm-btn" onClick={() => { setSelected(e.id); document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Manage</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FiBriefcase />} title="No engagements yet" text="An engagement starts when a client accepts a proposal" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══ Invoices (steps 6 & 11) ════════════════════════════════ */
function InvoicesTab() {
  const [rows, setRows]       = useState([]);
  const [status, setStatus]   = useState('unpaid');
  const [loading, setLoading] = useState(true);
  const [payFor, setPayFor]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    journeyAPI.adminGetInvoices({ status })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load invoices', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const record = async () => {
    setSaving(true);
    try {
      await journeyAPI.adminRecordPayment(payFor.id, { method: payFor.method, reference: payFor.reference });
      showToast(payFor.kind === 'deposit' ? 'Deposit recorded — kickoff started' : 'Payment recorded — engagement completed');
      setPayFor(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not record payment'), 'error');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Engagement Invoices</h5>
          <StatusFilter value={status} onChange={setStatus} options={[['unpaid', 'Unpaid'], ['paid', 'Paid'], ['void', 'Void']]} />
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Issued</th><th>Due</th><th>Reminders</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(i => (
                  <tr key={i.id}>
                    <td><div className="plan-table-content"><h5>{i.invoice_no}</h5><p>{i.kind === 'deposit' ? 'Deposit' : 'Final'} · {i.engagement_title}</p></div></td>
                    <td><div className="plan-table-content"><h5>{i.client_name}</h5><p>{i.client_email}</p></div></td>
                    <td>{money(i.amount, i.currency)}</td>
                    <td>{fmtDate(i.issued_at)} <span style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>(day {i.days_since_issue})</span></td>
                    <td style={{ color: i.is_overdue ? 'var(--red)' : undefined }}>{fmtDate(i.due_date)}</td>
                    <td>{i.reminder_days?.length ? `Day ${i.reminder_days.join(', ')}` : '—'}</td>
                    <td><Badge status={i.is_overdue ? 'failed' : invoiceBadge(i)} text={i.is_overdue ? 'overdue' : i.status} /></td>
                    <td>{i.status === 'unpaid' ? <button className="thm-btn" onClick={() => setPayFor({ ...i, method: 'bank_transfer', reference: '' })}>Record payment</button> : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8}><EmptyState icon={<FiDollarSign />} title="No invoices" text="Deposit and final invoices appear here" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-dark-4)', padding: '10px 16px', marginBottom: 0 }}>
          Unpaid invoices get automatic reminders on days 7, 14 and 15 after issue.
        </p>
      </div>

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Record payment — ${payFor.invoice_no}` : 'Record payment'}
        footer={<Footer onCancel={() => setPayFor(null)} onSave={record} saving={saving} label="Record Payment" />}>
        {payFor && (
          <div className="row g-3">
            <p style={{ fontSize: 13, color: '#4A4949' }}>{money(payFor.amount, payFor.currency)} from {payFor.client_name}.</p>
            <Field label="Method" col={6}>
              <select className="form-select" value={payFor.method} onChange={e => setPayFor(p => ({ ...p, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Reference" col={6}><input className="form-input" value={payFor.reference} onChange={e => setPayFor(p => ({ ...p, reference: e.target.value }))} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Step 12: follow-ups ════════════════════════════════════ */
function FollowupsTab() {
  const [rows, setRows]       = useState([]);
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    journeyAPI.adminGetFollowups({ status })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load follow-ups', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await journeyAPI.adminUpdateFollowup(edit.id, { status: edit.status, notes: edit.notes });
      showToast('Follow-up updated');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Update failed'), 'error');
    } finally { setSaving(false); }
  };

  const badgeFor = (s) => ({ scheduled: 'scheduled', sent: 'open', done: 'completed', skipped: 'cancelled' }[s] || s);

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Post-engagement Follow-ups</h5>
          <StatusFilter value={status} onChange={setStatus} options={[['scheduled', 'Scheduled'], ['sent', 'Sent'], ['done', 'Done'], ['skipped', 'Skipped']]} />
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Engagement</th><th>Follow-up</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(f => (
                  <tr key={f.id}>
                    <td><div className="plan-table-content"><h5>{f.client_name}</h5><p>{f.client_email}</p></div></td>
                    <td>{f.engagement_title}</td>
                    <td>Day {f.day_offset} · {f.kind === 'referral' ? 'Referral ask' : 'Check-in'}</td>
                    <td>{fmtDate(f.due_date)}</td>
                    <td><Badge status={badgeFor(f.status)} text={f.status} /></td>
                    <td><button className="thm-btn" onClick={() => setEdit({ id: f.id, status: f.status === 'scheduled' || f.status === 'sent' ? 'done' : f.status, notes: f.notes || '', label: `${f.client_name} — day ${f.day_offset}` })}>Log outcome</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FiRepeat />} title="No follow-ups" text="Scheduled automatically when an engagement completes: day 7, 30, 60, 90 (referral) and 180" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.label || 'Follow-up'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}>
        {edit && (
          <div className="row g-3">
            <Field label="Status">
              <select className="form-select" value={edit.status} onChange={e => setEdit(p => ({ ...p, status: e.target.value }))}>
                <option value="done">Done</option>
                <option value="skipped">Skipped</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </Field>
            <Field label="Notes (conversation, referral received…)">
              <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={edit.notes} onChange={e => setEdit(p => ({ ...p, notes: e.target.value }))} />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Page ═══════════════════════════════════════════════════ */
export default function AdminEngagements() {
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'proposals');
  const [reloadKey, setReloadKey] = useState(0);
  const TABS = [
    { id: 'proposals',   label: 'Proposals' },
    { id: 'engagements', label: 'Engagements' },
    { id: 'invoices',    label: 'Invoices' },
    { id: 'followups',   label: 'Follow-ups' },
  ];

  return (
    <>
      <AppHeader breadcrumb="Engagements" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Client Engagements</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>Proposal → deposit → kickoff → delivery → QA → final invoice → follow-ups</p>
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

        {tab === 'proposals'   && <ProposalsTab openEditId={location.state?.proposalId} onSent={() => setReloadKey(k => k + 1)} />}
        {tab === 'engagements' && <EngagementsTab reloadKey={reloadKey} />}
        {tab === 'invoices'    && <InvoicesTab />}
        {tab === 'followups'   && <FollowupsTab />}
      </div>
    </>
  );
}

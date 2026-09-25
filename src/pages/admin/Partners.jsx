import React, { useState, useEffect, useCallback } from 'react';
import { FaBalanceScale, FaHandshake } from 'react-icons/fa';
import { FiStar, FiAlertTriangle, FiClipboard } from 'react-icons/fi';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { partnerAPI } from '../../services/api';
import { fmtDate, fmtDateTime } from '../../utils/services';

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
const errMsg = (err, fallback) => err.response?.data?.message || fallback;
const hint = { fontSize: 12, color: 'var(--text-dark-4)', marginBottom: 0 };
const filterSelect = { fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' };
const list = (v) => (v || []).join(', ');
const toList = (s) => s.split(',').map(x => x.trim()).filter(Boolean);

const PARTNER_STATUS = {
  prospect:        { badge: 'draft',    label: 'Prospect' },
  mou_negotiation: { badge: 'pending',  label: 'MOU negotiation' },
  active:          { badge: 'active',   label: 'Active' },
  paused:          { badge: 'paused',   label: 'Paused (watch)' },
  removed:         { badge: 'rejected', label: 'Removed' },
};
const REFERRAL_STATUS = {
  awaiting_consent:  { badge: 'pending',   label: 'Awaiting consent' },
  consented:         { badge: 'approved',  label: 'Consented' },
  client_declined:   { badge: 'declined',  label: 'Client declined' },
  introduced:        { badge: 'open',      label: 'Introduced' },
  partner_responded: { badge: 'in_progress', label: 'Partner responded' },
  completed:         { badge: 'completed', label: 'Completed' },
  closed:            { badge: 'closed',    label: 'Closed' },
};
const CONSENT_METHODS = {
  in_app: 'Client consents in the app', email: 'By email', written: 'Written / signed', verbal_recorded: 'Verbal (recorded)',
};
const DECISIONS = { keep: 'Keep', watch: 'Watch (pause referrals)', remove: 'Remove partner' };
const RISK = { none: 'None', low: 'Low', medium: 'Medium', high: 'High' };
const StatusBadge = ({ map, status }) => { const s = map[status] || { badge: status, label: status }; return <Badge status={s.badge} text={s.label} />; };

// Current quarter and the four before it, e.g. 2026-Q3
const quarters = () => {
  const d = new Date();
  let y = d.getFullYear(), q = Math.floor(d.getMonth() / 3) + 1;
  return Array.from({ length: 5 }, () => { const v = `${y}-Q${q}`; q -= 1; if (!q) { q = 4; y -= 1; } return v; });
};

/* ═══ Partner directory: profiles + MOUs ═════════════════════ */
const blankPartner = {
  name: '', partner_type: 'law_firm', is_priority: false, contact_name: '', email: '', phone: '', website: '',
  specialties: '', jurisdictions: '', languages: '', response_time_hours: '', pricing: '', referral_policy: '', conflicts: '',
  status: 'prospect', removed_reason: '', notes: '',
};
const blankMou = {
  referral_fee: '', confidentiality: '', client_ownership: '', service_boundaries: '', response_expectation_hours: '',
  document_url: '', status: 'draft', signed_on: '', expires_on: '',
};

function PartnersTab() {
  const [rows, setRows]       = useState([]);
  const [meta, setMeta]       = useState({});
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [mou, setMou]         = useState(null);   // { partner, history, form }
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    partnerAPI.list(status)
      .then(r => { setRows(r.data.data || []); setMeta(r.data.meta || {}); })
      .catch(() => showToast('Failed to load partners', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));
  const setM = (k, v) => setMou(m => ({ ...m, form: { ...m.form, [k]: v } }));

  const openEdit = (p) => setEdit(p ? {
    ...blankPartner, ...Object.fromEntries(Object.keys(blankPartner).map(k => [k, p[k] ?? blankPartner[k]])),
    id: p.id, specialties: list(p.specialties), jurisdictions: list(p.jurisdictions), languages: list(p.languages),
  } : { ...blankPartner });

  const save = async () => {
    if (!edit.name.trim()) return showToast('Firm name is required', 'error');
    setSaving(true);
    try {
      const { id, ...data } = edit;
      await (id ? partnerAPI.update(id, { ...data, specialties: toList(data.specialties), jurisdictions: toList(data.jurisdictions), languages: toList(data.languages) })
                : partnerAPI.create({ ...data, specialties: toList(data.specialties), jurisdictions: toList(data.jurisdictions), languages: toList(data.languages) }));
      showToast(id ? 'Partner updated' : 'Partner added');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const openMou = async (p) => {
    try {
      const d = (await partnerAPI.detail(p.id)).data.data;
      const draft = (d.mous || []).find(m => m.status === 'draft');
      const src = draft || null;
      setMou({
        partner: d, history: d.mous || [],
        form: src ? { ...blankMou, ...Object.fromEntries(Object.keys(blankMou).map(k => [k, src[k] ?? ''])), id: src.id }
                  : { ...blankMou, response_expectation_hours: p.response_time_hours || '' },
      });
    } catch (err) { showToast(errMsg(err, 'Could not load MOUs'), 'error'); }
  };

  const saveMou = async (signed) => {
    setSaving(true);
    try {
      const { id, ...data } = mou.form;
      const body = { ...data, status: signed ? 'signed' : data.status };
      await (id ? partnerAPI.updateMou(mou.partner.id, id, body) : partnerAPI.createMou(mou.partner.id, body));
      showToast(signed ? 'MOU signed — partner can now receive referrals' : 'MOU saved');
      setMou(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not save MOU'), 'error');
    } finally { setSaving(false); }
  };

  const endMou = async (m, st) => {
    try {
      await partnerAPI.updateMou(mou.partner.id, m.id, { status: st });
      showToast(`MOU ${st}`);
      setMou(null);
      load();
    } catch (err) { showToast(errMsg(err, 'Update failed'), 'error'); }
  };

  return (
    <>
      <div className="advisor-legal-cards mb-3" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#000' }}><FiStar style={{ verticalAlign: '-2px', color: 'var(--orange)' }} /> Priority partners: {meta.priority_active ?? 0} of {meta.priority_target ?? 6} active with a signed MOU</div>
            <p style={hint}>Six priority law firms / licensed professionals with Qatar & GCC business-setup experience. No client is referred to a partner without a signed, valid MOU.</p>
          </div>
          <span style={{ fontSize: 12, color: '#4A4949' }}>{meta.priority_total ?? 0} shortlisted as priority</span>
        </div>
      </div>

      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Partner directory</h5>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" style={filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(PARTNER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="thm-btn" onClick={() => openEdit(null)}>+ Add Partner</button>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Partner</th><th>Specialties / Jurisdictions</th><th>Languages</th><th>Response</th><th>MOU</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(p => (
                  <tr key={p.id}>
                    <td><div className="plan-table-content">
                      <h5>{p.is_priority && <FiStar style={{ color: 'var(--orange)', verticalAlign: '-2px' }} />} {p.name}</h5>
                      <p>{p.partner_type === 'law_firm' ? 'Law firm' : 'Licensed professional'}{p.contact_name ? ` · ${p.contact_name}` : ''}</p>
                    </div></td>
                    <td><div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>{list(p.specialties) || '—'}</h5><p>{list(p.jurisdictions) || '—'}</p></div></td>
                    <td>{list(p.languages) || '—'}</td>
                    <td>{p.response_time_hours ? `${p.response_time_hours}h` : '—'}</td>
                    <td>
                      {p.mou ? (
                        <div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>Signed {fmtDate(p.mou.signed_on)}</h5>
                          <p style={p.mou_expiring ? { color: 'var(--orange)' } : {}}>{p.mou.expires_on ? `${p.mou_expiring ? 'Expires soon: ' : 'Until '}${fmtDate(p.mou.expires_on)}` : 'No expiry'}</p></div>
                      ) : <span style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>No signed MOU</span>}
                    </td>
                    <td><StatusBadge map={PARTNER_STATUS} status={p.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ai-thm-btn outline" onClick={() => openEdit(p)}>Profile</button>
                        <button className="ai-thm-btn outline" onClick={() => openMou(p)}>MOU</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FaBalanceScale />} title="No partners yet" text="Add the law firms and licensed professionals you refer clients to" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Partner profile */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Partner profile' : 'Add Partner'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}>
        {edit && (
          <div className="row g-3">
            <Field label="Firm / professional name *" col={8}><input className="form-input" value={edit.name} onChange={e => set('name', e.target.value)} /></Field>
            <Field label="Type" col={4}>
              <select className="form-select" value={edit.partner_type} onChange={e => set('partner_type', e.target.value)}>
                <option value="law_firm">Law firm</option>
                <option value="licensed_professional">Licensed professional</option>
              </select>
            </Field>
            <Field label="Contact person" col={6}><input className="form-input" value={edit.contact_name} onChange={e => set('contact_name', e.target.value)} /></Field>
            <Field label="Email" col={6}><input type="email" className="form-input" value={edit.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Phone" col={6}><input className="form-input" value={edit.phone} onChange={e => set('phone', e.target.value)} /></Field>
            <Field label="Website" col={6}><input className="form-input" value={edit.website} onChange={e => set('website', e.target.value)} /></Field>
            <Field label="Specialties (comma separated)"><input className="form-input" placeholder="Company formation, Employment, Licensing" value={edit.specialties} onChange={e => set('specialties', e.target.value)} /></Field>
            <Field label="Jurisdictions" col={6}><input className="form-input" placeholder="Qatar, QFC, UAE" value={edit.jurisdictions} onChange={e => set('jurisdictions', e.target.value)} /></Field>
            <Field label="Languages" col={6}><input className="form-input" placeholder="English, Arabic" value={edit.languages} onChange={e => set('languages', e.target.value)} /></Field>
            <Field label="Typical response time (hours)" col={6}><input type="number" min="1" className="form-input" value={edit.response_time_hours} onChange={e => set('response_time_hours', e.target.value)} /></Field>
            <Field label="Pricing" col={6}><input className="form-input" placeholder="e.g. QAR 1,200/hr or fixed fees" value={edit.pricing} onChange={e => set('pricing', e.target.value)} /></Field>
            <Field label="Referral policy"><textarea className="form-input" rows={2} value={edit.referral_policy} onChange={e => set('referral_policy', e.target.value)} /></Field>
            <Field label="Conflicts (clients / sectors they cannot act for)"><textarea className="form-input" rows={2} value={edit.conflicts} onChange={e => set('conflicts', e.target.value)} /></Field>
            <Field label="Status" col={6}>
              <select className="form-select" value={edit.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(PARTNER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </Field>
            <Field label="Priority partner" col={6}>
              <select className="form-select" value={edit.is_priority ? '1' : '0'} onChange={e => set('is_priority', e.target.value === '1')}>
                <option value="0">No</option>
                <option value="1">Yes — one of the six priority partners</option>
              </select>
            </Field>
            {edit.status === 'removed' && (
              <Field label="Reason for removal *"><input className="form-input" value={edit.removed_reason} onChange={e => set('removed_reason', e.target.value)} /></Field>
            )}
            <Field label="Internal notes"><textarea className="form-input" rows={2} value={edit.notes} onChange={e => set('notes', e.target.value)} /></Field>
            {edit.status === 'active' && <p style={hint}>A partner can only be active once an MOU is signed.</p>}
          </div>
        )}
      </Modal>

      {/* MOU terms */}
      <Modal open={!!mou} onClose={() => setMou(null)} title={mou ? `MOU — ${mou.partner.name}` : 'MOU'}
        footer={mou && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="ai-thm-btn outline" onClick={() => setMou(null)}>Cancel</button>
            <button className="ai-thm-btn outline" disabled={saving} onClick={() => saveMou(false)}>Save draft</button>
            <button className="ai-thm-btn" disabled={saving} onClick={() => saveMou(true)}>{saving ? 'Saving…' : 'Mark as signed'}</button>
          </div>
        )}>
        {mou && (
          <>
            {mou.history.filter(m => m.status !== 'draft').length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#000', marginBottom: 4 }}>MOU history</div>
                {mou.history.filter(m => m.status !== 'draft').map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, color: '#000' }}>
                      Signed {fmtDate(m.signed_on)}{m.expires_on ? ` · until ${fmtDate(m.expires_on)}` : ''} · fee: {m.referral_fee} · response {m.response_expectation_hours}h
                      {m.document_url && <> · <a href={m.document_url} target="_blank" rel="noopener noreferrer">document</a></>}
                    </span>
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Badge status={m.status === 'signed' ? 'active' : 'expired'} text={m.status} />
                      {m.status === 'signed' && <button className="ai-remove-btn" onClick={() => endMou(m, 'terminated')}>Terminate</button>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ ...hint, marginBottom: 10 }}>Agree these terms in writing before any client is sent. Signing requires every term below.</p>
            <div className="row g-3">
              <Field label="Referral fees *"><input className="form-input" placeholder="e.g. 10% of first-matter fees, paid within 30 days" value={mou.form.referral_fee} onChange={e => setM('referral_fee', e.target.value)} /></Field>
              <Field label="Confidentiality *"><textarea className="form-input" rows={2} value={mou.form.confidentiality} onChange={e => setM('confidentiality', e.target.value)} /></Field>
              <Field label="Client ownership *"><textarea className="form-input" rows={2} placeholder="Who owns the client relationship and follow-on work" value={mou.form.client_ownership} onChange={e => setM('client_ownership', e.target.value)} /></Field>
              <Field label="Service boundaries *"><textarea className="form-input" rows={2} placeholder="What the partner does and what stays with us" value={mou.form.service_boundaries} onChange={e => setM('service_boundaries', e.target.value)} /></Field>
              <Field label="Response expectation (hours) *" col={6}><input type="number" min="1" className="form-input" value={mou.form.response_expectation_hours} onChange={e => setM('response_expectation_hours', e.target.value)} /></Field>
              <Field label="Signed MOU link" col={6}><input className="form-input" placeholder="https://…" value={mou.form.document_url} onChange={e => setM('document_url', e.target.value)} /></Field>
              <Field label="Signed on" col={6}><input type="date" className="form-input" value={mou.form.signed_on || ''} onChange={e => setM('signed_on', e.target.value)} /></Field>
              <Field label="Expires on" col={6}><input type="date" className="form-input" value={mou.form.expires_on || ''} onChange={e => setM('expires_on', e.target.value)} /></Field>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

/* ═══ Referral handoffs: consent + documented purpose ════════ */
const blankReferral = { partner_id: '', client_email: '', purpose: '', scope_note: '', consent_method: 'in_app', consent_confirmed: false, consent_note: '' };

function ReferralsTab() {
  const [rows, setRows]         = useState([]);
  const [partners, setPartners] = useState([]);
  const [status, setStatus]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(null);
  const [close, setClose]       = useState(null);   // completing a referral
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    partnerAPI.referrals({ status })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load referrals', 'error'))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { partnerAPI.list('active').then(r => setPartners((r.data.data || []).filter(p => p.can_receive_referrals))).catch(() => {}); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const offApp = form && form.consent_method !== 'in_app';

  const submit = async () => {
    if (!form.partner_id) return showToast('Choose a partner', 'error');
    if (!form.client_email.trim()) return showToast('Client email is required', 'error');
    if (!form.purpose.trim()) return showToast('Document the purpose of the introduction', 'error');
    if (offApp && (!form.consent_confirmed || !form.consent_note.trim())) return showToast('Confirm the client consented and note how', 'error');
    setSaving(true);
    try {
      await partnerAPI.createReferral(form);
      showToast(offApp ? 'Referral recorded with consent' : 'Consent request sent to the client');
      setForm(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not create referral'), 'error');
    } finally { setSaving(false); }
  };

  const move = async (r, st) => {
    try {
      await partnerAPI.updateReferral(r.id, { status: st });
      showToast(REFERRAL_STATUS[st].label);
      load();
    } catch (err) { showToast(errMsg(err, 'Update failed'), 'error'); }
  };

  const complete = async () => {
    setSaving(true);
    try {
      const { id, ...data } = close;
      await partnerAPI.updateReferral(id, data);
      showToast('Referral updated');
      setClose(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Update failed'), 'error');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Referral handoffs</h5>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" style={filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(REFERRAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button className="thm-btn" onClick={() => setForm({ ...blankReferral })}>+ New Referral</button>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Client</th><th>Partner</th><th>Purpose</th><th>Consent</th><th>Response</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(r => (
                  <tr key={r.id}>
                    <td><div className="plan-table-content"><h5>{r.client_name}</h5><p>{r.client_email}</p></div></td>
                    <td>{r.partner_name}</td>
                    <td><div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>{r.purpose}</h5><p>{r.offering_name || fmtDate(r.created_at)}</p></div></td>
                    <td>{r.consented_at
                      ? <div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>{CONSENT_METHODS[r.consent_method]}</h5><p>{fmtDateTime(r.consented_at)}{r.consent_note ? ` · ${r.consent_note}` : ''}</p></div>
                      : <span style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{r.status === 'client_declined' ? 'Declined' : 'Not yet'}</span>}</td>
                    <td>{r.response_hours != null ? `${r.response_hours}h` : '—'}</td>
                    <td><StatusBadge map={REFERRAL_STATUS} status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {r.status === 'consented' && <button className="btn btn-success btn-sm" onClick={() => move(r, 'introduced')}>Mark introduced</button>}
                        {r.status === 'introduced' && <button className="btn btn-success btn-sm" onClick={() => move(r, 'partner_responded')}>Partner responded</button>}
                        {['introduced', 'partner_responded', 'completed'].includes(r.status) && (
                          <button className="ai-thm-btn outline" onClick={() => setClose({ id: r.id, status: r.status === 'completed' ? '' : 'completed', outcome: r.outcome || '', client_rating: r.client_rating || '', fee_due: r.fee_due || '', fee_status: r.fee_status })}>
                            {r.status === 'completed' ? 'Outcome' : 'Complete'}
                          </button>
                        )}
                        {['awaiting_consent', 'consented', 'introduced', 'partner_responded'].includes(r.status) && <button className="btn btn-danger btn-sm" onClick={() => move(r, 'closed')}>Close</button>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FaHandshake />} title="No referrals yet" text="Every introduction to a partner is recorded here with the client's consent and its purpose" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Referral handoff form */}
      <Modal open={!!form} onClose={() => setForm(null)} title="Referral handoff"
        footer={<Footer onCancel={() => setForm(null)} onSave={submit} saving={saving} label={offApp ? 'Record referral' : 'Request consent'} />}>
        {form && (
          <div className="row g-3">
            <Field label="Partner *">
              <select className="form-select" value={form.partner_id} onChange={e => set('partner_id', e.target.value)}>
                <option value="">Select a partner with a signed MOU</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name} — {list(p.specialties)}</option>)}
              </select>
              {!partners.length && <p style={hint}>No partner can receive referrals yet — sign an MOU first.</p>}
            </Field>
            <Field label="Client account email *"><input type="email" className="form-input" value={form.client_email} onChange={e => set('client_email', e.target.value)} /></Field>
            <Field label="Purpose of the introduction *"><textarea className="form-input" rows={2} placeholder="e.g. Commercial registration and MOCI filings for the Qatar entity" value={form.purpose} onChange={e => set('purpose', e.target.value)} /></Field>
            <Field label="What will be shared with the partner"><input className="form-input" placeholder="e.g. Name, email, company overview" value={form.scope_note} onChange={e => set('scope_note', e.target.value)} /></Field>
            <Field label="Client consent">
              <select className="form-select" value={form.consent_method} onChange={e => set('consent_method', e.target.value)}>
                {Object.entries(CONSENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            {offApp ? (
              <>
                <Field label="How and when the client consented *"><input className="form-input" placeholder="e.g. Email from the client, 12 Sep 2026" value={form.consent_note} onChange={e => set('consent_note', e.target.value)} /></Field>
                <div className="col-12">
                  <label style={{ display: 'flex', gap: 8, fontSize: 13, color: '#000', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.consent_confirmed} onChange={e => set('consent_confirmed', e.target.checked)} />
                    I confirm the client consented to this introduction and to sharing the details above.
                  </label>
                </div>
              </>
            ) : <p style={hint}>The client is asked in the app and by email. The introduction can only be marked as made once they consent.</p>}
          </div>
        )}
      </Modal>

      {/* Outcome */}
      <Modal open={!!close} onClose={() => setClose(null)} title="Referral outcome"
        footer={<Footer onCancel={() => setClose(null)} onSave={complete} saving={saving} />}>
        {close && (
          <div className="row g-3">
            <Field label="Outcome"><textarea className="form-input" rows={2} value={close.outcome} onChange={e => setClose(c => ({ ...c, outcome: e.target.value }))} /></Field>
            <Field label="Client rating of the partner" col={4}>
              <select className="form-select" value={close.client_rating} onChange={e => setClose(c => ({ ...c, client_rating: e.target.value }))}>
                <option value="">Not rated</option>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}
              </select>
            </Field>
            <Field label="Referral fee due" col={4}><input type="number" min="0" className="form-input" value={close.fee_due} onChange={e => setClose(c => ({ ...c, fee_due: e.target.value }))} /></Field>
            <Field label="Fee status" col={4}>
              <select className="form-select" value={close.fee_status} onChange={e => setClose(c => ({ ...c, fee_status: e.target.value }))}>
                <option value="none">No fee</option>
                <option value="due">Due</option>
                <option value="received">Received</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Quarterly partner review ═══════════════════════════════ */
function ReviewsTab() {
  const Q = quarters();
  const [quarter, setQuarter] = useState(Q[0]);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    partnerAPI.reviews(quarter)
      .then(r => setRows(r.data.data?.data || []))
      .catch(() => showToast('Failed to load reviews', 'error'))
      .finally(() => setLoading(false));
  }, [quarter]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setEdit(e => ({ ...e, [k]: v }));
  const open = (row) => {
    const v = row.review || {};
    setEdit({ partner_id: row.partner_id, partner_name: row.partner_name, metrics: row.metrics, quarter,
      responsiveness: v.responsiveness || '', quality: v.quality || '', client_feedback: v.client_feedback || '',
      reputational_risk: v.reputational_risk || 'none', decision: v.decision || 'keep', notes: v.notes || '' });
  };

  const save = async () => {
    if (edit.decision === 'remove' && !edit.notes.trim()) return showToast('Note the reason for removing this partner', 'error');
    setSaving(true);
    try {
      const { partner_id, partner_name, metrics, ...data } = edit;
      await partnerAPI.saveReview(partner_id, data);
      showToast(edit.decision === 'remove' ? 'Partner removed' : 'Review saved');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not save review'), 'error');
    } finally { setSaving(false); }
  };

  const reviewed = rows.filter(r => r.review).length;
  const Score = ({ k, label }) => (
    <Field label={label} col={4}>
      <select className="form-select" value={edit[k]} onChange={e => set(k, e.target.value)}>
        <option value="">—</option>
        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5</option>)}
      </select>
    </Field>
  );

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Quarterly review — {reviewed} of {rows.length} reviewed</h5>
          <select className="form-select" style={filterSelect} value={quarter} onChange={e => setQuarter(e.target.value)}>
            {Q.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Partner</th><th>Referrals</th><th>Avg response</th><th>Client rating</th><th>Fees received</th><th>Review</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(r => {
                  const m = r.metrics || {};
                  return (
                    <tr key={r.partner_id}>
                      <td><div className="plan-table-content"><h5>{r.is_priority && <FiStar style={{ color: 'var(--orange)', verticalAlign: '-2px' }} />} {r.partner_name}</h5><p><StatusBadge map={PARTNER_STATUS} status={r.status} /></p></div></td>
                      <td>{m.referrals} <span style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>({m.completed} completed)</span></td>
                      <td>{m.avg_response_hours != null ? `${m.avg_response_hours}h` : '—'}
                        {m.late_responses > 0 && <div style={{ fontSize: 11, color: 'var(--orange)' }}><FiAlertTriangle style={{ verticalAlign: '-2px' }} /> {m.late_responses} late</div>}</td>
                      <td>{m.avg_client_rating != null ? `${m.avg_client_rating} / 5` : '—'}</td>
                      <td>{Number(m.fees_received || 0).toLocaleString()}</td>
                      <td>{r.review
                        ? <div className="plan-table-content"><h5 style={{ fontWeight: 500 }}>{DECISIONS[r.review.decision]} · risk {RISK[r.review.reputational_risk].toLowerCase()}</h5><p>{r.review.reviewed_by_name || ''} · {fmtDate(r.review.created_at)}</p></div>
                        : <Badge status="pending" text="Due" />}</td>
                      <td><button className="ai-thm-btn outline" onClick={() => open(r)}>{r.review ? 'Edit' : 'Review'}</button></td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={7}><EmptyState icon={<FiClipboard />} title="No partners to review" text="Active and paused partners are reviewed every quarter" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.partner_name} — ${edit.quarter} review` : 'Review'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} label={edit?.decision === 'remove' ? 'Remove partner' : 'Save review'} />}>
        {edit && (
          <div className="row g-3">
            <div className="col-12">
              <p style={{ ...hint, color: '#4A4949' }}>
                This quarter: {edit.metrics?.referrals ?? 0} referrals, {edit.metrics?.completed ?? 0} completed,
                avg response {edit.metrics?.avg_response_hours ?? '—'}h ({edit.metrics?.late_responses ?? 0} late), client rating {edit.metrics?.avg_client_rating ?? '—'}.
              </p>
            </div>
            <Score k="responsiveness" label="Responsiveness" />
            <Score k="quality" label="Quality of work" />
            <Score k="client_feedback" label="Client feedback" />
            <Field label="Reputational risk" col={6}>
              <select className="form-select" value={edit.reputational_risk} onChange={e => set('reputational_risk', e.target.value)}>
                {Object.entries(RISK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Decision" col={6}>
              <select className="form-select" value={edit.decision} onChange={e => set('decision', e.target.value)}>
                {Object.entries(DECISIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label={edit.decision === 'remove' ? 'Reason for removal *' : 'Notes'}><textarea className="form-input" rows={3} value={edit.notes} onChange={e => set('notes', e.target.value)} /></Field>
            {edit.decision === 'remove' && <p style={{ ...hint, color: 'var(--red, #DC2626)' }}>The partner is removed and can no longer receive referrals.</p>}
            {edit.decision === 'watch' && <p style={hint}>An active partner is paused — no new referrals until you set them active again.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Page ═══════════════════════════════════════════════════ */
const TABS = [
  { id: 'partners',  label: 'Partners & MOUs' },
  { id: 'referrals', label: 'Referral Handoffs' },
  { id: 'reviews',   label: 'Quarterly Review' },
];

export default function AdminPartners() {
  const [tab, setTab] = useState('partners');

  return (
    <>
      <AppHeader breadcrumb="Partners" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Law Firm Partners</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>Partner profiles, written MOUs, consented referrals and quarterly performance reviews</p>
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

        {tab === 'partners'  && <PartnersTab />}
        {tab === 'referrals' && <ReferralsTab />}
        {tab === 'reviews'   && <ReviewsTab />}
      </div>
    </>
  );
}

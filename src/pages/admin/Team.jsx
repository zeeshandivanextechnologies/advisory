import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { teamAPI } from '../../services/api';
import { money } from '../../utils/services';
import { STAFF_ROLES, staffRoleLabel, COST_MODELS, ADMIN_SCOPES } from '../../utils/team';
import { FiUsers, FiKey } from 'react-icons/fi';

const Field = ({ label, children, col = 12 }) => (
  <div className={`col-md-${col} form-group`}>
    <label className="form-label">{label}</label>
    {children}
  </div>
);
const errMsg = (err, fb) => err.response?.data?.message || fb;
const rateText = (s) => {
  if (s.cost_model === 'none') return '—';
  if (s.cost_model === 'referral') return 'Referral / MOU';
  const unit = { per_project: '/ project', monthly: '/ month', hourly: '/ hour' }[s.cost_model] || '';
  if (s.rate == null) return COST_MODELS.find(c => c.value === s.cost_model)?.label;
  return `${money(s.rate, s.currency)}${s.rate_max ? ` – ${money(s.rate_max, s.currency)}` : ''} ${unit}`;
};

/* ═══ Team directory ═════════════════════════════════════════ */
function DirectoryTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    teamAPI.getStaff()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load team', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));
  const openNew = (role = 'advisor') => setEdit({
    full_name: '', email: '', staff_role: role, cost_model: role === 'financial_specialist' ? 'per_project' : role === 'legal_professional' ? 'referral' : 'none',
    rate: role === 'financial_specialist' ? 500 : '', rate_max: role === 'financial_specialist' ? 1500 : '', currency: 'USD',
    responsibilities: STAFF_ROLES.find(r => r.value === role)?.responsibility || '', notes: '', login_email: '', is_active: true,
  });
  const openEdit = (s) => setEdit({
    id: s.id, full_name: s.full_name, email: s.email || '', staff_role: s.staff_role, cost_model: s.cost_model,
    rate: s.rate ?? '', rate_max: s.rate_max ?? '', currency: s.currency, responsibilities: s.responsibilities || '',
    notes: s.notes || '', login_email: s.login_email || '', is_active: s.is_active,
  });

  const save = async () => {
    if (!edit.full_name.trim()) return showToast('Name is required', 'error');
    setSaving(true);
    try {
      const { id, ...data } = edit;
      await teamAPI.saveStaff(id, data);
      showToast(id ? 'Team member updated' : 'Team member added');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const role = edit && STAFF_ROLES.find(r => r.value === edit.staff_role);

  return (
    <>
      <div className="row mb-3">
        {STAFF_ROLES.map(r => (
          <div key={r.value} className="col-lg-4 col-md-6 mb-3">
            <div className="advisor-legal-cards h-100" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 15, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 4 }}>{r.label}</h3>
              <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 4, flex: 1 }}>{r.responsibility}</p>
              <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 2 }}><b style={{ color: '#000' }}>When:</b> {r.whenUsed}</p>
              <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 8 }}><b style={{ color: '#000' }}>Cost:</b> {r.cost}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{rows.filter(s => s.staff_role === r.value && s.is_active).length} active</span>
                <button className="ai-thm-btn outline" onClick={() => openNew(r.value)}>+ Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Team Directory</h5>
          <button className="thm-btn" onClick={() => openNew()}>+ New Team Member</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Name</th><th>Role</th><th>Cost</th><th>Login</th><th>Active work</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(s => (
                  <tr key={s.id}>
                    <td><div className="plan-table-content"><h5>{s.full_name}</h5><p>{s.email || '—'}</p></div></td>
                    <td>{staffRoleLabel(s.staff_role)}</td>
                    <td>{rateText(s)}</td>
                    <td>{s.login_email ? <span style={{ fontSize: 12 }}>{s.login_email}</span> : <span style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>No login</span>}</td>
                    <td>{s.active_engagements} engagement{s.active_engagements === 1 ? '' : 's'}</td>
                    <td><Badge status={s.is_active ? 'active' : 'draft'} text={s.is_active ? 'Active' : 'Inactive'} /></td>
                    <td><button className="thm-btn" onClick={() => openEdit(s)}>Edit</button></td>
                  </tr>
                )) : (
                  <tr><td colSpan={7}><EmptyState icon={<FiUsers />} title="No team members yet" text="Add the founder first — founders join every engagement automatically" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit — ${edit.full_name}` : 'New Team Member'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setEdit(null)}>Cancel</button>
            <button className="ai-thm-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        }>
        {edit && (
          <div className="row g-3">
            <Field label="Name *" col={6}><input className="form-input" value={edit.full_name} onChange={e => set('full_name', e.target.value)} /></Field>
            <Field label="Email" col={6}><input type="email" className="form-input" value={edit.email} onChange={e => set('email', e.target.value)} /></Field>
            <Field label="Role" col={6}>
              <select className="form-select" value={edit.staff_role} onChange={e => set('staff_role', e.target.value)}>
                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Cost model" col={6}>
              <select className="form-select" value={edit.cost_model} onChange={e => set('cost_model', e.target.value)}>
                {COST_MODELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            {['per_project', 'monthly', 'hourly'].includes(edit.cost_model) && (
              <>
                <Field label="Rate" col={4}><input type="number" className="form-input" value={edit.rate} onChange={e => set('rate', e.target.value)} /></Field>
                <Field label="Up to (optional)" col={4}><input type="number" className="form-input" value={edit.rate_max} onChange={e => set('rate_max', e.target.value)} /></Field>
                <Field label="Currency" col={4}><input className="form-input" value={edit.currency} onChange={e => set('currency', e.target.value.toUpperCase())} /></Field>
              </>
            )}
            {role && <div className="col-12" style={{ fontSize: 12, color: '#4A4949' }}><b style={{ color: '#000' }}>When used:</b> {role.whenUsed} · <b style={{ color: '#000' }}>Cost / control:</b> {role.cost}</div>}
            <Field label="Responsibilities">
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={edit.responsibilities} onChange={e => set('responsibilities', e.target.value)} />
            </Field>
            <Field label="App login (email of a registered account, optional)">
              <input type="email" className="form-input" placeholder="Links this person to their account" value={edit.login_email} onChange={e => set('login_email', e.target.value)} />
            </Field>
            <Field label="Notes"><input className="form-input" value={edit.notes} onChange={e => set('notes', e.target.value)} /></Field>
            {edit.id && (
              <Field label="Status" col={6}>
                <select className="form-select" value={edit.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Team logins (limited admin access) ═════════════════════ */
function LoginsTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant]     = useState({ email: '', scope: 'virtual_assistant' });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    teamAPI.getLogins()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load logins', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const give = async () => {
    if (!grant.email.trim()) return showToast('Enter the account email', 'error');
    setSaving(true);
    try {
      await teamAPI.grantLogin(grant.email.trim(), grant.scope);
      showToast('Access granted — they need to sign out and in again');
      setGrant({ email: '', scope: grant.scope });
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not grant access'), 'error');
    } finally { setSaving(false); }
  };

  const revoke = async (u) => {
    if (!window.confirm(`Remove admin access for ${u.email}?`)) return;
    try { await teamAPI.revokeLogin(u.id); showToast('Access removed'); load(); }
    catch (err) { showToast(errMsg(err, 'Could not remove access'), 'error'); }
  };

  const scopeLabel = (s) => (s === 'full' ? 'Full admin' : ADMIN_SCOPES.find(x => x.value === s)?.label.split(' — ')[0] || s);

  return (
    <>
      <div className="advisor-legal-cards mb-3">
        <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 6, color: '#000' }}>Give a team member limited access</h3>
        <p style={{ fontSize: 12, color: '#4A4949' }}>The person registers a normal account first. Limited logins only see their part of the admin panel — enforced on the server.</p>
        <div className="row g-2">
          <div className="col-md-5"><input type="email" className="form-input" placeholder="Account email" value={grant.email} onChange={e => setGrant(g => ({ ...g, email: e.target.value }))} /></div>
          <div className="col-md-5">
            <select className="form-select" value={grant.scope} onChange={e => setGrant(g => ({ ...g, scope: e.target.value }))}>
              {ADMIN_SCOPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="col-md-2"><button className="ai-thm-btn w-100" disabled={saving} onClick={give}>{saving ? 'Saving…' : 'Grant'}</button></div>
        </div>
      </div>

      <div className="ai-table-section">
        <div className="table-header"><h5 className="fz-14 text-black fw-600 mb-0">Admin Logins</h5></div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Name</th><th>Access</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(u => (
                  <tr key={u.id}>
                    <td><div className="plan-table-content"><h5>{u.full_name}{u.is_me ? ' (you)' : ''}</h5><p>{u.email}</p></div></td>
                    <td>{scopeLabel(u.admin_scope)}</td>
                    <td><Badge status={u.is_active ? 'active' : 'suspended'} /></td>
                    <td>{u.admin_scope !== 'full' ? <button className="ai-remove-btn" onClick={() => revoke(u)}>Remove access</button> : '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><EmptyState icon={<FiKey />} title="No admin logins" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminTeam() {
  const [tab, setTab] = useState('directory');
  const TABS = [{ id: 'directory', label: 'Team Directory' }, { id: 'logins', label: 'Team Logins' }];
  return (
    <>
      <AppHeader breadcrumb="Team" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Staffing & Delivery Model</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>Who does what, when they are used, and what they cost</p>
          </div>
        </div>
        <div className="case-search-box mb-3">
          <div className="filter-tabs">
            <div className="nav nav-pills gap-2">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`nav-link filter-nav-btn ${tab === t.id ? 'active' : ''}`} style={{ border: '1px solid var(--border-light)' }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>
        {tab === 'directory' ? <DirectoryTab /> : <LoginsTab />}
      </div>
    </>
  );
}

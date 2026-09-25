import { FaHandshake } from 'react-icons/fa';
import { FiCalendar, FiFileText } from 'react-icons/fi';
import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, ConfirmModal, showToast } from '../../components/common/index';
import { communityAPI } from '../../services/api';
import {
  EVENT_TYPES, eventTypeLabel, AUDIENCE_LABELS, fmtDate, fmtDateTime, toLocalInput, fromLocalInput,
} from '../../utils/services';

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

/* ═══ Memberships ════════════════════════════════════════════ */
function MembershipsTab() {
  const [rows, setRows]       = useState([]);
  const [tier, setTier]       = useState('');
  const [loading, setLoading] = useState(true);
  const [invite, setInvite]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    communityAPI.adminGetMemberships({ tier })
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load memberships', 'error'))
      .finally(() => setLoading(false));
  }, [tier]);

  useEffect(() => { load(); }, [load]);

  const sendInvite = async () => {
    if (!invite.client_email.trim()) return showToast('Email is required', 'error');
    setSaving(true);
    try {
      await communityAPI.adminSaveMembership(null, { ...invite, expires_at: invite.expires_at ? new Date(invite.expires_at).toISOString() : '' });
      showToast(invite.status === 'active' ? 'Membership activated' : 'Invitation sent');
      setInvite(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Could not save membership'), 'error');
    } finally { setSaving(false); }
  };

  const setStatus = async (m, status) => {
    try {
      await communityAPI.adminSaveMembership(m.id, { status });
      showToast('Membership updated');
      load();
    } catch (err) { showToast(errMsg(err, 'Update failed'), 'error'); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Integra Innovators & Gold</h5>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }} value={tier} onChange={e => setTier(e.target.value)}>
              <option value="">All tiers</option>
              <option value="innovators">Innovators</option>
              <option value="gold">Gold</option>
            </select>
            <button className="thm-btn" onClick={() => setInvite({ client_email: '', tier: 'innovators', status: 'invited', expires_at: '' })}>+ Invite Member</button>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Member</th><th>Tier</th><th>Since</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(m => (
                  <tr key={m.id}>
                    <td><div className="plan-table-content"><h5>{m.client_name}</h5><p>{m.client_email}</p></div></td>
                    <td>{m.tier_name}</td>
                    <td>{fmtDate(m.started_at)}</td>
                    <td>{m.expires_at ? fmtDate(m.expires_at) : 'No expiry'}</td>
                    <td><Badge status={m.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {m.status !== 'active' && <button className="btn btn-success btn-sm" onClick={() => setStatus(m, 'active')}>Activate</button>}
                        {m.status !== 'cancelled' && <button className="btn btn-danger btn-sm" onClick={() => setStatus(m, 'cancelled')}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FaHandshake />} title="No members yet" text="Membership is invite-only — invite founders and partners" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!invite} onClose={() => setInvite(null)} title="Invite Member"
        footer={<Footer onCancel={() => setInvite(null)} onSave={sendInvite} saving={saving} label={invite?.status === 'active' ? 'Activate' : 'Send Invite'} />}>
        {invite && (
          <div className="row g-3">
            <Field label="Account email *"><input type="email" className="form-input" value={invite.client_email} onChange={e => setInvite(p => ({ ...p, client_email: e.target.value }))} /></Field>
            <Field label="Tier" col={6}>
              <select className="form-select" value={invite.tier} onChange={e => setInvite(p => ({ ...p, tier: e.target.value }))}>
                <option value="innovators">Integra Innovators</option>
                <option value="gold">Integra Gold</option>
              </select>
            </Field>
            <Field label="Start as" col={6}>
              <select className="form-select" value={invite.status} onChange={e => setInvite(p => ({ ...p, status: e.target.value }))}>
                <option value="invited">Invitation (member accepts)</option>
                <option value="active">Active now</option>
              </select>
            </Field>
            <Field label="Expires (optional)"><input type="date" className="form-input" value={invite.expires_at} onChange={e => setInvite(p => ({ ...p, expires_at: e.target.value }))} /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ═══ Events ═════════════════════════════════════════════════ */
function EventsTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    communityAPI.adminGetEvents()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load events', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));
  const openEdit = (e) => setEdit(e ? {
    id: e.id, title: e.title, description: e.description || '', event_type: e.event_type, location: e.location || '',
    starts_at: toLocalInput(e.starts_at), ends_at: toLocalInput(e.ends_at), capacity: e.capacity ?? '',
    audience: e.audience, is_published: e.is_published,
  } : { title: '', description: '', event_type: 'integra_night', location: '', starts_at: '', ends_at: '', capacity: '', audience: 'all', is_published: true });

  const save = async () => {
    if (!edit.title.trim() || !edit.starts_at) return showToast('Title and start time are required', 'error');
    setSaving(true);
    try {
      const { id, ...data } = edit;
      await communityAPI.adminSaveEvent(id, { ...data, starts_at: fromLocalInput(data.starts_at), ends_at: fromLocalInput(data.ends_at) });
      showToast(id ? 'Event updated' : 'Event created');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await communityAPI.adminDeleteEvent(delId);
      showToast('Event deleted');
      load();
    } catch (err) { showToast(errMsg(err, 'Delete failed'), 'error'); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Integra Nights & Events</h5>
          <button className="thm-btn" onClick={() => openEdit(null)}>+ New Event</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Event</th><th>When</th><th>Audience</th><th>RSVPs</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(e => (
                  <tr key={e.id}>
                    <td><div className="plan-table-content"><h5>{e.title}</h5><p>{eventTypeLabel(e.event_type)}{e.location ? ` · ${e.location}` : ''}</p></div></td>
                    <td>{fmtDateTime(e.starts_at)}</td>
                    <td>{AUDIENCE_LABELS[e.audience]}</td>
                    <td>{e.going_count}{e.capacity ? ` / ${e.capacity}` : ''}</td>
                    <td><Badge status={e.is_published ? 'active' : 'draft'} text={e.is_published ? 'Published' : 'Draft'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="thm-btn" onClick={() => openEdit(e)}>Edit</button>
                        <button className="ai-remove-btn" onClick={() => setDelId(e.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FiCalendar />} title="No events" text="Create an Integra Night, webinar or product demo" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit Event' : 'New Event'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} />}>
        {edit && (
          <div className="row g-3">
            <Field label="Title *" col={8}><input className="form-input" value={edit.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Type" col={4}>
              <select className="form-select" value={edit.event_type} onChange={e => set('event_type', e.target.value)}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Starts *" col={6}><input type="datetime-local" className="form-input" value={edit.starts_at} onChange={e => set('starts_at', e.target.value)} /></Field>
            <Field label="Ends" col={6}><input type="datetime-local" className="form-input" value={edit.ends_at} onChange={e => set('ends_at', e.target.value)} /></Field>
            <Field label="Location" col={8}><input className="form-input" placeholder="Venue or online link" value={edit.location} onChange={e => set('location', e.target.value)} /></Field>
            <Field label="Capacity" col={4}><input type="number" className="form-input" placeholder="Unlimited" value={edit.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
            <Field label="Who can see it" col={6}>
              <select className="form-select" value={edit.audience} onChange={e => set('audience', e.target.value)}>
                <option value="all">Everyone</option>
                <option value="members">Members only</option>
                <option value="gold">Gold members only</option>
              </select>
            </Field>
            <Field label="Status" col={6}>
              <select className="form-select" value={edit.is_published ? '1' : '0'} onChange={e => set('is_published', e.target.value === '1')}>
                <option value="1">Published</option>
                <option value="0">Draft</option>
              </select>
            </Field>
            <Field label="Description">
              <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={edit.description} onChange={e => set('description', e.target.value)} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={remove} title="Delete event" message="Delete this event and its RSVPs?" confirmLabel="Delete" danger />
    </>
  );
}

/* ═══ Market briefs ══════════════════════════════════════════ */
function BriefsTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [delId, setDelId]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    communityAPI.getBriefs()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load briefs', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setEdit(p => ({ ...p, [k]: v }));
  const openEdit = (b) => setEdit(b ? {
    id: b.id, title: b.title, period: String(b.period).slice(0, 7), summary: b.summary || '', body: b.body || '',
    audience: b.audience, is_published: b.is_published,
  } : { title: '', period: new Date().toISOString().slice(0, 7), summary: '', body: '', audience: 'all', is_published: false });

  const save = async () => {
    if (!edit.title.trim()) return showToast('Title is required', 'error');
    setSaving(true);
    try {
      const { id, ...data } = edit;
      await communityAPI.adminSaveBrief(id, { ...data, period: data.period ? `${data.period}-01` : '' });
      showToast(data.is_published ? 'Brief published' : 'Draft saved');
      setEdit(null);
      load();
    } catch (err) {
      showToast(errMsg(err, 'Save failed'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    try {
      await communityAPI.adminDeleteBrief(delId);
      showToast('Brief deleted');
      load();
    } catch (err) { showToast(errMsg(err, 'Delete failed'), 'error'); }
  };

  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Monthly Market Briefs</h5>
          <button className="thm-btn" onClick={() => openEdit(null)}>+ New Brief</button>
        </div>
        {loading ? <Spinner /> : (
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Brief</th><th>Month</th><th>Audience</th><th>Published</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.length ? rows.map(b => (
                  <tr key={b.id}>
                    <td><div className="plan-table-content"><h5>{b.title}</h5><p>{b.summary}</p></div></td>
                    <td>{new Date(b.period).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</td>
                    <td>{AUDIENCE_LABELS[b.audience]}</td>
                    <td>{fmtDate(b.published_at)}</td>
                    <td><Badge status={b.is_published ? 'active' : 'draft'} text={b.is_published ? 'Published' : 'Draft'} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="thm-btn" onClick={() => openEdit(b)}>Edit</button>
                        <button className="ai-remove-btn" onClick={() => setDelId(b.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FiFileText />} title="No briefs" text="Write the first Monthly Market Brief" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit Brief' : 'New Market Brief'}
        footer={<Footer onCancel={() => setEdit(null)} onSave={save} saving={saving} label={edit?.is_published ? 'Publish' : 'Save Draft'} />}>
        {edit && (
          <div className="row g-3">
            <Field label="Title *" col={8}><input className="form-input" value={edit.title} onChange={e => set('title', e.target.value)} /></Field>
            <Field label="Month" col={4}><input type="month" className="form-input" value={edit.period} onChange={e => set('period', e.target.value)} /></Field>
            <Field label="Summary"><input className="form-input" value={edit.summary} onChange={e => set('summary', e.target.value)} /></Field>
            <Field label="Brief">
              <textarea className="form-input" style={{ height: 160, resize: 'vertical' }} value={edit.body} onChange={e => set('body', e.target.value)} />
            </Field>
            <Field label="Audience" col={6}>
              <select className="form-select" value={edit.audience} onChange={e => set('audience', e.target.value)}>
                <option value="all">Everyone</option>
                <option value="retainer">Retainer clients</option>
                <option value="members">Members</option>
              </select>
            </Field>
            <Field label="Status" col={6}>
              <select className="form-select" value={edit.is_published ? '1' : '0'} onChange={e => set('is_published', e.target.value === '1')}>
                <option value="0">Draft</option>
                <option value="1">Published (notifies the audience)</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!delId} onClose={() => setDelId(null)} onConfirm={remove} title="Delete brief" message="Delete this market brief?" confirmLabel="Delete" danger />
    </>
  );
}

/* ═══ Page ═══════════════════════════════════════════════════ */
export default function AdminCommunity() {
  const [tab, setTab] = useState('memberships');
  const TABS = [
    { id: 'memberships', label: 'Memberships' },
    { id: 'events',      label: 'Events' },
    { id: 'briefs',      label: 'Market Briefs' },
  ];

  return (
    <>
      <AppHeader breadcrumb="Community" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom: 0 }}>Community & Retention</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, marginBottom: 0 }}>Integra Innovators, Integra Nights and Monthly Market Briefs</p>
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

        {tab === 'memberships' && <MembershipsTab />}
        {tab === 'events'      && <EventsTab />}
        {tab === 'briefs'      && <BriefsTab />}
      </div>
    </>
  );
}

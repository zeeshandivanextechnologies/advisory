import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { StatCard, Badge, Spinner, EmptyState, SearchInput, Modal, showToast } from '../../components/common/index';
import { advisorAPI, documentAPI, notifAPI, authAPI, userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';

/* ═══ ADVISOR DASHBOARD ════════════════════════════════════ */
export function AdvisorDashboard() {
  const { user }        = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    advisorAPI.getDashboard()
      .then(r => setData(r.data.data))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <><AppHeader breadcrumb="Dashboard" /><Spinner /></>;

  const { stats, recent_docs, upcoming } = data || {};

  return (
    <>
      <AppHeader breadcrumb="Dashboard" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Good morning, {user?.full_name?.split(' ')[0]}</h1>
            <p className="page-subtitle">Here's your advisory dashboard for today</p>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard icon="👥" label="Active Clients"     value={stats?.active_clients}   sub="+3 this month" />
          <StatCard icon="📅" label="Upcoming Sessions"  value={stats?.upcoming_sessions} sub="Scheduled" borderColor="var(--green)" />
          <StatCard icon="📊" label="Active Cases"       value={stats?.active_cases}      sub="In progress" borderColor="var(--blue)" />
          <StatCard icon="⭐" label="Rating"             value="—"                        sub="Average" borderColor="var(--orange)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Upcoming Sessions */}
          <div className="table-card">
            <div className="table-header"><span className="table-title">Upcoming Sessions</span></div>
            <table className="data-table">
              <thead><tr><th>Client</th><th>Date</th><th>Medium</th><th>Status</th></tr></thead>
              <tbody>
                {upcoming?.length ? upcoming.map(s => (
                  <tr key={s.id}>
                    <td><div className="doc-name">{s.client_name}</div></td>
                    <td style={{ fontSize: 12 }}>{new Date(s.scheduled_at).toLocaleString()}</td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{s.medium}</td>
                    <td><Badge status={s.status} /></td>
                  </tr>
                )) : <tr><td colSpan={4}><EmptyState icon="📅" title="No upcoming sessions" /></td></tr>}
              </tbody>
            </table>
          </div>

          {/* Recent Documents */}
          <div className="table-card">
            <div className="table-header"><span className="table-title">Pending Documents</span></div>
            <table className="data-table">
              <thead><tr><th>Client</th><th>Document</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {recent_docs?.length ? recent_docs.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontSize: 13 }}>{d.client_name}</td>
                    <td>
                      <div className="doc-name">{d.original_name}</div>
                      <div className="doc-meta">{d.category?.toUpperCase()}</div>
                    </td>
                    <td><Badge status={d.status} /></td>
                    <td>
                      {d.status === 'pending' && (
                        <button className="btn btn-success btn-sm"
                          onClick={async () => {
                            await documentAPI.review(d.id, { status: 'approved' });
                            showToast('Document approved');
                          }}>
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan={4}><EmptyState icon="📄" title="No pending documents" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ ADVISOR DOCUMENTS ════════════════════════════════════ */
export function AdvisorDocuments() {
  const [docs, setDocs]     = useState([]);
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [note, setNote]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    documentAPI.list({ status: statusFilter })
      .then(r => setDocs(r.data.data))
      .catch(console.error).finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (status) => {
    try {
      await documentAPI.review(reviewModal.id, { status, notes: note });
      showToast(`Document ${status}`);
      setReviewModal(null); setNote(''); load();
    } catch { showToast('Action failed', 'error'); }
  };

  return (
    <>
      <AppHeader breadcrumb="Documents" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Client Documents</h1>
            <p className="page-subtitle">Review documents submitted by your clients</p>
          </div>
          <select className="form-select" style={{ fontSize: 12, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-card">
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Document</th><th>Client</th><th>Category</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {docs.length ? docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="doc-name">{d.original_name}</div>
                      <div className="doc-meta">{d.file_type}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{d.uploader_name}</td>
                    <td style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-dark-4)' }}>{d.category}</td>
                    <td style={{ fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString()}</td>
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
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional review notes…" />
        </div>
      </Modal>
    </>
  );
}

/* ═══ ADVISOR CLIENTS ══════════════════════════════════════ */
export function AdvisorClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch clients via consultations
    userAPI.getConsultations()
      .then(r => {
        const unique = {};
        (r.data.data || []).forEach(c => { if (!unique[c.user_id]) unique[c.user_id] = c; });
        setClients(Object.values(unique));
      })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader breadcrumb="Clients" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Clients</h1>
            <p className="page-subtitle">{clients.length} clients</p>
          </div>
        </div>

        <div className="table-card">
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Client</th><th>Last Session</th><th>Status</th></tr></thead>
              <tbody>
                {clients.length ? clients.map(c => (
                  <tr key={c.id}>
                    <td><div className="doc-name">{c.client_name}</div></td>
                    <td style={{ fontSize: 13 }}>{new Date(c.scheduled_at).toLocaleDateString()}</td>
                    <td><Badge status={c.status} /></td>
                  </tr>
                )) : <tr><td colSpan={3}><EmptyState icon="👥" title="No clients yet" /></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══ ADVISOR SCHEDULE ═════════════════════════════════════ */
export function AdvisorSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    userAPI.getConsultations({ limit: 50 })
      .then(r => setSessions(r.data.data))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const grouped = sessions.reduce((acc, s) => {
    const date = new Date(s.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  return (
    <>
      <AppHeader breadcrumb="Schedule" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Schedule</h1>
            <p className="page-subtitle">Upcoming and past sessions</p>
          </div>
        </div>

        {loading ? <Spinner /> : Object.entries(grouped).length ? (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(s => (
                  <div key={s.id} className="card-light" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontSize: 32, width: 50, textAlign: 'center' }}>
                      {s.medium === 'video' ? '📹' : s.medium === 'phone' ? '📞' : '🤝'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)' }}>{s.client_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>
                        {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {s.duration_min} min · {s.medium}
                      </div>
                    </div>
                    <Badge status={s.status} />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : <EmptyState icon="📅" title="No sessions scheduled" text="Sessions will appear here when clients book with you" />}
      </div>
    </>
  );
}

/* ═══ ADVISOR NOTIFICATIONS ════════════════════════════════ */
export function AdvisorNotifications() {
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notifAPI.list({ limit: 50 })
      .then(r => { setNotifs(r.data.data); setUnread(r.data.meta.unread); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await notifAPI.markRead({});
    setUnread(0);
    setNotifs(p => p.map(n => ({ ...n, is_read: 1 })));
  };

  return (
    <>
      <AppHeader breadcrumb="Notifications" unread={unread} />
      <div className="page-inner">
        <div className="page-header">
          <div><h1 className="page-title">Notifications</h1><p className="page-subtitle">{unread} unread</p></div>
          {unread > 0 && <button className="btn btn-outline-dark btn-sm" onClick={markAllRead}>Mark all read</button>}
        </div>
        {loading ? <Spinner /> : (
          <div className="table-card">
            {notifs.length ? notifs.map(n => (
              <div key={n.id} style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border-light)',
                background: n.is_read ? 'white' : '#F0F9FF', display: 'flex', gap: 12,
              }}>
                <div style={{ fontSize: 20, flexShrink: 0 }}>
                  {n.type?.includes('document') ? '📄' : n.type?.includes('case') ? '📋' : '📅'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 3 }}>
                    {n.title}
                    {!n.is_read && <span style={{ marginLeft: 8, width: 7, height: 7, background: 'var(--blue)', borderRadius: '50%', display: 'inline-block' }} />}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dark-3)' }}>{n.body}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dark-4)', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            )) : <EmptyState icon="🔔" title="No notifications" text="You're all caught up!" />}
          </div>
        )}
      </div>
    </>
  );
}

/* ═══ ADVISOR SETTINGS ═════════════════════════════════════ */
export function AdvisorSettings() {
  const { user, updateUser } = useAuth();
  const { currency }         = useSettings();
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', phone: user?.phone || '' });
  const [advisor, setAdvisor] = useState({ bio: '', hourly_rate: '', experience_yrs: '', specializations: [] });
  const [saving, setSaving]   = useState(false);
  const sp = (k, v) => setAdvisor(p => ({ ...p, [k]: v }));

  useEffect(() => {
    advisorAPI.getDashboard().catch(console.error);
  }, []);

  const saveAll = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await userAPI.updateProfile(profile);
      await advisorAPI.updateProfile({ ...advisor, specializations: advisor.specializations });
      updateUser(profile);
      showToast('Settings saved');
    } catch { showToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const specs = ['Corporate Law', 'Tax Advisory', 'Business Licensing', 'Visa & Residency', 'Contract Review', 'Trademark / IP', 'Compliance', 'M&A'];

  return (
    <>
      <AppHeader breadcrumb="Settings" />
      <div className="page-inner">
        <div className="page-header">
          <div><h1 className="page-title">Advisor Settings</h1></div>
          <button className="btn btn-accent" onClick={saveAll} disabled={saving}>{saving ? 'Saving…' : 'Save All'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Personal Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{ k: 'full_name', label: 'Full Name' }, { k: 'phone', label: 'Phone' }].map(({ k, label }) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label}</label>
                  <input className="form-input" value={profile[k]} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Advisor Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-textarea" value={advisor.bio} onChange={e => sp('bio', e.target.value)} placeholder="Describe your expertise…" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hourly Rate ({currency})</label>
                  <input type="number" className="form-input" value={advisor.hourly_rate} onChange={e => sp('hourly_rate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Experience (years)</label>
                  <input type="number" className="form-input" value={advisor.experience_yrs} onChange={e => sp('experience_yrs', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Specializations</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {specs.map(s => {
                    const active = advisor.specializations.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => sp('specializations', active ? advisor.specializations.filter(x => x !== s) : [...advisor.specializations, s])}
                        style={{
                          padding: '5px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', letterSpacing: '0.03em',
                          border: `1px solid ${active ? 'var(--lt-black)' : 'var(--border-light)'}`,
                          background: active ? 'var(--lt-black)' : 'white',
                          color: active ? 'white' : 'var(--text-dark)',
                          borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
                        }}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

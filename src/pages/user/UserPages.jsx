import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, Modal, showToast } from '../../components/common/index';
import { documentAPI, advisorAPI, userAPI, notifAPI, authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

/* ═══ DOCUMENTS ════════════════════════════════════════════ */
export function UserDocuments() {
  const [docs, setDocs]     = useState([]);
  const [meta, setMeta]     = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm]     = useState({ category: 'other' });
  const fileRef             = useRef(null);

  const load = useCallback((page = 1) => {
    setLoading(true);
    documentAPI.list({ page, limit: 20 })
      .then(r => { setDocs(r.data.data); setMeta(r.data.meta); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return showToast('Please select a file', 'error');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', form.category);
    try {
      await documentAPI.upload(fd);
      showToast('Document uploaded successfully');
      setUploadModal(false);
      load(1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally { setUploading(false); }
  };

  return (
    <>
      <AppHeader breadcrumb="Upload Documents" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Documents</h1>
            <p className="page-subtitle">{meta.total} documents uploaded</p>
          </div>
          <button className="btn btn-accent" onClick={() => setUploadModal(true)}>+ Upload Document</button>
        </div>

        <div className="table-card">
          <div className="table-header"><span className="table-title">All Documents</span></div>
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Document</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Status</th></tr></thead>
              <tbody>
                {docs.length ? docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className="doc-name">{d.original_name}</div>
                      <div className="doc-meta">{d.file_type}</div>
                    </td>
                    <td style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-dark-4)' }}>{d.category}</td>
                    <td style={{ fontSize: 12 }}>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td><Badge status={d.status} /></td>
                  </tr>
                )) : <tr><td colSpan={5}><EmptyState icon="📄" title="No documents yet" text="Upload your first document" /></td></tr>}
              </tbody>
            </table>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>

      <Modal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document"
        footer={
          <button className="btn btn-accent" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Document Category</label>
            <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="moa">Memorandum of Association (MOA)</option>
              <option value="license">Business License</option>
              <option value="visa">Visa / Residency</option>
              <option value="contract">Contract</option>
              <option value="tax">Tax Document</option>
              <option value="id">ID / Passport</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select File</label>
            <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx"
              style={{ fontSize: 13, padding: '8px 0', color: 'var(--text-dark)' }} />
            <p style={{ fontSize: 11, color: 'var(--text-dark-4)', marginTop: 4 }}>
              Accepted: PDF, DOC, DOCX, JPG, PNG, XLSX — Max 10MB
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ═══ CONNECT ADVISOR ══════════════════════════════════════ */
export function ConnectAdvisor() {
  const navigate          = useNavigate();
  const { currency }      = useSettings();
  const [advisors, setAdvisors] = useState([]);
  const [meta, setMeta]   = useState({ total: 0, page: 1, limit: 12 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback((page = 1) => {
    setLoading(true);
    advisorAPI.list({ search, page, limit: 12 })
      .then(r => { setAdvisors(r.data.data); setMeta(r.data.meta); })
      .catch(console.error).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(1); }, [load]);

  return (
    <>
      <AppHeader breadcrumb="Connect with an Advisor" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Find Your Advisor</h1>
            <p className="page-subtitle">Connect with verified GCC legal & business advisors</p>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search advisors by name or country…" />
        </div>

        {loading ? <Spinner /> : (
          advisors.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {advisors.map(a => (
                <div key={a.id} className="card-light"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: 'var(--grey-shade)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)',
                    }}>
                      {a.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)' }}>{a.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>📍 {a.country || 'GCC'}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-dark-3)', marginBottom: 12, lineHeight: 1.5 }}>
                    {a.bio ? a.bio.substring(0, 100) + '…' : 'Experienced advisor specializing in GCC business law.'}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {(JSON.parse(a.specializations || '[]')).slice(0, 3).map(s => (
                      <span key={s} className="badge badge-blue">{s}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                      ⭐ {Number(a.rating).toFixed(1)} · {a.experience_yrs}yr exp
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                      {currency} {a.hourly_rate}/hr
                    </div>
                  </div>
                  <button className="btn btn-accent" style={{ width: '100%', marginTop: 14 }}
                    onClick={() => navigate('/user/book-consultation', { state: { advisor: a } })}>
                    Book Consultation
                  </button>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="👤" title="No advisors found" text="Try a different search" />
        )}
        <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
      </div>
    </>
  );
}

/* ═══ CONSULTATIONS ════════════════════════════════════════ */
export function Consultations() {
  const [consults, setConsults] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate                = useNavigate();

  useEffect(() => {
    userAPI.getConsultations()
      .then(r => setConsults(r.data.data))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader breadcrumb="Consultations" />
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Consultations</h1>
            <p className="page-subtitle">{consults.length} sessions booked</p>
          </div>
          <button className="btn btn-accent" onClick={() => navigate('/user/book-consultation')}>
            + Book Session
          </button>
        </div>

        <div className="table-card">
          <div className="table-header"><span className="table-title">All Sessions</span></div>
          {loading ? <Spinner /> : (
            <table className="data-table">
              <thead><tr><th>Advisor</th><th>Date & Time</th><th>Duration</th><th>Medium</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {consults.length ? consults.map(c => (
                  <tr key={c.id}>
                    <td><div className="doc-name">{c.advisor_name}</div></td>
                    <td style={{ fontSize: 13 }}>{new Date(c.scheduled_at).toLocaleString()}</td>
                    <td style={{ fontSize: 13 }}>{c.duration_min} min</td>
                    <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{c.medium}</td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      {c.status === 'scheduled' && c.medium === 'video' && (
                        <button className="btn btn-success btn-sm"
                          onClick={() => navigate('/user/video-call', { state: { consultation: c } })}>
                          Join Call
                        </button>
                      )}
                      {c.status === 'completed' && (
                        <button className="table-action-btn"
                          onClick={() => navigate('/user/session-notes', { state: { consultation: c } })}>
                          Notes
                        </button>
                      )}
                    </td>
                  </tr>
                )) : <tr><td colSpan={6}><EmptyState icon="📅" title="No consultations yet" text="Book your first session" /></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══ BOOK CONSULTATION ════════════════════════════════════ */
export function BookConsultation() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { currency }    = useSettings();
  const preAdvisor      = location.state?.advisor;
  const [advisors, setAdvisors] = useState([]);
  const [form, setForm] = useState({
    advisor_id: preAdvisor?.id || '',
    scheduled_at: '',
    duration_min: '60',
    medium: 'video',
    user_notes: '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    advisorAPI.list({ limit: 100 }).then(r => setAdvisors(r.data.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await userAPI.bookConsultation(form);
      showToast('Consultation booked successfully!');
      navigate('/user/consultations');
    } catch (err) {
      showToast(err.response?.data?.message || 'Booking failed', 'error');
    } finally { setLoading(false); }
  };

  return (
    <>
      <AppHeader breadcrumb="Book Consultation" />
      <div className="page-inner">
        <div className="page-header">
          <h1 className="page-title">Book a Consultation</h1>
        </div>
        <div className="card-light" style={{ maxWidth: 580 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Select Advisor</label>
              <select className="form-select" value={form.advisor_id} onChange={e => set('advisor_id', e.target.value)} required>
                <option value="">Choose an advisor</option>
                {advisors.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name} — {currency} {a.hourly_rate}/hr</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input type="datetime-local" className="form-input" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} required min={new Date().toISOString().slice(0, 16)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <select className="form-select" value={form.duration_min} onChange={e => set('duration_min', e.target.value)}>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">2 hours</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Meeting Medium</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['video', 'phone', 'in_person'].map(m => (
                  <label key={m} style={{
                    flex: 1, padding: '10px 14px', border: `1px solid ${form.medium === m ? 'var(--lt-black)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    background: form.medium === m ? 'var(--lt-black)' : 'white',
                    color: form.medium === m ? 'white' : 'var(--text-dark)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-h)',
                  }}>
                    <input type="radio" style={{ display: 'none' }} checked={form.medium === m} onChange={() => set('medium', m)} />
                    {m === 'video' ? '📹' : m === 'phone' ? '📞' : '🤝'} {m.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes for Advisor</label>
              <textarea className="form-textarea" value={form.user_notes} onChange={e => set('user_notes', e.target.value)}
                placeholder="Briefly describe what you'd like to discuss…" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline-dark" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={loading}>{loading ? 'Booking…' : 'Confirm Booking'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
/* ═══ NOTIFICATIONS ════════════════════════════════════════ */
export function UserNotifications() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    notifAPI.list({ limit: 50 })
      .then(r => { setNotifs(r.data.data); setUnread(r.data.meta.unread); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button className="btn btn-outline-dark btn-sm" onClick={markAllRead}>Mark all read</button>
          )}
        </div>

        {loading ? <Spinner /> : (
          <div className="table-card">
            {notifs.length ? notifs.map(n => (
              <div key={n.id} style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border-light)',
                background: n.is_read ? 'white' : '#F0F9FF',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                  {n.type?.includes('document') ? '📄' : n.type?.includes('case') ? '📋' : n.type?.includes('consultation') ? '📅' : '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 3 }}>
                    {n.title}
                    {!n.is_read && <span style={{ marginLeft: 8, width: 8, height: 8, background: 'var(--blue)', borderRadius: '50%', display: 'inline-block' }} />}
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

/* ═══ SETTINGS ═════════════════════════════════════════════ */
export function UserSettings() {
  const { user, updateUser } = useAuth();
  const [form, setForm]      = useState({ full_name: user?.full_name || '', phone: user?.phone || '', country: user?.country || '', company: user?.company || '' });
  const [pwdForm, setPwdForm]= useState({ current_password: '', new_password: '', confirm: '' });
  const [saving, setSaving]  = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setP = (k, v) => setPwdForm(p => ({ ...p, [k]: v }));

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await userAPI.updateProfile(form);
      updateUser(form);
      showToast('Profile updated successfully');
    } catch { showToast('Failed to update profile', 'error'); }
    finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm) return showToast('Passwords do not match', 'error');
    setPwdSaving(true);
    try {
      await authAPI.changePassword({ current_password: pwdForm.current_password, new_password: pwdForm.new_password });
      showToast('Password changed successfully');
      setPwdForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally { setPwdSaving(false); }
  };

  return (
    <>
      <AppHeader breadcrumb="Settings" />
      <div className="page-inner">
        <h1 className="page-title" style={{ marginBottom: 20 }}>Account Settings</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Profile Information</h3>
            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { k: 'full_name', label: 'Full Name',    type: 'text' },
                { k: 'phone',     label: 'Phone Number', type: 'tel' },
                { k: 'country',   label: 'Country',      type: 'text' },
                { k: 'company',   label: 'Company',      type: 'text' },
              ].map(({ k, label, type }) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label}</label>
                  <input type={type} className="form-input" value={form[k]} onChange={e => set(k, e.target.value)} />
                </div>
              ))}
              <button type="submit" className="btn btn-accent" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>

          <div className="card-light">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Change Password</h3>
            <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { k: 'current_password', label: 'Current Password' },
                { k: 'new_password',     label: 'New Password' },
                { k: 'confirm',          label: 'Confirm New Password' },
              ].map(({ k, label }) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label}</label>
                  <input type="password" className="form-input" value={pwdForm[k]} onChange={e => setP(k, e.target.value)} required />
                </div>
              ))}
              <button type="submit" className="btn btn-outline-dark" disabled={pwdSaving}>{pwdSaving ? 'Updating…' : 'Update Password'}</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══ SESSION NOTES ════════════════════════════════════════ */
export function SessionNotes() {
  const location      = useLocation();
  const consultation  = location.state?.consultation;
  return (
    <>
      <AppHeader breadcrumb="Session Notes" />
      <div className="page-inner">
        <h1 className="page-title" style={{ marginBottom: 20 }}>Session Notes</h1>
        <div className="card-light" style={{ maxWidth: 640 }}>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, padding: '14px 16px', background: 'var(--grey-shade)', borderRadius: 'var(--radius)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dark-4)', fontFamily: 'var(--font-h)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Advisor</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{consultation?.advisor_name || '—'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dark-4)', fontFamily: 'var(--font-h)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>
                {consultation?.scheduled_at ? new Date(consultation.scheduled_at).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
          {consultation?.advisor_notes ? (
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Advisor Notes</div>
              <p style={{ fontSize: 14, color: 'var(--text-dark-3)', lineHeight: 1.7, padding: '14px 16px', background: 'var(--grey-shade)', borderRadius: 'var(--radius)' }}>
                {consultation.advisor_notes}
              </p>
            </div>
          ) : (
            <EmptyState icon="📝" title="No notes yet" text="Your advisor hasn't added notes for this session" />
          )}
        </div>
      </div>
    </>
  );
}

/* ═══ VIDEO CALL ═══════════════════════════════════════════ */
export function VideoCall() {
  const location     = useLocation();
  const consultation = location.state?.consultation;
  return (
    <>
      <AppHeader breadcrumb="Video Call" />
      <div className="page-inner">
        <h1 className="page-title" style={{ marginBottom: 20 }}>Video Consultation</h1>
        <div className="card-light" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>📹</div>
          <h2 style={{ fontSize: 22, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 10 }}>
            Session with {consultation?.advisor_name || 'your advisor'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 28 }}>
            {consultation?.scheduled_at ? new Date(consultation.scheduled_at).toLocaleString() : 'Scheduled session'}
          </p>
          {consultation?.meeting_link ? (
            <a href={consultation.meeting_link} target="_blank" rel="noreferrer" className="btn btn-accent btn-lg">
              Join Meeting
            </a>
          ) : (
            <div style={{ color: 'var(--text-dark-4)', fontSize: 14 }}>
              Meeting link will be provided by your advisor before the session.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══ START BUSINESS ═══════════════════════════════════════ */
export function StartBusiness() {
  const navigate        = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ title: '', category: '', jurisdiction: '', description: '', priority: 'medium', advisor_id: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { caseAPI } = await import('../../services/api');
      await caseAPI.create(form);
      showToast('Case created successfully!');
      navigate('/user/dashboard');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create case', 'error');
    } finally { setLoading(false); }
  };

  const categories = [
    { value: 'company_formation', icon: '🏢', label: 'Company Formation' },
    { value: 'licensing',         icon: '📜', label: 'Business Licensing' },
    { value: 'visa',              icon: '🛂', label: 'Visa & Residency' },
    { value: 'tax',               icon: '💰', label: 'Tax Advisory' },
    { value: 'compliance',        icon: '✅', label: 'Compliance' },
    { value: 'contract_review',   icon: '📋', label: 'Contract Review' },
    { value: 'trademark',         icon: '™️', label: 'Trademark / IP' },
    { value: 'other',             icon: '📁', label: 'Other' },
  ];

  return (
    <>
      <AppHeader breadcrumb="Start a Business" />
      <div className="page-inner">
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          {/* Steps */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--lt-white)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {['Service Type', 'Jurisdiction', 'Details', 'Review'].map((s, i) => (
              <div key={s} style={{
                flex: 1, padding: '12px 8px', textAlign: 'center',
                background: step === i + 1 ? 'var(--lt-black)' : 'white',
                color: step === i + 1 ? 'white' : step > i + 1 ? 'var(--green)' : 'var(--text-dark-4)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                borderRight: i < 3 ? '1px solid var(--border-light)' : 'none',
                transition: 'all 0.2s',
              }}>
                {step > i + 1 ? '✓ ' : `${i + 1}. `}{s}
              </div>
            ))}
          </div>

          <div className="card-light">
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 6, color: 'var(--text-dark)' }}>What service do you need?</h2>
                <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 20 }}>Select the type of advisory service you require</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {categories.map(c => (
                    <div key={c.value} onClick={() => set('category', c.value)} style={{
                      padding: '14px', border: `1px solid ${form.category === c.value ? 'var(--lt-black)' : 'var(--border-light)'}`,
                      borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                      background: form.category === c.value ? 'var(--lt-black)' : 'white',
                      color: form.category === c.value ? 'white' : 'var(--text-dark)', transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 20 }}>{c.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-h)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-accent" style={{ width: '100%' }} onClick={() => setStep(2)} disabled={!form.category}>
                  Continue →
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 6, color: 'var(--text-dark)' }}>Select Jurisdiction</h2>
                <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 20 }}>Where would you like to register or operate?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {['Qatar (QFC)', 'Qatar (MME)', 'UAE (Mainland)', 'UAE (DIFC)', 'UAE (Free Zone)', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Oman'].map(j => (
                    <div key={j} onClick={() => set('jurisdiction', j)} style={{
                      padding: '12px 16px', border: `1px solid ${form.jurisdiction === j ? 'var(--lt-black)' : 'var(--border-light)'}`,
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: form.jurisdiction === j ? 'var(--lt-black)' : 'white',
                      color: form.jurisdiction === j ? 'white' : 'var(--text-dark)',
                      fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                    }}>{j}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline-dark" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!form.jurisdiction}>Continue →</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 6, color: 'var(--text-dark)' }}>Case Details</h2>
                <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 20 }}>Tell us more about your requirements</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                  <div className="form-group">
                    <label className="form-label">Case Title *</label>
                    <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)}
                      placeholder="e.g. Company Formation in Qatar Free Zone" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="Describe your business needs and any specific requirements…" rows={4} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-outline-dark" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => setStep(4)} disabled={!form.title}>Review →</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20, color: 'var(--text-dark)' }}>Review & Submit</h2>
                {[
                  { label: 'Service Type',  value: categories.find(c => c.value === form.category)?.label },
                  { label: 'Jurisdiction',  value: form.jurisdiction },
                  { label: 'Case Title',    value: form.title },
                  { label: 'Priority',      value: form.priority },
                  { label: 'Description',   value: form.description || '—' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-dark)', fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button className="btn btn-outline-dark" onClick={() => setStep(3)}>Back</button>
                  <button className="btn btn-accent" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Submitting…' : '🚀 Submit Case'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

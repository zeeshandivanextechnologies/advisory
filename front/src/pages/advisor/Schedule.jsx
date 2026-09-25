import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { FIT_DECISIONS } from '../../utils/journey';
import { userAPI } from '../../services/api';
import { FaCalendarAlt } from "react-icons/fa";
import {
  FiVideo,
  FiPhone,
  FiUsers,
  FiCalendar
} from "react-icons/fi";

export default function AdvisorSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [outcome, setOutcome]   = useState(null);
  const [saving, setSaving]     = useState(false);

  const load = () => {
    userAPI.getConsultations({ limit: 50 })
      .then(r => setSessions(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Discovery-call decision (go/no-go by minute 30) and delivery handover notes
  const openOutcome = (s) => setOutcome({
    id: s.id, client_name: s.client_name,
    fit_decision: s.fit_decision || '', next_step: s.next_step || '',
    action_items: (s.action_items || []).map(i => (typeof i === 'string' ? i : i.text)).join('\n'),
    recording_url: s.recording_url || '', advisor_notes: s.advisor_notes || '',
  });

  const saveOutcome = async () => {
    setSaving(true);
    try {
      const { id, client_name, ...o } = outcome;
      await userAPI.updateConsultation(id, {
        ...o,
        action_items: o.action_items.split('\n').map(t => t.trim()).filter(Boolean).map(text => ({ text })),
      });
      showToast('Session outcome saved — the client has been notified');
      setOutcome(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save outcome', 'error');
    } finally { setSaving(false); }
  };

  const grouped = sessions.reduce((acc, s) => {
    const date = new Date(s.scheduled_at).toLocaleDateString('en-GB', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  // const mediumIcon = (m) => ({ video: '📹', phone: '📞', in_person: '🤝' }[m] || '📅');
  const mediumIcon = (m) => ({
  video: <FiVideo />,
  phone: <FiPhone />,
  in_person: <FiUsers />,
}[m] || <FiCalendar />);







  return (
    <>
      <AppHeader breadcrumb="Schedule" />

      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h1 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>My Schedule</h1>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{sessions.length} total sessions</p>
          </div>
        </div>

        {loading ? <Spinner /> : Object.entries(grouped).length ? (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)',
                color: 'var(--text-dark-4)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 10,
              }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(s => (
                  <div key={s.id} className="card-light" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 30, textAlign: 'center', flexShrink: 0 }}>
                      {mediumIcon(s.medium)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 3 }}>
                        {s.client_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>
                        {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{s.duration_min} min
                        {' · '}{s.medium?.replace('_', ' ')}
                      </div>
                    </div>
                    {s.fit_decision && <Badge status={s.fit_decision === 'go' ? 'approved' : s.fit_decision === 'no_go' ? 'rejected' : 'pending'} text={s.fit_decision.replace('_', '-')} />}
                    <Badge status={s.status} />
                    {s.status !== 'cancelled' && (
                      <button className="thm-btn" onClick={() => openOutcome(s)}>Outcome</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon={<FaCalendarAlt  />}  title="No sessions scheduled" text="Sessions appear here when clients book with you" />
        )}
      </div>

      <Modal open={!!outcome} onClose={() => setOutcome(null)} title={outcome ? `Session outcome — ${outcome.client_name}` : 'Session outcome'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setOutcome(null)}>Cancel</button>
            <button className="ai-thm-btn" onClick={saveOutcome} disabled={saving}>{saving ? 'Saving…' : 'Save Outcome'}</button>
          </div>
        }>
        {outcome && (
          <div className="row g-3">
            <div className="col-12 form-group">
              <label className="form-label">Fit decision (discovery call)</label>
              <select className="form-select" value={outcome.fit_decision} onChange={e => setOutcome(p => ({ ...p, fit_decision: e.target.value }))}>
                <option value="">Not decided</option>
                {FIT_DECISIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div className="col-12 form-group">
              <label className="form-label">Next step given to the client</label>
              <input className="form-input" placeholder="e.g. Proposal within 24 hours" value={outcome.next_step} onChange={e => setOutcome(p => ({ ...p, next_step: e.target.value }))} />
            </div>
            <div className="col-12 form-group">
              <label className="form-label">Action items (one per line)</label>
              <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={outcome.action_items} onChange={e => setOutcome(p => ({ ...p, action_items: e.target.value }))} />
            </div>
            <div className="col-12 form-group">
              <label className="form-label">Recording link</label>
              <input className="form-input" placeholder="https://…" value={outcome.recording_url} onChange={e => setOutcome(p => ({ ...p, recording_url: e.target.value }))} />
            </div>
            <div className="col-12 form-group">
              <label className="form-label">Session notes</label>
              <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={outcome.advisor_notes} onChange={e => setOutcome(p => ({ ...p, advisor_notes: e.target.value }))} />
            </div>
          </div>
        )}
      </Modal>

    </>
  );
}

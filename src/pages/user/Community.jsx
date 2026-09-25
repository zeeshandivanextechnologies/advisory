import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { communityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { eventTypeLabel, fmtDate, AUDIENCE_LABELS } from '../../utils/services';
import { IoIosCheckbox } from 'react-icons/io';

const timeOf = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* Market briefs are shared by the client Community page and the advisor Retainers page */
export function MarketBriefs({ briefs }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="ai-table-section">
        <div className="table-header">
          <h5 className="fz-14 text-black fw-600 mb-0">Monthly Market Briefs</h5>
        </div>
        {briefs.length ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {briefs.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <h5 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 2 }}>{b.title}</h5>
                  <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 0 }}>
                    {new Date(b.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    {b.summary ? ` · ${b.summary}` : ''}
                  </p>
                </div>
                <button className="ai-thm-btn outline" onClick={() => setOpen(b)}>Read</button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="📰" title="No briefs yet" text="New monthly market briefs will appear here" />
        )}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title || 'Market brief'}>
        {open && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>
              {new Date(open.period).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
            {open.summary && <p style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>{open.summary}</p>}
            <div style={{ fontSize: 14, color: '#4A4949', whiteSpace: 'pre-wrap' }}>{open.body || 'No content.'}</div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default function Community() {
  const navigate                    = useNavigate();
  const { user }                    = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [events, setEvents]         = useState([]);
  const [briefs, setBriefs]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(null);

  const load = useCallback(() => {
    Promise.all([communityAPI.getMemberships(), communityAPI.getEvents(), communityAPI.getBriefs()])
      .then(([m, e, b]) => {
        setMemberships(m.data.data || []);
        setEvents(e.data.data || []);
        setBriefs(b.data.data || []);
      })
      .catch(() => showToast('Failed to load community', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (m, accept) => {
    setBusy(`m${m.id}`);
    try {
      await communityAPI.respondMembership(m.id, accept);
      showToast(accept ? `Welcome to ${m.tier_name}!` : 'Invitation declined');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setBusy(null); }
  };

  const rsvp = async (ev, going) => {
    setBusy(`e${ev.id}`);
    try {
      await communityAPI.rsvp(ev.id, going);
      showToast(going ? "You're on the list" : 'RSVP cancelled');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setBusy(null); }
  };

  if (loading) return <><AppHeader breadcrumb="Community" /><Spinner /></>;

  const invites = memberships.filter(m => m.status === 'invited');
  const current = memberships.filter(m => m.is_current);

  return (
    <>
      <AppHeader breadcrumb="Community" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Community</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>Memberships, events and market briefs</p>
          </div>
        </div>

        {/* Membership */}
        {current.map(m => (
          <div key={m.id} style={{ background: '#22C55E1F', border: '0.9px solid #22C55E', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#22C55E' }}><IoIosCheckbox size={24} /></span>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom: 5 }}>{m.tier_name} member</h4>
              <h6 style={{ fontSize: 12, color: '#4A4949', marginBottom: 0 }}>
                Since {fmtDate(m.started_at)}{m.expires_at ? ` · Renews ${fmtDate(m.expires_at)}` : ''}
              </h6>
            </div>
          </div>
        ))}

        {invites.map(m => (
          <div key={m.id} className="advisor-legal-cards mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>You're invited to {m.tier_name}</h3>
              <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>A selective network with resources, referrals, events and member spotlights.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ai-thm-btn outline" disabled={busy === `m${m.id}`} onClick={() => respond(m, false)}>Decline</button>
              <button className="ai-thm-btn" disabled={busy === `m${m.id}`} onClick={() => respond(m, true)}>Accept Invitation</button>
            </div>
          </div>
        ))}

        {!current.length && !invites.length && user?.role === 'user' && (
          <div className="advisor-legal-cards mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>Integra Innovators</h3>
              <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>Membership is invite-only. Request to join and our team will be in touch.</p>
            </div>
            <button className="ai-thm-btn" onClick={() => navigate('/user/services', { state: { category: 'relationships' } })}>
              Request to Join
            </button>
          </div>
        )}

        {/* Events */}
        <div className="mb-3">
          <h5 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 10 }}>Upcoming Events</h5>
          {events.length ? events.map(ev => {
            const going = ev.my_rsvp === 'going';
            const full  = ev.spots_left === 0 && !going;
            return (
              <div key={ev.id} className="consultations-card">
                <div className="schedule-main-box">
                  <div className="consultations-date-box">
                    <div className="consultations-date-day">
                      <h5>{new Date(ev.starts_at).getDate()}</h5>
                      <p>{new Date(ev.starts_at).toLocaleString('default', { month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="consultations-info">
                    <div className="consultations-name">
                      <h4>{ev.title}</h4>
                      <p>
                        {eventTypeLabel(ev.event_type)} · {timeOf(ev.starts_at)}
                        {ev.location ? ` · ${ev.location}` : ''}
                        {ev.audience !== 'all' ? ` · ${AUDIENCE_LABELS[ev.audience]} only` : ''}
                        {ev.spots_left !== null && ev.spots_left !== undefined ? ` · ${ev.spots_left} spots left` : ''}
                      </p>
                      {ev.description && <span style={{ display: 'block' }}>{ev.description}</span>}
                    </div>
                  </div>
                </div>
                <div className="d-flex gap-2 flex-wrap consultations-actions">
                  {going && <Badge status="active" text="Going" />}
                  {going ? (
                    <button className="ai-remove-btn" disabled={busy === `e${ev.id}`} onClick={() => rsvp(ev, false)}>Cancel RSVP</button>
                  ) : (
                    <button className="thm-btn" disabled={full || busy === `e${ev.id}`} onClick={() => rsvp(ev, true)}>
                      {full ? 'Full' : 'RSVP'}
                    </button>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="advisor-legal-cards"><EmptyState icon="📅" title="No upcoming events" text="Integra Nights, webinars and demos will appear here" /></div>
          )}
        </div>

        <MarketBriefs briefs={briefs} />
      </div>
    </>
  );
}

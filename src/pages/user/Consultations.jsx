import { FaStar } from 'react-icons/fa';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, EmptyState, showToast, ConfirmModal, Modal } from '../../components/common/index';
import { userAPI } from '../../services/api';
import { FaCalendar, FaPlus, FaRegClock } from 'react-icons/fa6';

const StarRating = ({ rating = 0, onRate }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span
        key={i}
        onClick={() => onRate && onRate(i)}
        style={{ color: i <= rating ? '#F59E0B' : '#D1D5DB', fontSize: 14, cursor: onRate ? 'pointer' : 'default' }}
      ><FaStar /></span>
    ))}
  </div>
);

const DateBlock = ({ dateStr }) => {
  const d = new Date(dateStr);
  return (
    <div style={{ textAlign: 'center', flexShrink: 0, width: 40 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1 }}>{d.getDate()}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dark-4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {d.toLocaleString('en-GB', { month: 'short' })}
      </div>
    </div>
  );
};

const isJoinable = (scheduledAt) => {
  const now = Date.now();
  const sessMs = new Date(scheduledAt).getTime();
  return now >= sessMs - 15 * 60 * 1000 && now <= sessMs + 120 * 60 * 1000;
};

export default function Consultations() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // FIX: ConfirmModal state instead of window.confirm
  const [cancelModal, setCancelModal] = useState({ open: false, id: null });

  // FIX: Rating modal with full state
  const [ratingModal, setRatingModal] = useState({ open: false, id: null, rating: 0, review: '' });

  const load = () => {
    setError(null);
    userAPI.getConsultations({ limit: 50 })
      .then(r => setSessions(r.data.data || []))
      .catch(() => setError('Failed to load consultations. Please refresh.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Refresh joinable status every minute without re-fetching
  useEffect(() => {
    const t = setInterval(() => setSessions(s => [...s]), 60000);
    return () => clearInterval(t);
  }, []);

  const upcoming = sessions.filter(s => s.status === 'scheduled');
  const past = sessions.filter(s => s.status !== 'scheduled');

  const formatTime = (dt) =>
    new Date(dt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const submitRating = async () => {
    const { id, rating, review } = ratingModal;
    try {
      await userAPI.updateConsultation(id, { rating, review });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, rating, review } : s));
      showToast('Rating submitted successfully');
      setRatingModal({ open: false, id: null, rating: 0, review: '' });
    } catch {
      showToast('Failed to submit rating', 'error'); // FIX: showToast not alert()
    }
  };

  const handleCancel = async () => {
    const { id } = cancelModal;
    try {
      await userAPI.updateConsultation(id, { status: 'cancelled' });
      showToast('Consultation cancelled');
      load();
    } catch {
      showToast('Failed to cancel consultation', 'error'); // FIX: showToast not alert()
    }
  };

  const SessionCard = ({ s }) => {
    const joinable = isJoinable(s.scheduled_at);
    return (

      // <div style={{ display: 'flex', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
      //   <DateBlock dateStr={s.scheduled_at} />
      //   <div style={{ flex: 1 }}>
      //     <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 2 }}>
      //       {s.advisor_name || 'Advisor'}
      //     </div>
      //     <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>
      //       {formatTime(s.scheduled_at)} · {s.duration_min} min · {s.medium}
      //     </div>
      //     {s.user_notes && (
      //       <div style={{ fontSize: 12, color: 'var(--text-dark-3)', marginTop: 4, fontStyle: 'italic' }}>
      //         {s.user_notes}
      //       </div>
      //     )}
      //   </div>
      //   <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      //     {s.status === 'scheduled' && (
      //       <>
      //         {joinable && (
      //           <button
      //             className="btn btn-accent btn-sm"
      //             onClick={() => navigate(`/user/video-call/${s.id}`, { state: { consultation: s } })}
      //           >
      //             Join
      //           </button>
      //         )}
      //         <button
      //           className="btn btn-outline-dark btn-sm"
      //           style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
      //           onClick={() => setCancelModal({ open: true, id: s.id })} 
      //         >
      //           Cancel
      //         </button>
      //       </>
      //     )}
      //     {s.status === 'completed' && !s.rating && (
      //       <button
      //         className="btn btn-outline-dark btn-sm"
      //         onClick={() => setRatingModal({ open: true, id: s.id, rating: 0, review: '' })}
      //       >
      //         Rate Session
      //       </button>
      //     )}
      //     {s.rating > 0 && <StarRating rating={s.rating} />}
      //   </div>
      // </div>

      <div className="consultations-card">
        <div className="schedule-main-box">
          <div className="consultations-date-box">
            <div className="consultations-date-day">
              <h5>{new Date(s.scheduled_at).getDate()}</h5>
              <p>
                {new Date(s.scheduled_at).toLocaleString('default', { month: 'short' })}
              </p>
            </div>
          </div>
          <div className="consultations-info">
            <div className="consultations-name">
              <h4>{s.advisor_name || 'Advisor'}</h4>

              <p>
                {formatTime(s.scheduled_at)} · {s.duration_min} min · {s.medium}
              </p>

              {s.user_notes && (
                <span style={{ display: 'block', fontStyle: 'italic', }}>
                  {s.user_notes}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 flex-wrap consultations-actions">
          {s.status === 'scheduled' && (
            <>
              {joinable && (
                <button
                  className="thm-btn "
                  onClick={() => navigate(`/user/video-call/${s.id}`, { state: { consultation: s } })}
                >
                  Join
                </button>
              )}
              <button
                className="ai-remove-btn "
                onClick={() => setCancelModal({ open: true, id: s.id })}
              >
                Cancel
              </button>
            </>
          )}

          {s.status === 'completed' && !s.rating && (
            <button
              className="thm-btn outline"
              onClick={() => setRatingModal({ open: true, id: s.id, rating: 0, review: '' })}
            >
              Rate Session
            </button>
          )}

          {s.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <StarRating rating={s.rating} />
            </div>
          )}
        </div>
      </div>

    );
  };

  if (loading) return <><AppHeader breadcrumb="Consultations" /><Spinner /></>;


  return (
    <>
      <AppHeader
        breadcrumb="Consultations"
        action={
          <button className="thm-btn" onClick={() => navigate('/user/book-consultation')}>
            <FaPlus /> <span className='session-title-hd'>Book New Session</span>
          </button>
        }
      />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <h1 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000000', marginBottom: 4 }}>
          My Consultations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 10 }}>Upcoming and past sessions</p>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
            {error} <button style={{ background: 'none', border: 'none', color: 'var(--red)', textDecoration: 'underline', cursor: 'pointer' }} onClick={load}>Retry</button>
          </div>
        )}

        <div className='consultations-session-cards'>
          <h4 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 500, color: '#000000', marginBottom: 10 }}>
            Upcoming Sessions
          </h4>
          <div className=''>
            {upcoming.length === 0
              ? <EmptyState icon={<FaCalendar />} title="No upcoming sessions" text="Book a consultation to get started" />
              : upcoming.map(s => <SessionCard key={s.id} s={s} />)
            }
          </div>

        </div>


        <div className="consultations-session-cards">
          <h4 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 500, color: '#000000', marginBottom: 10 }}>
            Past Sessions
          </h4>

          {past.length === 0
            ? <EmptyState icon={<FaRegClock />} title="No past sessions yet" />
            : past.map(s => <SessionCard key={s.id} s={s} />)
          }
        </div>
      </div>

      {/* FIX: ConfirmModal replaces window.confirm */}
      <ConfirmModal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, id: null })}
        onConfirm={handleCancel}
        title="Cancel Consultation"
        message="Are you sure you want to cancel this consultation? The advisor will be notified."
        confirmLabel="Yes, Cancel"
        danger
      />

      {/* Rating Modal */}
      <Modal
        open={ratingModal.open}
        onClose={() => setRatingModal({ open: false, id: null, rating: 0, review: '' })}
        title="Rate Your Session"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-outline-dark btn-sm" onClick={() => setRatingModal({ open: false, id: null, rating: 0, review: '' })}>Cancel</button>
            <button className="btn btn-accent btn-sm" disabled={!ratingModal.rating} onClick={submitRating}>Submit Rating</button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Your Rating</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <span key={i} onClick={() => setRatingModal(p => ({ ...p, rating: i }))}
                  style={{ fontSize: 28, cursor: 'pointer', color: i <= ratingModal.rating ? '#F59E0B' : '#D1D5DB' }}><FaStar /></span>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Review (optional)</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-light)', borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              placeholder="Share your experience…"
              value={ratingModal.review}
              onChange={e => setRatingModal(p => ({ ...p, review: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

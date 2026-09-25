import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { showToast } from '../../components/common/index';
import { FaCheckCircle } from 'react-icons/fa';
import { FaHandsPraying } from 'react-icons/fa6';
import { GoPlus } from 'react-icons/go';

export default function SessionNotes() {
  const location      = useNavigate();
  const nav           = useNavigate();
  const state         = useLocation().state;
  const consultation  = state?.consultation;

  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const advisorName = consultation?.advisor_name || 'Sarah Al-Mutairi';
  const caseTitle   = consultation?.user_notes   || 'QFC Incorporation';
  const sessionDate = consultation?.scheduled_at
    ? new Date(consultation.scheduled_at).toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })
    : 'March 10';
  const sessionTime = consultation?.scheduled_at
    ? `${new Date(consultation.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} AM — 11:00 AM (60 min)`
    : '10:30 AM — 11:00 AM (60 min)';

  const keyDecisions = consultation?.advisor_notes
    ? consultation.advisor_notes.split('\n').filter(Boolean)
    : [
        'Liability cap clause should reference Art. 68 of Law 11/2015 explicitly',
        'Force majeure clause to use standard QFC Authority template language',
        'Business Description: replace placeholder with "Information Technology Consulting and Software Development Services"',
        'Target Ministry submission date: March 22, 2025',
      ];

  const handleSubmitRating = () => {
    if (!rating) return showToast('Please select a rating', 'error');
    setSubmitted(true);
    showToast('Rating submitted, thank you!');
  };

  return (
    <>
      <AppHeader
        breadcrumb="Session Summary"
        action={
          <button className="ai-thm-btn" onClick={() => nav('/user/book-consultation')}>
            <GoPlus /> <span className='session-title-hd'>Book New Session</span>
          </button>
        }
      />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className='row'>
          <div className='col-lg-12'>
          <h4 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 500, color: '#000', marginBottom: 10 }}>Session Notes</h4>
             <div className='advisor-session-cards mb-3'>
              <div className='d-flex align-items-center gap-3'>
                <span style={{color : "#22C55E"}}><FaCheckCircle size={26} /></span>
              <div>
                <h5 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', color: '#22C55E', marginBottom: 0 }}>
                  Session Completed Successfully
                </h5>
                <p style={{ fontSize: 12, fontWeight: 400, color: '#4A4949',  marginBottom: 0 }}>
                  {advisorName} · {caseTitle} · {sessionDate} · {sessionTime}
                </p>
              </div>
              </div>
            </div>

          </div>


          <div className='col-lg-9 mb-lg-0 mb-3'>
            <div className='advisor-session-cards'>
              <h3 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 500, color: 'var(--text-dark)', marginBottom: 16 }}>
                Session Notes
              </h3>

              <div style={{ background: '#Fff', border: '1px solid #EDEDED', borderRadius: '12px', padding: 16 }}>
                <h4 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 500, color: '#000000', marginBottom: 14 }}>
                  Key Decisions Made
                </h4>
                <ul style={{ listStyleType: 'disc', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {keyDecisions.map((d, i) => (
                    <li key={i} style={{ fontSize: 14, listStyleType: 'disc', fontWeight: 400, color: 'var(--text-dark-3)', lineHeight: 1.6 }}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* RIGHT: Rate Your Session */}
          <div className='col-lg-3'>
          <div style={{background : "#fff", border : "1px solid #EDEDED", padding : "14px 16px", borderRadius : "12px"}}>
              <h3 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 500, color: 'var(--text-dark)', marginBottom: 0 }}>
              Rate Your Session
            </h3>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span ><FaHandsPraying size={40}/></span>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark-3)', marginBottom: 0 }}>Thank you for your feedback!</p>
              </div>
            ) : (
              <>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <button
                      key={i}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 24, 
                        color: i <= (hovered || rating) ? '#F59E0B' : '#D1D5DB',
                        transition: 'color 0.1s',
                      }}
                    >★</button>
                  ))}
                </div>

                {rating > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark-4)', marginBottom: 4 }}>
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                    </div>
                  </div>
                )}

            
                <textarea
                  style={{
                    width: '100%', border: '1px solid #EDEDED',
                    borderRadius: '6px', padding: '10px 12px',
                    fontSize: 14, fontWeight : 400, color: '#A6A5A4',
                    resize: 'none', outline: 'none', marginBottom: 14,
                  }}
                  rows={4}
                  placeholder="Feedback..."
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />

                <button
                  className="ai-thm-btn"
                  style={{ width: '100%' }}
                  onClick={handleSubmitRating}
                >
                  Submit Rating
                </button>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

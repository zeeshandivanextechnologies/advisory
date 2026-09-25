import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaFileAlt, FaUpload, FaUserTie, FaCalendarCheck, FaRocket } from 'react-icons/fa';

const NEXT_STEPS = [
  { icon: <FaFileAlt />,      text: 'Create your first advisory case' },
  { icon: <FaUpload />,       text: 'Upload required documents' },
  { icon: <FaUserTie />,      text: 'Connect with a verified advisor' },
  { icon: <FaCalendarCheck />, text: 'Book your first consultation' },
];

export default function Connect() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const dashPath   = user?.role === 'advisor' ? '/advisor/dashboard' : '/user/dashboard';

  return (
    <div className="onboarding-layout">
      <div className="container-fluid px-0">
        <nav className="onboarding-nav navbar px-5">
        <h4 className="anu-logo-title mb-0">
          AunAdvisory
        </h4>
      </nav>
      </div>

      <div className="onboarding-body">
        <div className="case-step-box" style={{ maxWidth: 560, width: '100%' }}>

          <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color: "#000000" }}>
            You're all set!
          </h2>
          <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>
            Your profile is complete. You can now connect with verified advisors, create cases, and upload documents — all in one place.
          </p>

          <div className="progress-dots" style={{ marginTop: 16, marginBottom: 16 }}>
            <span className="progress-dot" />
            <span className="progress-dot" />
            <span className="progress-dot active" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4A4949', fontFamily: 'var(--font-h)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
              What's next
            </div>
            <div className="row">
              {NEXT_STEPS.map(({ icon, text }) => (
                <div key={text} className="col-lg-6 col-md-6 col-sm-12 mb-3">
                  <div className="nc-option">
                    <div className="nc-option-icon">
                      <span className="case-file-icons">
                        {icon}
                      </span>
                    </div>
                    <div className="nc-option-title">
                      <h5>{text}</h5>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="ai-thm-btn" onClick={() => navigate(dashPath)}>
              <FaRocket /> Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

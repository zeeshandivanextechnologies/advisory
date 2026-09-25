import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiZap, FiLock, FiGlobe, FiClipboard } from 'react-icons/fi';
import { FaArrowRight } from 'react-icons/fa';

const FEATURES = [
  { icon: <FiZap />,       text: 'Expert advisors available now' },
  { icon: <FiLock />,      text: 'Fully secure & confidential' },
  { icon: <FiGlobe />,     text: 'GCC jurisdiction specialists' },
  { icon: <FiClipboard />, text: 'End-to-end case management' },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  return (
    <div className="onboarding-layout">
      <div className="container-fluid px-0">
        <nav className="onboarding-nav navbar px-5">
        <h4 className="anu-logo-title mb-0">
          AunAdvisory
        </h4> 
        <button className="fw-600 fz-16 text-black" onClick={() => navigate('/user/dashboard')}>
          Skip <FaArrowRight />
        </button>
      </nav>
      </div>

      <div className="onboarding-body">
        <div className="case-step-box" style={{ maxWidth: 560, width: '100%' }}>

          {/* Heading */}
          <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color: "#000000" }}>
            Welcome, {user?.full_name?.split(' ')[0]}!
          </h2>
          <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>
            Your account is ready. Let's get you set up so we can match you with the right advisor for your business needs.
          </p>

          {/* Progress dots */}
          <div className="progress-dots" style={{ marginTop: 16, marginBottom: 16 }}>
            <span className="progress-dot active" />
            <span className="progress-dot" />
            <span className="progress-dot" />
          </div>

          {/* Feature cards grid */}
          <div className="row">
            {FEATURES.map(({ icon, text }) => (
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

          {/* CTA Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="ai-thm-btn" onClick={() => navigate('/onboarding/needs')}>
              Get Started <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





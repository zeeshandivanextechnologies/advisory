import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { intakeAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { FaBuilding, FaFileAlt, FaPassport, FaMoneyBillWave, FaCheckCircle, FaTrademark, FaBalanceScale, FaHandshake, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const NEEDS = [
  { icon: <FaBuilding />,    label: 'Start a Business',  desc: 'Company formation & registration in the GCC' },
  { icon: <FaFileAlt />,     label: 'Get a License',     desc: 'Business licensing & trade permits' },
  { icon: <FaPassport />,    label: 'Visa & Residency',  desc: 'Work permits & residency applications' },
  { icon: <FaMoneyBillWave />, label: 'Tax Advisory',    desc: 'VAT, corporate tax & compliance' },
  { icon: <FaCheckCircle />, label: 'Contract Review',   desc: 'Commercial terms review — drafting by licensed counsel' },
  { icon: <FaBalanceScale />, label: 'Compliance',       desc: 'Regulatory & corporate governance' },
  { icon: <FaTrademark />,   label: 'Trademark / IP',    desc: 'Brand protection & IP rights' },
  { icon: <FaHandshake />,   label: 'M&A Advisory',      desc: 'Mergers, acquisitions & due diligence' },
];

export default function Needs() {
  const { platformName } = useSettings();
  const navigate         = useNavigate();
  const [selected, setSelected] = useState([]);

  const toggle = (label) =>
    setSelected(prev =>
      prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
    );

  return (
    <div className="onboarding-layout">
     <div className="container-fluid px-0">
       <nav className="onboarding-nav navbar px-5">
        <h4 className='anu-logo-title mb-0'>
          {platformName}
        </h4>
        <button className="fw-600 fz-16 text-black" onClick={() => navigate('/onboarding/connect')}>
          Skip <FaArrowRight />
        </button>
      </nav>
     </div>

      <div className="onboarding-body">
        <div className="case-step-box" style={{ maxWidth: 620, width: '100%' }}>

          <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color: "#000000" }}>
            What do you need help with?
          </h2>
          <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>
            Select all that apply — we'll personalise your advisory experience
          </p>

          <div className="progress-dots" style={{ marginTop: 16, marginBottom: 16 }}>
            <span className="progress-dot" />
            <span className="progress-dot active" />
            <span className="progress-dot" />
          </div>

          <div className="row">
            {NEEDS.map(({ icon, label, desc }) => (
              <div key={label} className="col-lg-6 col-md-6 col-sm-12 mb-3">
                <div
                  className={`nc-option ${selected.includes(label) ? 'selected' : ''}`}
                  onClick={() => toggle(label)}
                >
                  <div className="nc-option-icon">
                    <span className="case-file-icons">
                      {icon}
                    </span>
                  </div>
                  <div className="nc-option-title">
                    <h5>{label}</h5>
                  </div>
                  <div className="nc-option-desc">
                    <p>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            <button className="ai-thm-btn outline" onClick={() => navigate('/onboarding/welcome')}>
              <FaArrowLeft /> Back
            </button>
            <button
              className="ai-thm-btn"
              onClick={() => {
                // Save in the background; onboarding must never block on it
                intakeAPI.save({ needs: selected }).catch(() => {});
                navigate('/onboarding/connect');
              }}
              disabled={!selected.length}
              style={{ opacity: !selected.length ? 0.5 : 1, cursor: !selected.length ? 'not-allowed' : 'pointer' }}
            >
              Continue ({selected.length} selected) <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

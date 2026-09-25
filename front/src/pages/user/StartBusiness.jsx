import { FiCheck } from 'react-icons/fi';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { showToast } from '../../components/common/index';
import { caseAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import {
  FaBuilding,
  FaFileAlt,
  FaCheckCircle,
  FaStore,
  FaTrademark,
  FaBalanceScale,
  FaPassport,
  FaMoneyBillWave,
  FaArrowLeft,
  FaArrowRight,
  FaPlus
} from "react-icons/fa";

import {
  FaGlobe,
  FaFlask,
  FaShip
} from "react-icons/fa";


const CATEGORIES = [
  { value: 'company_formation', icon: <FaBuilding />,        label: 'Company Incorporation',  desc: 'Register a new entity in Qatar' },
  { value: 'contract_review',   icon: <FaFileAlt />,         label: 'Contract Review',        desc: 'Upload and analyse any commercial agreement.' },
  { value: 'compliance',        icon: <FaCheckCircle />,     label: 'Compliance Check',       desc: 'Full regulatory audit — GTA tax, MADLSA, QFC/MOCI filings.' },
  { value: 'licensing',         icon: <FaStore />,           label: 'Trade Licence Renewal',  desc: 'Renew Qatar trade, commercial, or professional licence.' },
  { value: 'trademark',         icon: <FaTrademark />,       label: 'IP & Trademark',         desc: 'Register and protect IP; enforcement via licensed counsel.' },
  { value: 'other',             icon: <FaBalanceScale />,    label: 'Other Matters',          desc: 'Disputes, property or labour issues — we coordinate licensed counsel.' },
  { value: 'visa',              icon: <FaPassport />,        label: 'Visa & Residency',       desc: 'Residence permits, work visas, and immigration.' },
  { value: 'tax',               icon: <FaMoneyBillWave />,   label: 'Tax Advisory',           desc: 'Corporate tax planning and compliance.' },
];

const JURISDICTIONS = [
  { value: 'qfc',      icon: <FaGlobe />,    label: 'QFC Free Zone',     desc: '100% foreign ownership · 0% corporate tax' },
  { value: 'mainland', icon: <FaBuilding />, label: 'QA Mainland Qatar', desc: 'Qatar partner required (51%) · Wider commercial activities.' },
  { value: 'qstp',     icon: <FaFlask />,    label: 'QSTP Free Zone',    desc: 'Technology & innovation focus · 100% ownership' },
  { value: 'hamad',    icon: <FaShip />,     label: 'Hamad Port FZ',     desc: 'Trade & logistics focus · Import/export operations' },
];

const ENTITY_TYPES        = ['Limited Liability Company', 'Single Person Company', 'Branch Office', 'Representative Office', 'Public Shareholding'];
const BUSINESS_ACTIVITIES = ['IT Consultant', 'Legal Services', 'Trading', 'Manufacturing', 'Financial Services', 'Healthcare', 'Education', 'Real Estate'];
const NATIONALITIES       = ['Qatari', 'Saudi', 'UAE', 'Indian', 'Pakistani', 'British', 'American', 'Other'];
const AREAS               = ['West Bay, Doha', 'The Pearl', 'Al Sadd', 'Al Dafna', 'Al Muntazah', 'Lusail City', 'Al Wakrah'];
const STEPS               = ['Select Type', 'Jurisdiction', 'Details', 'Review'];
const STEP_SUBTITLES      = [
  'Select the category that best describes your matter.',
  'Choose where you want to establish your business.',
  'Tell us about the company and its shareholders.',
  'Check everything before you submit your case.',
];

// "200,000" → 200000; NaN when not a number
const parseAmount = (v) => Number(String(v ?? '').replace(/[,\s]/g, ''));

const emptyShareholder = () => ({
  full_name: '', nationality: 'Qatari', qatar_id: '',
  shareholding: '', building: '', area: '',
});

export default function StartBusiness() {
  const navigate        = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { currency }    = useSettings();

  const [form, setForm] = useState({
    category:          '',
    jurisdiction:      '',
    company_name:      '',
    entity_type:       'Limited Liability Company',
    share_capital:     '200,000',
    business_activity: 'IT Consultant',
    financial_year:    '31 December',
    description:       '',
    shareholders:      [emptyShareholder()],
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const setShareholder = (idx, k, v) => {
    const updated = [...form.shareholders];
    updated[idx] = { ...updated[idx], [k]: v };
    set('shareholders', updated);
  };

  const addShareholder = () => set('shareholders', [...form.shareholders, emptyShareholder()]);
  const removeShareholder = (idx) => set('shareholders', form.shareholders.filter((_, i) => i !== idx));

  // FIX: Validation before each step advance
  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!form.category) { showToast('Please select a business type', 'error'); return false; }
    }
    if (currentStep === 2) {
      if (!form.jurisdiction) { showToast('Please select a jurisdiction', 'error'); return false; }
    }
    if (currentStep === 3) {
      if (!form.company_name?.trim()) { showToast('Company name is required', 'error'); return false; }
      const capital = parseAmount(form.share_capital);
      if (String(form.share_capital).trim() && (!Number.isFinite(capital) || capital <= 0)) {
        showToast('Share capital must be a positive amount', 'error'); return false;
      }
      const invalidShareholder = form.shareholders.find(s => !s.full_name?.trim());
      if (invalidShareholder) { showToast('All shareholders must have a name', 'error'); return false; }
      const badShare = form.shareholders.find(s => {
        const v = parseFloat(s.shareholding);
        return !Number.isFinite(v) || v <= 0 || v > 100;
      });
      if (badShare) { showToast(`Enter a shareholding between 0 and 100% for ${badShare.full_name || 'each shareholder'}`, 'error'); return false; }
      const totalShares = form.shareholders.reduce((sum, s) => sum + (parseFloat(s.shareholding) || 0), 0);
      if (Math.abs(totalShares - 100) > 0.1) {
        showToast(`Shareholding must total 100%. Currently: ${Number(totalShares.toFixed(2))}%`, 'error');
        return false;
      }
    }
    return true;
  };

  const goToStep = (n) => {
    setStep(n);
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    if (validateStep(step)) goToStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const categoryLabel = CATEGORIES.find(c => c.value === form.category)?.label || form.category;
      const payload = {
        title:        `${categoryLabel} — ${form.company_name}`,
        category:     form.category,
        jurisdiction: JURISDICTIONS.find(j => j.value === form.jurisdiction)?.label || form.jurisdiction,
        description:  JSON.stringify({
          company_name:      form.company_name,
          entity_type:       form.entity_type,
          share_capital:     form.share_capital,
          business_activity: form.business_activity,
          financial_year:    form.financial_year,
          description:       form.description,
          shareholders:      form.shareholders,
        }),
        priority: 'medium',
      };
      const res = await caseAPI.create(payload);
      const caseNo = res.data?.data?.case_number;
      showToast(`Case ${caseNo ? `${caseNo} ` : ''}submitted! Upload your documents next.`);
      navigate('/user/dashboard');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit case', 'error');
    } finally {
      setLoading(false);
    }
  };

  const StepBar = () => (
      <div className='case-step-box mb-3'>
  <div className="stepper">
    {STEPS.map((label, i) => {
      const n = i + 1;
      const isDone   = step > n;
      const isActive = step === n;

      return (
        <div key={n} className="step-item">
          
          <div className={`step-circle ${isDone ? 'done' : isActive ? 'active' : 'pending'}`}>
            {isDone ? <FiCheck /> : n}
          </div>

          <span className="step-label">
            {label}
          </span>

          {i < STEPS.length - 1 && <div className="step-line" />}
        </div>
      );
    })}
  </div>
</div>
  );

  return (
    <>
      <AppHeader breadcrumb="Start a business" action={<button className="ai-thm-btn outline" onClick={() => navigate(-1)}>Cancel</button>} />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
         <div className='row mb-3'>
     <div className='col-lg-12'>
       <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 0 }}>{STEPS[step - 1]}</h4>
        <p style={{ fontSize: 14, fontWeight: 400, color: '#4A4949', marginBottom: 0 }}>{STEP_SUBTITLES[step - 1]}</p>
     </div>
    </div>



        <div className='row'>
          <div className='col-lg-9 mb-lg-0 mb-3'>
            <StepBar />

        {step === 1 && (
           <div className='case-step-box'>
              <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color : "#000000" }}>What do you need help with?</h2>
              <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>What type of matter is this?</p>
              {/* <div className='row'>
               {CATEGORIES.map(c => (
                  <div key={c.value} onClick={() => set('category', c.value)} style={{
                    padding: 16, border: `2px solid ${form.category === c.value ? 'var(--lt-black)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all .15s',
                    background: form.category === c.value ? '#F8F8F8' : 'white',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-h)', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dark-4)', lineHeight: 1.5 }}>{c.desc}</div>
                  </div>
                ))}
              </div> */}
              <div className="row">
                  {CATEGORIES.map(c => (
                    <div key={c.value} className="col-lg-6 col-md-12 col-sm-12 mb-3">
                      
                      <div
                        className={`nc-option ${form.category === c.value ? 'selected' : ''}`}
                        onClick={() => set('category', c.value)}
                      >
                        <div className="nc-option-icon">
                          <span className="case-file-icons">
                            {c.icon}
                          </span>
                        </div>

                        <div className="nc-option-title">
                          <h5>{c.label}</h5>
                        </div>

                        <div className="nc-option-desc">
                          <p>{c.desc}</p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="ai-thm-btn" onClick={goNext}>Continue <FaArrowRight /></button>
              </div>
            </div>
        )}


        {/* Step 2 — Jurisdiction */}
        {step === 2 && (
          <div className='case-step-box'>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color : "#000000" }}>Select Jurisdiction</h2>
              <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>Where do you want to establish your business?</p>
              {/* <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {JURISDICTIONS.map(j => (
                  <div key={j.value} onClick={() => set('jurisdiction', j.value)} style={{
                    padding: '16px 20px', border: `2px solid ${form.jurisdiction === j.value ? 'var(--lt-black)' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all .15s', display: 'flex', gap: 16, alignItems: 'center',
                    background: form.jurisdiction === j.value ? '#F8F8F8' : 'white',
                  }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${form.jurisdiction === j.value ? 'var(--lt-black)' : '#D1D5DB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {form.jurisdiction === j.value && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lt-black)' }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', marginBottom: 2 }}>{j.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{j.desc}</div>
                    </div>
                  </div>
                ))}
              </div> */}

              <div className="row">
                  {JURISDICTIONS.map(j => (
                    <div key={j.value} className="col-lg-6 col-md-12 col-sm-12 mb-3">
                      
                      <div
                        className={`nc-option ${form.jurisdiction === j.value ? 'selected' : ''}`}
                        onClick={() => set('jurisdiction', j.value)}
                      >
                        <div className="nc-option-icon">
                          <span className="case-file-icons">
                            <svg width="0" height="0">
                              <linearGradient id={`iconGradient-${j.value}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7F8C8D" />
                                <stop offset="50%" stopColor="#BDC3C7" />
                                <stop offset="75%" stopColor="#FFFFFF" />
                                <stop offset="100%" stopColor="#7F8C8D" />
                              </linearGradient>
                            </svg>

                            {j.icon ? (
                              <span style={{ fill: `url(#iconGradient-${j.value})` }}>
                                {j.icon}
                              </span>
                            ) : null}
                          </span>
                        </div>

                        <div className="nc-option-title">
                          <h5>{j.label}</h5>
                        </div>

                        <div className="nc-option-desc">
                          <p>{j.desc}</p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button className="ai-thm-btn outline" onClick={() => goToStep(1)}><FaArrowLeft />  Back</button>
                <button className="ai-thm-btn" onClick={goNext}>Continue <FaArrowRight /></button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Details */}
        {step === 3 && (
          <div className='case-step-box'>
            <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color : "#000000" }}>Client  Details</h2>
            <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>Fields marked * are required. Shareholdings must add up to 100%.</p>

            <h5 style={{ fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 15, color : "#000000" }}>Company Information</h5>

            <div className='advisor-business-form-box'>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. ACME Trading LLC" required />
              </div>
              <div className="form-group">
                <label className="form-label">Entity Type</label>
                <select className="form-select" value={form.entity_type} onChange={e => set('entity_type', e.target.value)}>
                  {ENTITY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Share Capital ({currency})</label>
                <input className="form-input" value={form.share_capital} onChange={e => set('share_capital', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Business Activity</label>
                <select className="form-select" value={form.business_activity} onChange={e => set('business_activity', e.target.value)}>
                  {BUSINESS_ACTIVITIES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className='d-flex align-items-center justify-content-between'>
              <h3 style={{ fontSize: 16, color : "#000000", fontWeight: 600, fontFamily: 'var(--font-h)', marginBottom: 0 }}>Shareholders</h3>
            <button className="holder-btn" onClick={addShareholder} style={{ marginBottom: 20 }}><FaPlus /> Add Shareholder</button>
            </div>
            {form.shareholders.map((s, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Shareholder {idx + 1}</span>
                  {form.shareholders.length > 1 && (
                    <button onClick={() => removeShareholder(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                  )}
                </div>
                <div className='Shareholder-form-box'>
                  <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={s.full_name} onChange={e => setShareholder(idx, 'full_name', e.target.value)} /></div>
                  <div className="form-group"><label className="form-label">Nationality</label><select className="form-select" value={s.nationality} onChange={e => setShareholder(idx, 'nationality', e.target.value)}>{NATIONALITIES.map(n => <option key={n}>{n}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Shareholding % *</label><input className="form-input" type="number" min="0" max="100" value={s.shareholding} onChange={e => setShareholder(idx, 'shareholding', e.target.value)} /></div>
                </div>
              </div>
            ))}
            

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Any additional requirements or context…" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button className="ai-thm-btn outline" onClick={() => goToStep(2)}><FaArrowLeft /> Back</button>
              <button className="ai-thm-btn" onClick={goNext}>Review <FaArrowRight /></button>
            </div>
          </div>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <div className='case-step-box'>
            <h2 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', marginBottom: 0, color : "#000000" }}>Review & Submit</h2>
            <div className='mb-3'>
              {[
                ['Business Type', CATEGORIES.find(c => c.value === form.category)?.label],
                ['Jurisdiction',  JURISDICTIONS.find(j => j.value === form.jurisdiction)?.label],
                ['Company Name',  form.company_name],
                ['Entity Type',   form.entity_type],
                ['Share Capital', form.share_capital ? `${currency} ${form.share_capital}` : ''],
                ['Business Activity', form.business_activity],
                ['Shareholders',  form.shareholders.filter(s => s.full_name).map(s => `${s.full_name} (${s.nationality}, ${s.shareholding || 0}%)`).join(', ')],
                ['Additional Notes', form.description],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent : "space-between", padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#000' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-dark)' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="ai-thm-btn outline" onClick={() => goToStep(3)}> <FaArrowLeft /> Back</button>
              {/* FIX: Button label matches the actual action */}
              <button className="ai-thm-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Case'}
              </button>
            </div>
          </div>
        )}
      </div>

       <div className='col-lg-3'>
             <div className='case-step-box'>
              <h4 style={{ fontSize: 18, fontWeight : 400, color : "#000", fontFamily: 'var(--font-h)', marginBottom: 10 }}>Why these categories?</h4>
              <p style={{ fontSize: 14, fontWeight : 400, color: '#4A4949', lineHeight: 1.7 }}>
                Each category loads a tailored workflow — the right documents, checklist, regulatory references, and professional escalation path for Qatar jurisdiction.
              </p>
            </div>

          </div>

        </div>


      

      </div>
    </>
  );
}

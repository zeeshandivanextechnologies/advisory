import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, showToast } from '../../components/common/index';
import { intakeAPI } from '../../services/api';

const STAGES    = ['Idea / exploring', 'Early-stage startup', 'Operating in home market', 'Expanding internationally', 'Established group'];
const CAPITAL   = ['Under $50k', '$50k – $250k', '$250k – $1M', '$1M – $5M', 'Over $5M'];
const DOCUMENTS = ['Not yet', 'Some documents ready', 'Most documents ready', 'All documents ready'];
const TIMELINES = ['Within 1 month', '1–3 months', '3–6 months', '6–12 months', 'Just exploring'];

const FIELDS = [
  { k: 'industry',          label: 'Industry *',                      type: 'text', ph: 'e.g. Fintech, Logistics, Healthcare' },
  { k: 'country_of_origin', label: 'Country of origin *',             type: 'text', ph: 'Where is your company based today?' },
  { k: 'target_market',     label: 'Target market',                   type: 'text', ph: 'e.g. Qatar, UAE, KSA' },
  { k: 'business_stage',    label: 'Business stage *',                options: STAGES },
  { k: 'capital_range',     label: 'Capital available for the move *', options: CAPITAL },
  { k: 'documents_ready',   label: 'Company documents',               options: DOCUMENTS },
  { k: 'timeline',          label: 'Timeline *',                      options: TIMELINES },
];
const REQUIRED = ['industry', 'country_of_origin', 'business_stage', 'capital_range', 'timeline', 'main_question'];

// Step 3 of the client journey: pre-call intake, completed before the discovery call
export default function Intake() {
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    intakeAPI.get()
      .then(r => { const d = r.data.data || {}; setForm(d); setSavedAt(d.updated_at || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    const missing = REQUIRED.filter(k => !String(form[k] || '').trim());
    if (missing.length) return showToast('Please fill in all required fields', 'error');
    setSaving(true);
    try {
      const payload = Object.fromEntries([...FIELDS.map(f => f.k), 'main_question'].map(k => [k, form[k] || '']));
      const r = await intakeAPI.save(payload);
      setSavedAt(r.data.data?.updated_at || new Date().toISOString());
      showToast('Thank you — your intake is saved for the discovery call');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <><AppHeader breadcrumb="Intake Form" /><Spinner /></>;

  return (
    <>
      <AppHeader breadcrumb="Intake Form" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Pre-call Intake</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>
              About 5 minutes. Please complete it within 48 hours of booking so your discovery call is focused.
            </p>
          </div>
        </div>

        <div className="case-step-box">
          {savedAt && <p style={{ fontSize: 12, color: 'var(--green)' }}>Last saved {new Date(savedAt).toLocaleString('en-GB')}</p>}
          <div className="advisor-business-form-box">
            {FIELDS.map(f => (
              <div className="form-group" key={f.k}>
                <label className="form-label">{f.label}</label>
                {f.options ? (
                  <select className="form-select" value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="form-input" placeholder={f.ph} value={form[f.k] || ''} onChange={e => set(f.k, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Your main question for the call *</label>
            <textarea className="form-input" style={{ height: 100, resize: 'vertical' }} placeholder="What decision do you need to make, and what is blocking it?"
              value={form.main_question || ''} onChange={e => set('main_question', e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="ai-thm-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Intake'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

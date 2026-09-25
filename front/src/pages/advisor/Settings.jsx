import { FiCheck } from 'react-icons/fi';
import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { showToast, Spinner } from '../../components/common/index';
import { advisorAPI, userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

const SPECIALIZATIONS = [
  'Corporate Law', 'Tax Advisory', 'Business Licensing',
  'Visa & Residency', 'Contract Review', 'Trademark / IP',
  'Compliance', 'M&A Advisory', 'Real Estate', 'Employment Law',
];

export default function AdvisorSettings() {
  const { user, updateUser } = useAuth();
  const { currency }         = useSettings();
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);

  const [profile, setProfile] = useState({ full_name: '', phone: '', country: '' });
  const [advisor, setAdvisor] = useState({
    bio: '', hourly_rate: '', experience_yrs: '', specializations: [],
  });

  // FIX: Load existing advisor data on mount — was always showing blank form
  useEffect(() => {
    Promise.all([userAPI.getProfile(), advisorAPI.getProfile()])
      .then(([pRes, aRes]) => {
        const p = pRes.data.data;
        const a = aRes.data.data;
        setProfile({
          full_name: p?.full_name || user?.full_name || '',
          phone:     p?.phone     || user?.phone     || '',
          country:   p?.country   || user?.country   || '',
        });
        setAdvisor({
          bio:             a?.bio             || '',
          hourly_rate:     a?.hourly_rate     || '',
          experience_yrs:  a?.experience_yrs  || '',
          specializations: Array.isArray(a?.specializations)
            ? a.specializations
            : (typeof a?.specializations === 'string' ? JSON.parse(a.specializations || '[]') : []),
        });
      })
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, [user]);

  const setP = (k, v) => setProfile(prev => ({ ...prev, [k]: v }));
  const setA = (k, v) => setAdvisor(prev => ({ ...prev, [k]: v }));

  const toggleSpec = (spec) => {
    setAdvisor(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const saveAll = async (e) => {
    e.preventDefault();
    if (!profile.full_name?.trim()) return showToast('Full name is required', 'error');
    setSaving(true);
    try {
      await userAPI.updateProfile(profile);
      await advisorAPI.updateProfile(advisor);
      updateUser(profile);
      showToast('Settings saved successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <><AppHeader breadcrumb="Settings" /><Spinner /></>;

  return (
    <>
      <AppHeader breadcrumb="Settings" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div style={{flex : 1}}>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Advisor Settings</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>Manage your profile and advisory preferences</p>
          </div>
          <button className="ai-thm-btn" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>

        <div className='advisor-setting'>
          {/* Personal Info */}
          <div className="advisor-legal-cards">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Personal Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { k: 'full_name', label: 'Full Name *', type: 'text',  ph: 'Your full name' },
                { k: 'phone',     label: 'Phone',       type: 'tel',   ph: '+974 5555 0000' },
                { k: 'country',   label: 'Country',     type: 'text',  ph: 'Qatar' },
              ].map(({ k, label, type, ph }) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{label}</label>
                  <input type={type} className="form-input" placeholder={ph} value={profile[k]} onChange={e => setP(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Advisor Profile */}
          <div className="advisor-legal-cards">
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 20 }}>Advisor Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Bio</label>
                <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={advisor.bio} onChange={e => setA('bio', e.target.value)} placeholder="Brief professional description…" />
              </div>
              <div className='advisor-recent-case-box mb-0'>
                <div className="form-group">
                  <label className="form-label">Hourly Rate ({currency})</label>
                  <input type="number" className="form-input" value={advisor.hourly_rate} onChange={e => setA('hourly_rate', e.target.value)} placeholder="250" />
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <input type="number" className="form-input" value={advisor.experience_yrs} onChange={e => setA('experience_yrs', e.target.value)} placeholder="5" />
                </div>
              </div>
            </div>
          </div>

          {/* Specializations */}
          <div className="advisor-legal-cards" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, marginBottom: 16 }}>Specializations</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALIZATIONS.map(spec => {
                const active = advisor.specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpec(spec)}
                    style={{
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20,
                      border: `1.5px solid ${active ? 'var(--lt-black)' : 'var(--border-light)'}`,
                      background: active ? 'var(--lt-black)' : 'white',
                      color: active ? 'white' : 'var(--text-dark)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {active ? <FiCheck style={{ marginRight: 4, verticalAlign: '-2px' }} /> : null}{spec}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, showToast } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { subscriptionAPI } from '../../services/api';

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [plans,    setPlans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [newPlan, setNewPlan]   = useState({ name: '', price: '', currency: 'QAR', duration_days: 30, description: '', features: '' });
  const [planSaving, setPlanSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      adminAPI.getSettings(),
      subscriptionAPI.adminGetPlans(),
    ])
      .then(([s, p]) => {
        const sd = s.data.data || {};
        setSettings(sd);
        setPlans(p.data.data || []);
        // Prefill new plan currency from settings
        setNewPlan(prev => ({ ...prev, currency: sd.default_currency || 'QAR' }));
      })
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      showToast('Settings saved successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings', 'error');
    } finally { setSaving(false); }
  };

  const savePlan = async () => {
    if (!newPlan.name || !newPlan.price) return showToast('Name and price are required', 'error');
    setPlanSaving(true);
    try {
      const features = newPlan.features.split('\n').map(f => f.trim()).filter(Boolean);
      await subscriptionAPI.adminCreatePlan({ ...newPlan, features });
      const p = await subscriptionAPI.adminGetPlans();
      setPlans(p.data.data || []);
      setNewPlan({ name: '', price: '', currency: 'QAR', duration_days: 30, description: '', features: '' });
      showToast('Plan created successfully');
    } catch { showToast('Failed to create plan', 'error'); }
    finally { setPlanSaving(false); }
  };

  const togglePlan = async (plan) => {
    try {
      await subscriptionAPI.adminUpdatePlan(plan.id, { is_active: plan.is_active ? 0 : 1 });
      setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: p.is_active ? 0 : 1 } : p));
      showToast(`Plan ${plan.is_active ? 'deactivated' : 'activated'}`);
    } catch { showToast('Failed to update plan', 'error'); }
  };

  if (loading) return <><AppHeader breadcrumb="Settings" badge="SUPER ADMIN" /><Spinner /></>;

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'contact', label: 'Contact Info' },
    { id: 'payment', label: 'Payment Gateway' },
    { id: 'plans',   label: 'Subscription Plans' },
    { id: 'access',  label: 'Access Control' },
  ];

  // const TabBtn = ({ id, label }) => (
  //   <button onClick={() => setActiveTab(id)} style={{
  //     padding: '8px 16px', fontSize: 13, fontWeight: 600,
  //     background: activeTab === id ? 'var(--lt-black)' : 'white',
  //     color: activeTab === id ? 'white' : 'var(--text-dark)',
  //     border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
  //     cursor: 'pointer', transition: 'all .15s',
  //   }}>{label}</button>
  // );

  const TabBtn = ({ id, label, className = '' }) => (
  <div className=''>
    <button
    onClick={() => setActiveTab(id)}
    className={`nav-link filter-nav-btn  ${className} ${activeTab === id ? 'active' : ''}`}
    style={{
      border: '1px solid var(--border-light)',
    }}
  >
    {label}
  </button>
  </div>
);

  return (
    <>
      <AppHeader breadcrumb="Settings" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }} >Platform Settings</h4>
            <p style={{ fontSize: 14, color: '#4A4949', fontFamily: 'var(--font-h)', fontWeight: 400,  marginBottom : 0 }} >Manage global configuration for AunAdvisory</p>
          </div>
          {activeTab !== 'plans' && (
            <button className="thm-btn" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        </div>

        {/* <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(t => <TabBtn key={t.id} id={t.id} label={t.label} />)}
        </div> */}

        <div className='case-search-box mb-3'>
          <div className="filter-tabs">
  <div className="nav nav-pills gap-2">
    {TABS.map(t => (
      <TabBtn
        key={t.id}
        id={t.id}
        label={t.label}
      />
    ))}
  </div>
</div>

        </div>


        {/* GENERAL */}
        {activeTab === 'general' && (
          <div className='advisor-admin-general-tab'>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 10, color : "#000" }}>General</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'platform_name',    label: 'Platform Name',            type: 'text' },
                  { key: 'platform_email',   label: 'Contact Email',            type: 'email' },
                  { key: 'default_currency', label: 'Default Currency',         type: 'text' },
                  { key: 'consultation_fee', label: 'Default Consultation Fee', type: 'number' },
                ].map(({ key, label, type }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input" value={settings[key] || ''} onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 10, color : "#000" }}>Platform Info</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Version',      value: settings.app_version || 'v1.0.0' },
                  { label: 'Database',     value: 'MySQL 8.0' },
                  { label: 'Jitsi Domain', value: settings.jitsi_domain || 'meet.jit.si' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-dark-4)', fontFamily: 'var(--font-h)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span className="badge badge-gray">{value}</span>
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: 20 }}>
                <label className="form-label">Jitsi Domain</label>
                <input type="text" className="form-input" value={settings.jitsi_domain || 'meet.jit.si'} onChange={e => set('jitsi_domain', e.target.value)} placeholder="meet.jit.si" />
              </div>
            </div>
          </div>
        )}

        {/* CONTACT INFO */}
        {activeTab === 'contact' && (
          <div className='advisor-admin-general-tab'>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 5, color : "#000" }}>Public Contact Info</h3>
              <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10, lineHeight: 1.6 }}>
                These values appear on the Contact page and public-facing sections of the site.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'platform_email',   label: 'General Contact Email', type: 'email', ph: 'hello@aunadvisory.com' },
                  { key: 'contact_phone',    label: 'Phone Number',           type: 'text',  ph: '+974 4400 0000' },
                  { key: 'contact_address',  label: 'Office Address',         type: 'text',  ph: 'Qatar Financial Centre, Doha, Qatar' },
                  { key: 'office_hours',     label: 'Office Hours',           type: 'text',  ph: 'Sun–Thu: 8:00 AM – 6:00 PM AST' },
                ].map(({ key, label, type, ph }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input" placeholder={ph} value={settings[key] || ''} onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 5, color : "#000" }}>Legal Emails</h3>
              <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10, lineHeight: 1.6 }}>
                These emails appear in Terms of Service and Privacy Policy pages.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'legal_email',   label: 'Legal / Terms Email',   type: 'email', ph: 'legal@aunadvisory.com' },
                  { key: 'privacy_email', label: 'Privacy Policy Email',  type: 'email', ph: 'privacy@aunadvisory.com' },
                ].map(({ key, label, type, ph }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input" placeholder={ph} value={settings[key] || ''} onChange={e => set(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT GATEWAY */}
        {activeTab === 'payment' && (
          <div className='advisor-admin-general-tab'>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 5, color : "#000" }}>Gateway Selection</h3>
              <div className="form-group" >
                <label className="form-label">Active Payment Gateway</label>
                <select className="form-select" value={settings.payment_gateway || 'manual'} onChange={e => set('payment_gateway', e.target.value)}>
                  <option value="manual">Manual / No Gateway (Dev Mode)</option>
                  <option value="stripe">Stripe</option>
                  <option value="tap">Tap Payments (Qatar / GCC)</option>
                </select>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#4A4949', marginTop: 0, marginBottom: 0 }}>
                  Manual mode: payments are auto-approved (development only)
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Test Mode
                  <label className="toggle">
                    <input type="checkbox" checked={settings.gateway_test_mode === '1'} onChange={e => set('gateway_test_mode', e.target.checked ? '1' : '0')} />
                    <span className="toggle-slider" />
                  </label>
                </label>
              </div>
            </div>

            {/* FIX: Only show PUBLISHABLE keys — secret keys are env vars, not DB settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="advisor-legal-cards" style={{ opacity: settings.payment_gateway === 'stripe' ? 1 : 0.5 }}>
                <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 5, color : "#000" }}>
                  Stripe
                  {settings.payment_gateway === 'stripe' && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 4 }}>Active</span>}
                </h3>
                <div className="form-group">
                  <label className="form-label">Publishable Key</label>
                  <input type="text" className="form-input" value={settings.stripe_publishable_key || ''} onChange={e => set('stripe_publishable_key', e.target.value)} placeholder="pk_test_..." />
                </div>
                {/* FIX: Secret key is NOT managed here — it's a server-side env var */}
                <p style={{ fontSize: 14, fontWeight: 500, color: '#4A4949', padding: '0px 0', borderTop: '1px solid var(--border-light)', marginTop: 8 }}>
                  🔒 Secret key is configured via the <code>STRIPE_SECRET_KEY</code> environment variable on the server — not stored here.
                </p>
              </div>

              <div className="advisor-legal-cards" style={{ opacity: settings.payment_gateway === 'tap' ? 1 : 0.5 }}>
                <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 5, color : "#000" }}>
                  Tap Payments
                  {settings.payment_gateway === 'tap' && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981', background: '#D1FAE5', padding: '2px 8px', borderRadius: 4 }}>Active</span>}
                </h3>
                <div className="form-group">
                  <label className="form-label">Publishable Key</label>
                  <input type="text" className="form-input" value={settings.tap_publishable_key || ''} onChange={e => set('tap_publishable_key', e.target.value)} placeholder="pk_test_..." />
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#4A4949', padding: '0px 0', borderTop: '1px solid var(--border-light)', marginTop: 10 }}>
                  🔒 Secret key is configured via the <code>TAP_SECRET_KEY</code> environment variable on the server — not stored here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUBSCRIPTION PLANS */}
        {activeTab === 'plans' && (
          <div className='advisor-admin-general-tab'>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 10, color : "#000" }}>Existing Plans</h3>
              {plans.length === 0 ? <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>No plans yet.</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plans.map(plan => (
                    <div key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div>
                        <h5 style={{ fontSize: 14, fontWeight: 600, color: "#000", textTransform: 'capitalize' , marginBottom : 0 }}>{plan.name}</h5>
                        <p style={{ fontSize: 12, fontWeight: 500,  color: '#4A4949' , marginBottom : 0 }}>{plan.currency} {plan.price} / {plan.duration_days} days</p>
                      </div>
                      <button
                        className={`ai-thm-btn ${plan.is_active ? 'ai-thm-btn outline' : 'ai-thm-btn'}`}
                        onClick={() => togglePlan(plan)}
                      >
                        {plan.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 10, color : "#000" }}>Create New Plan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { k: 'name',         label: 'Plan Name *',      type: 'text',   ph: 'e.g. Professional' },
                  { k: 'price',        label: 'Price *',          type: 'number', ph: '250' },
                  { k: 'currency',     label: 'Currency',         type: 'text',   ph: 'QAR' },
                  { k: 'duration_days',label: 'Duration (days)',  type: 'number', ph: '30' },
                  { k: 'description',  label: 'Description',      type: 'text',   ph: 'Short plan description' },
                ].map(({ k, label, type, ph }) => (
                  <div className="form-group" key={k}>
                    <label className="form-label">{label}</label>
                    <input type={type} className="form-input" placeholder={ph} value={newPlan[k]} onChange={e => setNewPlan(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Features (one per line)</label>
                  <textarea className="form-input" style={{ height: 100, resize: 'vertical' }} value={newPlan.features} onChange={e => setNewPlan(p => ({ ...p, features: e.target.value }))} placeholder={"Unlimited cases\nPriority support\nBook consultations"} />
                </div>
                <button className="ai-thm-btn" onClick={savePlan} disabled={planSaving}>
                  {planSaving ? 'Creating…' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACCESS CONTROL */}
        {activeTab === 'access' && (
          <div style={{display : "grid", gridTemplateColumns : "1fr"}}>
            <div className="advisor-legal-cards">
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 10, color : "#000" }}>Registration & Access</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { key: 'allow_registration', label: 'Allow New Registrations', desc: 'When disabled, new users cannot sign up' },
                  { key: 'maintenance_mode',   label: 'Maintenance Mode',        desc: 'Blocks all API access except /auth and /health' },
                ].map(({ key, label, desc }) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color : "#000" }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 400, color: '#4A4949', marginTop: 2 }}>{desc}</div>
                    </div>
                    <label className="toggle">
                      <input type="checkbox" checked={settings[key] === '1'} onChange={e => set(key, e.target.checked ? '1' : '0')} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

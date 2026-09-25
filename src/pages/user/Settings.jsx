import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { showToast, Modal, Spinner } from '../../components/common/index';
import { userAPI, authAPI } from '../../services/api';
import { subscriptionAPI, paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { FaPlus } from 'react-icons/fa';

const NOTIF_PREFS = [
  { key: 'session_reminders',    label: 'Session reminders',             desc: '30 minutes before each session' },
  { key: 'compliance_reminders', label: 'Compliance Deadline Reminders', desc: 'Alerts 7 days, 3 days, and 24 hours before any compliance deadline' },
  { key: 'document_updates',     label: 'Document review updates',       desc: 'When consultant reviews your docs' },
  { key: 'billing_notifs',       label: 'Billing notifications',         desc: 'Receipts and renewal reminders' },
  { key: 'consultant_messages',  label: 'Consultant messages',           desc: 'New notes or messages' },
];

/* ── Profile Tab ──────────────────────────────────────────── */
function ProfileTab() {
  const { user, updateUser } = useAuth();
  const [form, setForm]       = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '' });
  const [pwd, setPwd]         = useState({ current: '', newPwd: '', confirm: '' });
  const [showPwd, setShowPwd] = useState({ c: false, n: false, co: false });
  const [saving, setSaving]   = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const initials = (form.full_name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const saveProfile = async () => {
    if (!form.full_name?.trim()) return showToast('Full name is required', 'error');
    setSaving(true);
    try {
      await userAPI.updateProfile({ full_name: form.full_name, phone: form.phone });
      updateUser({ full_name: form.full_name, phone: form.phone });
      showToast('Profile updated successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally { setSaving(false); }
  };

  const updatePassword = async () => {
    if (!pwd.current)             return showToast('Current password is required', 'error');
    if (!pwd.newPwd)              return showToast('New password is required', 'error');
    if (pwd.newPwd.length < 8)    return showToast('New password must be at least 8 characters', 'error');
    if (pwd.newPwd !== pwd.confirm) return showToast('Passwords do not match', 'error');
    setPwdSaving(true);
    try {
      await authAPI.changePassword({ current_password: pwd.current, new_password: pwd.newPwd });
      showToast('Password updated successfully');
      setPwd({ current: '', newPwd: '', confirm: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password', 'error');
    } finally { setPwdSaving(false); }
  };

  return (
    <div className='row'>
      {/* Profile Card */}
      <div className='col-lg-6 mb-lg-0 mb-3'>
      <div className='advisor-legal-cards'>
          <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 20 }}>Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div  style={{
    width: 52,
    height: 52,
    lineHeight : "52px",
    borderRadius: '50%',
    background: 'linear-gradient(95.67deg, #7F8C8D 2.81%, #BDC3C7 38.41%, #DEE1E3 50.72%, #7F8C8D 94.23%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-dark)',
  }}>
            {initials}
          </div>
          <div>
            <h5 style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000000', marginBottom : 0 }}>{form.full_name}</h5>
            <p style={{ fontSize: 12, fontWeight: 400, color: '#4A4949', marginBottom : 0 }}>
              {user?.plan === 'pro' ? 'Pro Plan' : user?.plan === 'enterprise' ? 'Enterprise Plan' : 'Free Plan'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={form.email} disabled style={{ background: '#F9FAFB', color: 'var(--text-dark-4)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+974 5555 0000" />
          </div>
          <button className="thm-btn" onClick={saveProfile} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      </div>

      {/* Security Card */}
      <div className='col-lg-6'>
        <div className='advisor-legal-cards h-100'>

        
        <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 20 }}>Security</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { k: 'current', label: 'Current Password', sk: 'c' },
            { k: 'newPwd',  label: 'New Password',     sk: 'n' },
            { k: 'confirm', label: 'Confirm Password', sk: 'co' },
          ].map(({ k, label, sk }) => (
            <div className="form-group" key={k}>
              <label className="form-label">{label}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd[sk] ? 'text' : 'password'}
                  className="form-input"
                  value={pwd[k]}
                  onChange={e => setPwd(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={k === 'current' ? '••••••••' : `Enter ${label.toLowerCase()}`}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => ({ ...p, [sk]: !p[sk] }))}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark-4)', fontSize: 16 }}
                >
                  {showPwd[sk] ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          ))}
          <button className="thm-btn" onClick={updatePassword} disabled={pwdSaving}>
            {pwdSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ── Plan & Billing Tab — FIX: fetches real data from API ─── */
function PlanTab() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency } = useSettings();

  // FIX: All data fetched from API — no more hardcoded arrays
  const [plans,          setPlans]          = useState([]);
  const [mySub,          setMySub]          = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [addCardModal,   setAddCardModal]   = useState(false);
  const [cardForm,       setCardForm]       = useState({ number: '', expiry: '', cvv: '', name: '' });

  useEffect(() => {
    Promise.all([
      subscriptionAPI.getPlans(),
      subscriptionAPI.getMyPlan(),
      paymentAPI.list(),
    ])
      .then(([p, s, pay]) => {
        setPlans(p.data.data || []);
        setMySub(s.data.data || null);
        setBillingHistory(pay.data.data || []);
      })
      .catch(() => showToast('Failed to load billing data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const setC = (k, v) => setCardForm(p => ({ ...p, [k]: v }));

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Current Subscription */}
      <div style={{ background: 'white', border: '0.9px solid #EDEDED', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: "0px 2px 6px 0px #0000000A,  0px 6px 20px 0px #0000000F", }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h4 style={{ fontSize: 18, fontWeight: 500, fontFamily: 'var(--font-h)', color: '#000000', textTransform: 'capitalize', marginBottom : 0, }}>
              {mySub ? mySub.plan_name : (user?.plan || 'Free')} Plan
            </h4>
            <span style={{ fontSize: 12, fontWeight: 400, padding: '3px 6px', background: mySub ? '#22C55E1F' : '#F1F5F9', color: mySub ? '#22C55E' : '#64748B', borderRadius: 4 }}>
              {mySub ? 'Active' : 'Free'}
            </span>
          </div>
          {mySub ? (
            <div style={{ fontSize: 12, color: '#4A4949', fontWeight : 400 }}>
              Expires: {new Date(mySub.expires_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>Upgrade to unlock more features</div>
          )}
        </div>
        <button className="thm-btn" onClick={() => navigate('/user/plans')}>
          {mySub ? 'Change Plan' : 'Upgrade Now'}
        </button>
      </div>

      {/* Compare Plans — FIX: from API, not hardcoded */}
      <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Available Plans</h3>
      <div className='row'>
        {plans.map(plan => {
          const isCurrent = user?.plan?.toLowerCase() === plan.name?.toLowerCase();
          const features  = typeof plan.features === 'string' ? JSON.parse(plan.features || '[]') : (plan.features || []);
          return (
            <div className='col-lg-4 col-md-6 col-sm-12 mb-3'>
              <div key={plan.id} style={{ border: `1px solid ${isCurrent ? 'var(--lt-black)' : 'var(--border-light)'}`, borderRadius: '12px', padding: '16px', background: 'white', position: 'relative', height : '100%', boxShadow : '0px 2px 6px 0px #0000000A , 0px 6px 20px 0px #0000000F' }}>
              {isCurrent && (
                <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: 'var(--lt-black)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  Current
                </div>
              )}
              <div style={{ fontSize: 20, fontWeight: 500, color : "#4A4949", fontFamily: 'var(--font-h)', textTransform: 'capitalize', marginBottom: 0 }}>{plan.name}</div>
              <div style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 10 }}>
                {plan.price === 0 ? 'Free' : `${plan.currency || currency} ${Number(plan.price).toLocaleString()}`}
                {plan.price > 0 && <span style={{ fontSize: 18, fontWeight: 400, color: '#A6A5A4' }}>/mo</span>}
              </div>
              <button
  onClick={() => navigate('/user/plans')}
  className={
    isCurrent
      ? 'lg-bg-btn'
      : plan.price === 0
      ? 'lg-bg-btn'
      : 'thm-btn'
  }
  style={{
    width: '100%',
    marginBottom: 14,
    padding : "10px 16px"
  }}
>
  {isCurrent
    ? 'Current Plan'
    : plan.price === 0
    ? 'Downgrade'
    : 'Upgrade to pro'}
</button>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, margin: 0, listStyle: 'none' }}>
                {features.slice(0, 4).map((f, i) => (
                  <li key={i} style={{ fontSize: 14, color: 'var(--text-dark-3)', display: 'flex', alignItems: 'flex-start', gap: 6, fontWeight: 400  }}>
                    <span style={{fontSize: 14, color: '#000', flexShrink: 0, fontWeight: 700 }}>·</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            </div>
          );
        })}

      </div>

      {/* Payment Method placeholder */}
      <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 14 }}>Payment Method</h3>
      <div style={{ background: '#Ffff', border: '0.9px solid #EDEDED', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow : '0px 2px 6px 0px #0000000A , 0px 6px 20px 0px #0000000F' }}>
        <span style={{ fontSize: 14, color: '#4A4949', fontWeight : 400 }}>No payment method saved. Payment is handled at checkout.</span>

        <button
          onClick={() => setAddCardModal(true)}
          className='lg-bg-btn'
        >
          <FaPlus />  <span className='mobile-ai-secure-title '>Add Card</span>
        </button>
        
      </div>

      {/* Billing History — FIX: fetched from /payments API */}
      <h3 style={{ fontSize: 14, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 14 }}>Billing History</h3>
      <div >
        {billingHistory.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-dark-4)', fontSize: 13 }}>
            No payment history yet.
          </div>
        ) : (
          <div className='ai-table-section'>
           <div className='table-responsive'>
             <table className='table billing-table align-middle mb-0'>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Description', 'Date', 'Amount', 'Status'].map(h => (
                  <th key={h} >{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((b, i) => (
                <tr key={b.id || i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td >
                    <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-dark)' }}>{b.description || 'Payment'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>{b.invoice_no}</div>
                  </td>
                  <td >
                    {b.paid_at ? new Date(b.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td >
                    {b.currency || currency} {Number(b.amount).toLocaleString()}
                  </td>
                  <td >
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                      background: b.status === 'completed' ? '#D1FAE5' : b.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                      color:      b.status === 'completed' ? '#065F46' : b.status === 'pending' ? '#92400E' : '#991B1B',
                    }}>
                      {b.status?.charAt(0).toUpperCase() + b.status?.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
           </div>

          </div>
          
        )}
      </div>

      {/* Add Card Modal */}
      <Modal
        open={addCardModal}
        onClose={() => setAddCardModal(false)}
        title="Add Payment Method"
        footer={
          <>
            <button className="ai-thm-btn outline" onClick={() => setAddCardModal(false)}>Cancel</button>
            <button className="ai-thm-btn" onClick={() => { showToast('Card payment is processed at checkout via the secure gateway'); setAddCardModal(false); }}>
              Understood
            </button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-dark-4)', lineHeight: 1.7 }}>
          Payment cards are securely handled by our payment gateway at the time of checkout. Your card details are never stored on our servers.
        </p>
      </Modal>

    </div>
  );
}

/* ── Notification Tab ─────────────────────────────────────── */
function NotificationTab() {
  const [prefs, setPrefs] = useState(
    Object.fromEntries(NOTIF_PREFS.map(p => [p.key, true]))
  );

  useEffect(() => {
    userAPI.getNotificationPrefs()
      .then(r => setPrefs(prev => ({ ...prev, ...(r.data.data || {}) })))
      .catch(() => {});
  }, []);

  // Save each change right away; roll back the switch if saving fails
  const toggle = (k) => {
    const next = !prefs[k];
    setPrefs(prev => ({ ...prev, [k]: next }));
    userAPI.updateNotificationPrefs({ [k]: next })
      .then(() => showToast('Preference saved'))
      .catch(err => {
        setPrefs(prev => ({ ...prev, [k]: !next }));
        showToast(err.response?.data?.message || 'Failed to save preference', 'error');
      });
  };

  return (
    <div >
      {NOTIF_PREFS.map((pref, i) => (
        <div
          key={pref.key}
          style={{
            padding: '16px 0',
            
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div>
            <h5 style={{ fontSize: 14, fontWeight: 400, color: '#000000', marginBottom: 5 }}>{pref.label}</h5>
            <h6 style={{ fontSize: 14, color: '#4A4949', fontWeight: 400,marginBottom: 0 }}>{pref.desc}</h6>
          </div>
          <label className="toggle" style={{ flexShrink: 0 }}>
            <input type="checkbox" checked={prefs[pref.key]} onChange={() => toggle(pref.key)} />
            <span className="toggle-slider" />
          </label>
        </div>
      ))}
    </div>
  );
}

/* ── Main Settings Page ───────────────────────────────────── */
export default function Settings() {
  const [activeTab, setActiveTab] = useState('Profile');
  const TABS = ['Profile', 'Plan & Billing', 'Notification'];

  return (
    <>
      <AppHeader breadcrumb="Settings" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div style={{  marginBottom: 16 }}>
          <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>
            Account Settings
          </h4> 
          <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>
            Manage your profile, subscription, and notification preferences
          </p>
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: '8px 5px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-h)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === t ? 'var(--text-dark)' : 'var(--text-dark-4)',
                  borderBottom: activeTab === t ? '2px solid var(--lt-black)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.15s', lineHeight : "100%"
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        {activeTab === 'Profile'        && <ProfileTab />}
        {activeTab === 'Plan & Billing' && <PlanTab />}
        {activeTab === 'Notification'   && <NotificationTab />}
      </div>
    </>
  );
}

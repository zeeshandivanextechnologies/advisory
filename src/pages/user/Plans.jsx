import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, showToast } from '../../components/common/index';
import { useAuth } from '../../context/AuthContext';
import { subscriptionAPI, authAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { IoIosCheckbox } from 'react-icons/io';

export default function Plans() {
  const navigate              = useNavigate();
  const { user, updateUser }  = useAuth(); // FIX: updateUser not setUser
  const { currency }          = useSettings();
  const [plans,   setPlans]   = useState([]);
  const [mySub,   setMySub]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying,  setBuying]  = useState(null);

  const loadData = () =>
    Promise.all([
      subscriptionAPI.getPlans(),
      subscriptionAPI.getMyPlan(),
    ])
      .then(([p, s]) => {
        setPlans(p.data.data || []);
        setMySub(s.data.data);
      })
      .catch(() => showToast('Failed to load plans', 'error'))
      .finally(() => setLoading(false));

  useEffect(() => { loadData(); }, []);

  // Back from online checkout: /user/plans?checkout=success&session_id=... or ?checkout=cancelled
  useEffect(() => {
    const params    = new URLSearchParams(window.location.search);
    const checkout  = params.get('checkout');
    const sessionId = params.get('session_id');
    if (!checkout) return;
    window.history.replaceState(null, '', window.location.pathname);

    if (checkout === 'cancelled') { showToast('Payment was cancelled', 'error'); return; }
    if (!sessionId) return;
    subscriptionAPI.confirmCheckout(sessionId)
      .then(async (r) => {
        if (r.data.data?.status === 'paid') {
          showToast('Payment successful! Your plan is now active.');
          const me = await authAPI.getMe();
          if (me.data.user) updateUser(me.data.user);
          loadData();
        } else {
          showToast('Your payment is still processing. We will email you once it completes.');
        }
      })
      .catch(err => showToast(err.response?.data?.message || 'Could not confirm the payment', 'error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async (plan) => {
    if (plan.price === 0) return showToast('You are already on the free plan');
    setBuying(plan.id);
    try {
      const res = await subscriptionAPI.purchase({ plan_id: plan.id, payment_method: 'card' });
      if (res.data.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        showToast(`${plan.name} plan activated! Check your email.`);
        // FIX: updateUser — not setUser (setUser doesn't exist in AuthContext)
        const me = await authAPI.getMe();
        if (me.data.user) updateUser(me.data.user);
        // Refresh subscription data
        const s = await subscriptionAPI.getMyPlan();
        setMySub(s.data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Purchase failed', 'error');
    } finally {
      setBuying(null);
    }
  };

  const PLAN_COLORS = {
    free:       { bg: '#F1F5F9', border: '#CBD5E1', badge: '#64748B', badgeBg: '#F1F5F9' },
    pro:        { bg: '#EEF2FF', border: '#818CF8', badge: '#4338CA', badgeBg: '#EEF2FF' },
    enterprise: { bg: '#FFF7ED', border: '#F97316', badge: '#9A3412', badgeBg: '#FFF7ED' },
  };

  if (loading) return <><AppHeader breadcrumb="Plans" /><Spinner /></>;

  return (
    <>
      <AppHeader breadcrumb="Subscription Plans" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Choose Your Plan</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>Upgrade to unlock more features and advisory access</p>
          </div>
        </div>

        {mySub && (
          <div style={{ background: '#22C55E1F', border: '0.9px solid #22C55E', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span  style={{color :'#22C55E'}}> <IoIosCheckbox size={24} /> </span>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom : 5 }}>
                Active: {mySub.plan_name?.toUpperCase()} Plan
              </h4>
              <h6 style={{ fontSize: 12, color: '#4A4949', marginBottom : 0 }}>
                Expires: {new Date(mySub.expires_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
              </h6>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dark-4)' }}>
            No plans available at the moment.
          </div>
        ) : (
          <div className='row'>
            {plans.map(plan => {
              const colors    = PLAN_COLORS[plan.name?.toLowerCase()] || PLAN_COLORS.free;
              const isCurrent = user?.plan?.toLowerCase() === plan.name?.toLowerCase();
              const features  = typeof plan.features === 'string'
                ? JSON.parse(plan.features)
                : (plan.features || []);

              return (
                <div className='col-lg-4 col-md-6 col-sm-12 mb-lg-0 mb-3'>
                  <div key={plan.id}   className={`advisor-plan-card ${isCurrent ? 'active' : ''}`}
                      style={{
                        '--dynamic-border': isCurrent ? colors.border : '',
                        '--dynamic-bg': isCurrent ? colors.bg : ''
                      }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 500, fontFamily: 'var(--font-h)', color: '#4A4949', textTransform: 'capitalize' , marginBottom: 0 }}>
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <span
                  className="advisor-plan-badge"
                  style={{
                    '--badge-bg': colors.badgeBg,
                    '--badge-color': colors.badge,
                    '--badge-border': colors.border
                  }}
                >
                  Current Plan
                </span>
                    )}
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <span style={{ fontSize: 24, fontWeight: 600, color: '#000000' }}>
                      {plan.price === 0 ? 'Free' : `${plan.currency || currency} ${Number(plan.price).toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ fontSize: 18, fontWeight: 400, color: 'var(--text-dark-4)', marginLeft: 4 }}>
                        / {plan.duration_days === 30 ? 'month' : `${plan.duration_days} days`}
                      </span>
                    )}
                  </div>

                  {plan.description && (
                    <p style={{ fontSize: 14, fontWeight: 400, color: '#4A4949', marginBottom: 0 }}>{plan.description}</p>
                  )}

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                    {features.map((f, i) => (
                      <li key={i} style={{ fontSize: 14, fontWeight: 400, color: '#4A4949', padding: '6px 0', borderBottom: i < features.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#10B981', fontSize: 14 }}>✓</span> {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={isCurrent ? 'ai-thm-btn outline' : 'ai-thm-btn'}
                    disabled={isCurrent || buying === plan.id}
                    onClick={() => handlePurchase(plan)}
                    style={{ width: '100%' }}
                  >
                    {buying === plan.id ? 'Processing…' : isCurrent ? 'Current Plan' : plan.price === 0 ? 'Get Started' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

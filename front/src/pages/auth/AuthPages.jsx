import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

/* ═══════════════════════════════════════════════════════════
   REGISTER
═══════════════════════════════════════════════════════════ */
export function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();
  const [form, setForm]     = useState({ role: '', full_name: '', email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form);
      navigate('/auth/otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-left">
          <div className="auth-logo">Aunadvisory</div>
          <h2 className="auth-left-heading">Your Trusted Advisory Partner in the GCC</h2>
          <p className="auth-left-sub">Business setup, guidance, and expert consultation — all in one seamless platform.</p>
          <div className="auth-team-img">
            <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=85" alt="Team" />
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-right-title">Create your account</div>
          <p className="auth-right-sub">Get started with your free consultation</p>

          <div className="auth-tabs">
            <Link to="/auth/login" className="auth-tab">Sign In</Link>
            <span className="auth-tab active">Sign Up</span>
          </div>

          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label">Select Role</label>
              <select className="auth-select-dark" value={form.role} onChange={e => set('role', e.target.value)} required>
                <option value="" disabled>Select your role</option>
                <option value="user">Business Owner / Entrepreneur</option>
                <option value="advisor">Business Advisor</option>
              </select>
            </div>
            <div className="auth-form-group">
              <label className="auth-label">Full Name</label>
              <input type="text" className="auth-input" placeholder="Enter your full name"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">Email Address</label>
              <input type="email" className="auth-input" placeholder="Enter your email"
                value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="auth-form-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input type={showPwd ? 'text' : 'password'} className="auth-input" placeholder="Create a strong password"
                  value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} />
                <button type="button" className="auth-input-icon" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
            <p className="auth-terms">
              By signing up, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORGOT PASSWORD
═══════════════════════════════════════════════════════════ */
export function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ gridTemplateColumns: '1fr', maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ padding: '48px 40px' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <div className="auth-right-title">Forgot Password?</div>
          <p className="auth-right-sub">Enter your email and we'll send a reset link</p>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                Reset link sent to {email}
              </p>
              <Link to="/auth/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>
                Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
              <div className="auth-form-group">
                <label className="auth-label">Email Address</label>
                <input type="email" className="auth-input" placeholder="Enter your registered email"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
              <Link to="/auth/login" className="auth-back">Back to Login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OTP VERIFICATION
═══════════════════════════════════════════════════════════ */
export function OTP() {
  const { verifyOtp } = useAuth();
  const navigate      = useNavigate();
  const location      = useLocation();
  const email         = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const refs = Array.from({ length: 6 }, () => useRef(null)); // eslint-disable-line

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) refs[i - 1].current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return setError('Please enter all 6 digits');
    setError(''); setLoading(true);
    try {
      const user = await verifyOtp(email, code);
      navigate('/onboarding/welcome');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ gridTemplateColumns: '1fr', maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ padding: '48px 40px' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>✉️</div>
          <div className="auth-right-title">Verify Your Email</div>
          <p className="auth-right-sub">We sent a 6-digit code to {email || 'your email'}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div style={{ color: 'var(--red)', fontSize: 13, textAlign: 'center' }}>{error}</div>}
            <div className="otp-inputs">
              {otp.map((digit, i) => (
                <input key={i} ref={refs[i]} className="otp-input" maxLength={1}
                  value={digit} onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)} />
              ))}
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify Email'}
            </button>
            <button type="button" className="auth-back"
              onClick={() => authAPI.register({ email }).catch(() => {})} style={{ marginTop: 8 }}>
              Resend Code
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NEW PASSWORD
═══════════════════════════════════════════════════════════ */
export function NewPassword() {
  const navigate      = useNavigate();
  const location      = useLocation();
  const token         = new URLSearchParams(location.search).get('token') || '';
  const [form, setForm]   = useState({ password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setError(''); setLoading(true);
    try {
      await authAPI.resetPassword({ token, password: form.password });
      navigate('/auth/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ gridTemplateColumns: '1fr', maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ padding: '48px 40px' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔑</div>
          <div className="auth-right-title">Create New Password</div>
          <p className="auth-right-sub">Choose a strong password for your account</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
            <div className="auth-form-group">
              <label className="auth-label">New Password</label>
              <div className="auth-input-wrap">
                <input type={showPwd ? 'text' : 'password'} className="auth-input"
                  placeholder="Enter new password" value={form.password}
                  onChange={e => set('password', e.target.value)} required minLength={8} />
                <button type="button" className="auth-input-icon" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="auth-form-group">
              <label className="auth-label">Confirm Password</label>
              <input type="password" className="auth-input" placeholder="Confirm new password"
                value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { MdCheckBox } from 'react-icons/md';

export default function NewPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const token     = new URLSearchParams(location.search).get('token') || '';

  const [form, setForm] = useState({
    password: '', confirm: '',
  });
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error,   setError]         = useState('');
  const [success, setSuccess]       = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const strength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8)           score++;
    if (/[A-Z]/.test(pwd))        score++;
    if (/[0-9]/.test(pwd))        score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'var(--red)', 'var(--orange)', 'var(--blue)', 'var(--green)'];
  const score = strength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }
    if (!token) {
      return setError('Invalid reset link. Please request a new one.');
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password: form.password });
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
   <>
    {/* <div className="auth-page">
      <div className="auth-card" style={{ gridTemplateColumns: '1fr', maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ padding: '48px 40px', justifyContent: 'flex-start' }}>

          <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>
          <div className="auth-right-title">Create New Password</div>
          <p className="auth-right-sub">
            Choose a strong password to secure your account
          </p>

          {success ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
              <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                Password updated successfully!
              </p>
              <p style={{ fontSize: 13, color: '#7F8C8D', marginTop: 8 }}>
                Redirecting to login…
              </p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  color: 'var(--red)', fontSize: 13,
                  padding: '10px 14px', background: 'rgba(239,68,68,0.1)',
                  borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  {error}
                </div>
              )}

              <div className="auth-form-group">
                <label className="auth-label">New Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Enter new password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="auth-input-icon"
                    onClick={() => setShowPwd(p => !p)}
                  >
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>

                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: score >= i ? strengthColor[score] : '#2F343A',
                            transition: 'background 0.3s',
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: strengthColor[score], fontWeight: 600 }}>
                      {strengthLabel[score]}
                    </span>
                  </div>
                )}
              </div>

   
              <div className="auth-form-group">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Re-enter new password"
                    value={form.confirm}
                    onChange={e => set('confirm', e.target.value)}
                    required
                    style={{
                      borderColor: form.confirm && form.confirm !== form.password
                        ? 'var(--red)' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="auth-input-icon"
                    onClick={() => setShowConfirm(p => !p)}
                  >
                    {showConfirm ? '🙈' : '👁'}
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3, display: 'block' }}>
                    Passwords do not match
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={loading || !form.password || form.password !== form.confirm}
              >
                {loading ? 'Updating…' : 'Update Password'}
              </button>

              <Link
                to="/auth/login"
                style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: '#7F8C8D' }}
              >
                ← Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div> */}

    <div className='admin-login-section'>
        <div className="container-fluid">
          <div className='row'>
            <div className='col-lg-6 col-md-12 col-sm-12 px-0 mb-sm-3 mb-lg-0'>
              <div className="admin-picture-box">
                <img src="/anu-auth-logo.png" alt="" loading="lazy" />
                <div className='auth-content'>
                  <h2>Aunadvisory</h2>
                  <h4>Your Trusted Advisory <span className='d-lg-block d-sm-inline'>Partner in the GCC</span> </h4>
                  <p>Business setup, guidance, and expert consultation—all in <span className='d-lg-block d-sm-inline'>one seamless platform.</span> </p>
                </div>
              </div>
            </div>


          <div className="col-lg-6 col-md-12 col-sm-12">
  <div className="login-container">
    <div className="login-header-content">

      <div className="lg_sub_content mb-5">
        <h3>Create a New Password</h3>
        <p>
          Create a secure password to continue accessing your account safely.
        </p>
      </div>

      {success ? (
        <div className="send-mail-box">
          <span className='check-mail-icon'><MdCheckBox /></span>
          <h5>
            Password updated successfully!
          </h5>
          <h6>
            Redirecting to login…
          </h6>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {error && (
            <div className='auth-error-box'>
              {error}
            </div>
          )}

          <div className="custom-frm-second-box">
            <label>New Password</label>

            <div className="position-relative">
              <input
                type={showPwd ? "text" : "password"}
                className="form-control pe-5"
                placeholder="Enter new password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={8}
              />

              <div className="pass-toggle-box">
                <button
                  type="button"
                  className="pass-eye-btn"
                  onClick={() => setShowPwd(p => !p)}
                >
                  {showPwd ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {form.password && (
              <div className='mt-2'>
                <div className="d-flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`strength-bar ${score >= i ? `strength-${score}` : ''}`}
                    />
                  ))}
                </div>

                <span className={`strength-label strength-${score}`}>
                  {strengthLabel[score]}
                </span>
              </div>
            )}
          </div>

          <div className="custom-frm-second-box">
            <label>Confirm Password</label>

            <div className="position-relative">
              <input
                type={showConfirm ? "text" : "password"}
                className={`form-control pe-5 ${
                  form.confirm && form.confirm !== form.password ? "error-border" : ""
                }`}
                placeholder="Re-enter new password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                required
              />

              <div className="pass-toggle-box">
                <button
                  type="button"
                  className="pass-eye-btn"
                  onClick={() => setShowConfirm(p => !p)}
                >
                  {showConfirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {form.confirm && form.confirm !== form.password && (
              <span className="error-text">
                Passwords do not match
              </span>
            )}
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="lg-thm-btn w-100"
              disabled={loading || !form.password || form.password !== form.confirm}
            >
              {loading ? (
                <span className="spinner-btn">
                  <span className="spinner-loader" />
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>

          <div className="col-lg-12 mt-3">
            <div className="text-center">
              <Link to="/auth/login" className="back-btn">
                Back to Login
              </Link>
            </div>
          </div>

        </form>
      )}

    </div>
  </div>
</div>


            </div>
            </div>
            </div>

   
   </>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { IoMdMail } from "react-icons/io";


export default function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {/* <div className="auth-page">
      <div className="auth-card" style={{ gridTemplateColumns: '1fr', maxWidth: 480, minHeight: 'auto' }}>
        <div className="auth-right" style={{ padding: '48px 40px', justifyContent: 'flex-start' }}>

          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <div className="auth-right-title">Forgot Password?</div>
          <p className="auth-right-sub">
            Enter your registered email and we'll send you a reset link.
          </p>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📧</div>
              <p style={{ color: 'var(--green)', fontWeight: 600, fontSize: 14, marginBottom: 20 }}>
                Reset link sent to {email}
              </p>
              <p style={{ fontSize: 13, color: '#7F8C8D', marginBottom: 24 }}>
                Check your inbox and follow the link to reset your password. The link expires in 1 hour.
              </p>
              <Link
                to="/auth/login"
                className="auth-btn"
                style={{ display: 'block', textAlign: 'center' }}
              >
                Back to Login
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div style={{ color: 'var(--red)', fontSize: 13, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: 7 }}>
                  {error}
                </div>
              )}

              <div className="auth-form-group">
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>

              <Link to="/auth/login" className="auth-back" style={{ display: 'block', textAlign: 'center', marginTop: 14, color: '#7F8C8D', fontSize: 13 }}>
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
        <h3>Forgot Password</h3>
        <p>Enter your registered email and we'll send you a reset link.</p>
      </div>
      {sent ? (
        <div className="send-mail-box">
          <span className='check-mail-icon'><IoMdMail /> </span>
          <h5>
            Reset link sent to {email}
          </h5>
          <h6>
            Check your inbox and follow the link to reset your password. The link expires in 1 hour.
          </h6>

          <div className='mt-4'>
            <Link to="/auth/login" className="lg-thm-btn w-100">
            Back to Login
          </Link>
          </div>

        </div>
      ) : (
        <form onSubmit={handleSubmit}>

          {error && (
            <div className='auth-error-box'>
              {error}
            </div>
          )}

          <div className="custom-frm-second-box">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="lg-thm-btn w-100"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-btn">
                  <span className="spinner-loader" />
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

          </div>

          <div className="col-lg-12 mt-3">
            <div className="text-center">
              <Link to="/auth/login" className="back-btn">
                Back
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

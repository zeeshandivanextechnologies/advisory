import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    role: '', full_name: '', email: '', password: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) return setError('Please select a role');
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/auth/otp', { state: { email: form.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* <div className="auth-page">
      <div className="auth-card">


        <div className="auth-left">
          <div className="auth-logo">Aunadvisory</div>
          <h2 className="auth-left-heading">
            Your Trusted Advisory Partner in the GCC
          </h2>
          <p className="auth-left-sub">
            Business setup, guidance, and expert consultation — all in one seamless platform.
          </p>
          <div className="auth-team-img">
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=85"
              alt="Advisory team"
            />
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
            <div style={{
              background: 'var(--red-bg)', color: 'var(--red)',
              padding: '10px 14px', borderRadius: 7, fontSize: 13,
              marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)',
            }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="auth-form-group">
              <label className="auth-label">Select Role *</label>
              <select
                className="auth-select-dark"
                value={form.role}
                onChange={e => set('role', e.target.value)}
                required
              >
                <option value="" disabled>Choose your role</option>
                <option value="user">Business Owner / Entrepreneur</option>
                <option value="advisor">Business Advisor</option>
              </select>
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Full Name *</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Enter your full name"
                value={form.full_name}
                onChange={e => set('full_name', e.target.value)}
                required
              />
            </div>

        
            <div className="auth-form-group">
              <label className="auth-label">Email Address *</label>
              <input
                type="email"
                className="auth-input"
                placeholder="Enter your email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
              />
            </div>

           
            <div className="auth-form-group">
              <label className="auth-label">Password *</label>
              <div className="auth-input-wrap">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Minimum 8 characters"
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
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>

            <p className="auth-terms">
              By signing up, you agree to our{' '}
              <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>
            </p>
          </form>
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
                    <h3>Create your account</h3>
                    <p>Get started with your free consultation</p>
                  </div>
                  <div className="row">
                    <div className="auth-box">
                      <ul className="nav nav-tabs auth-tabs">
                        <li className="nav-item">
                          <Link to="/auth/login" className="nav-link">
                            Sign In
                          </Link>
                        </li>
                        <li className="nav-item">
                          <button className="nav-link active">
                            Sign Up
                          </button>
                        </li>
                      </ul>

                      <div className="tab-content">
                        <div className="tab-pane fade show active">
                          {error && (
                            <div className="auth-error-box">
                              {error}
                            </div>
                          )}

                          <form onSubmit={handleSubmit}>
                            <div className="col-lg-12">
                              <div className="custom-frm-second-box">
                                <label>Select Role *</label>
                                <select
                                  className="form-select"
                                  value={form.role}
                                  onChange={e => set('role', e.target.value)}
                                  required
                                >
                                  <option value="" disabled>Choose your role</option>
                                  <option value="user">Business Owner / Entrepreneur</option>
                                  <option value="advisor">Business Advisor</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-lg-12">
                              <div className="custom-frm-second-box">
                                <label>Full Name *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Enter your full name"
                                  value={form.full_name}
                                  onChange={e => set('full_name', e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="col-lg-12">
                              <div className="custom-frm-second-box">
                                <label>Email Address *</label>
                                <input
                                  type="email"
                                  className="form-control"
                                  placeholder="Enter your email"
                                  value={form.email}
                                  onChange={e => set('email', e.target.value)}
                                  required
                                />
                              </div>
                            </div>

                            <div className="col-lg-12">
                              <div className="custom-frm-second-box">
                                <label>Password *</label>
                                <div className="position-relative">
                                  <input
                                    type={showPwd ? "text" : "password"}
                                    className="form-control pe-5"
                                    placeholder="Minimum 8 characters"
                                    value={form.password}
                                    onChange={e => set('password', e.target.value)}
                                    required
                                    minLength={8}
                                  />

                                  <div className='pass-toggle-box'>
                                    <button
                                      type="button"
                                      className="pass-eye-btn"
                                      onClick={() => setShowPwd(p => !p)}
                                    >
                                      {showPwd ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                          

                            <div className="col-lg-12">
                              <div className="mt-3">
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="lg-thm-btn w-100"
                                  style={{ cursor: loading ? "not-allowed" : "pointer" }}
                                >
                                  {loading ? (
                                    <span className="spinner-btn">
                                      <span className="spinner-loader" />
                                      Creating Account…
                                    </span>
                                  ) : (
                                    "Create Account"
                                  )}
                                </button>

                               
                              </div>
                            </div>

                          </form>
                          <div className="col-lg-12">
                            <div className="terms-content mt-3">
                              <p>
                                By signing up, you agree to our{" "}
                                <NavLink to="/terms" className="term-btn">
                                  Terms of Services
                                </NavLink>{" "}
                                and{" "}
                                <NavLink to="/privacy" className="term-btn">
                                  Privacy Policy
                                </NavLink>
                              </p>
                            </div>
                          </div>

                          <div className="col-lg-12 mt-3">
                            <div className="text-center">
                              <Link to="/" className="back-btn">
                                Back
                              </Link>
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>


          </div>
        </div>
      </div>



    </>
  );
}

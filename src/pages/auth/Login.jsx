import React, { useState } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', remember: true });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      const paths = { admin: '/admin/dashboard', advisor: '/advisor/dashboard', user: '/user/dashboard' };
      navigate(paths[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
          <h2 className="auth-left-heading">Your Trusted Advisory Partner in the GCC</h2>
          <p className="auth-left-sub">Business setup, guidance, and expert consultation — all in one seamless platform.</p>
          <div className="auth-team-img">
            <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=85" alt="Advisory team" />
          </div>
        </div>

   
        <div className="auth-right">
          <div className="auth-right-title">Welcome Back</div>
          <p className="auth-right-sub">Sign in to access your Advisory dashboard</p>

          <div className="auth-tabs">
            <span className="auth-tab active">Sign In</span>
            <Link to="/auth/register" className="auth-tab">Sign Up</Link>
          </div>

          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 7, fontSize: 13, marginBottom: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <input
                  type="email" className="auth-input"
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input
                  type={showPwd ? 'text' : 'password'} className="auth-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
                <button type="button" className="auth-input-icon" onClick={() => setShowPwd(p => !p)}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="auth-remember-row">
              <label className="auth-checkbox-label">
                <input type="checkbox" checked={form.remember} onChange={e => set('remember', e.target.checked)} />
                Remember me
              </label>
              <Link to="/auth/forgot-password" className="auth-forgot">Forgot Password?</Link>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
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

            <div className='col-lg-6 col-md-12 col-sm-12'>
              <div className="login-container">
                <div className="login-header-content">
                  <div className="lg_sub_content mb-5">
                    <h3>Welcome Back</h3>
                    <p>Sign in to access your legal dashboard</p>
                  </div>

                  <div className="row">
                    <div className="auth-box">
                      <ul className="nav nav-tabs auth-tabs">
                        <li className="nav-item">
                          <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#login">
                            Sign In
                          </button>
                        </li>
                        <li className="nav-item">
                          <Link to="/auth/register" className="nav-link">
                            Sign Up
                          </Link>
                        </li>
                      </ul>
                      <div className="tab-content">
                        <div className="tab-pane fade show active" id="login">
                          {error && (
                            <div className="auth-error-box">
                              {error}
                            </div>
                          )}
                          <form onSubmit={handleSubmit}>
                            <div className="custom-frm-second-box">
                              <label>Email Address</label>
                              <input
                                type="email"
                                className="form-control"
                                placeholder="Enter your email address"
                                value={form.email}
                                onChange={e => set('email', e.target.value)}
                                required
                              />
                            </div>

                            <div className="custom-frm-second-box">
                              <label>Password</label>
                              <div className="position-relative">
                                <input
                                  type={showPwd ? "text" : "password"}
                                  className="form-control pe-5"
                                  placeholder="Enter your password"
                                  value={form.password}
                                  onChange={e => set('password', e.target.value)}
                                  required
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

                            <div className="col-lg-12">
                              <div className="d-flex align-items-start justify-content-between">

                                <div className="term-check-box">
                                  <label className="remember-title d-flex align-items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={form.remember}
                                      class="custom-checkbox"
                                      onChange={e => set('remember', e.target.checked)}
                                    />
                                    Remember Me
                                  </label>
                                </div>

                                <div>
                                  <NavLink to="/auth/forgot-password" className="reset-pass-btn">
                                    Forgot Password?
                                  </NavLink>
                                </div>

                              </div>
                            </div>
                            <div className="col-lg-12">
                              <div className="mt-1">
                                <button
                                  type="submit"
                                  disabled={loading}
                                  className="lg-thm-btn w-100"
                                  style={{ cursor: loading ? "not-allowed" : "pointer" }}
                                >
                                  {loading ? (
                                    <span className="spinner-btn">
                                      <span className="spinner-loader" />
                                      Signing in...
                                    </span>
                                  ) : (
                                    "Sign In"
                                  )}
                                </button>
                              </div>
                            </div>

                          </form>
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

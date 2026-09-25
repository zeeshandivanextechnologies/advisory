import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/api";
import { FaCheck } from "react-icons/fa";

export default function OTP() {
  const { verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // FIX: Declare refs at top level — not inside a loop (Rules of Hooks)
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const inputRefs = [ref0, ref1, ref2, ref3, ref4, ref5];

  // FIX: Redirect if no email in state (direct navigation to /auth/otp)
  useEffect(() => {
    if (!email) {
      navigate("/auth/register", { replace: true });
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs[5].current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return setError("Please enter all 6 digits");
    setError("");
    setLoading(true);
    try {
      await verifyOtp(email, code);
      navigate("/onboarding/welcome");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Invalid or expired OTP. Please try again.",
      );
      setOtp(["", "", "", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // FIX: Call resendOtp — not forgotPassword
  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setError("");
    try {
      await authAPI.resendOtp({ email });
      setResent(true);
      setTimeout(() => setResent(false), 30000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to resend OTP. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      {/* <div className="auth-page">
        <div
          className="auth-card"
          style={{
            gridTemplateColumns: "1fr",
            maxWidth: 480,
            minHeight: "auto",
          }}
        >
          <div
            className="auth-right"
            style={{ padding: "48px 40px", justifyContent: "flex-start" }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
            <div className="auth-right-title">Verify Your Email</div>
            <p className="auth-right-sub">
              We sent a 6-digit code to{" "}
              <span style={{ color: "#BDC3C7", fontWeight: 600 }}>
                {email || "your email"}
              </span>
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div
                  style={{
                    color: "var(--red)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "10px",
                    background: "rgba(239,68,68,0.1)",
                    borderRadius: 7,
                  }}
                >
                  {error}
                </div>
              )}

              <div className="otp-inputs" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="auth-btn"
                disabled={loading || otp.join("").length !== 6}
              >
                {loading ? "Verifying…" : "Verify Email"}
              </button>

              <div style={{ textAlign: "center", marginTop: 14 }}>
                {resent ? (
                  <p style={{ fontSize: 13, color: "var(--green)" }}>
                    ✓ New code sent to your email
                  </p>
                ) : (
                  <button
                    type="button"
                    className="auth-back"
                    onClick={handleResend}
                    disabled={resending}
                    style={{ fontSize: 13, color: "#7F8C8D" }}
                  >
                    {resending ? (
                      "Sending…"
                    ) : (
                      <>
                        Didn't receive a code?{" "}
                        <span style={{ color: "#BDC3C7", fontWeight: 600 }}>
                          Resend
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div> */}

      <div className="admin-login-section">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-6 col-md-12 col-sm-12 px-0 mb-sm-3 mb-lg-0">
              <div className="admin-picture-box">
                <img src="/anu-auth-logo.png" alt="" loading="lazy" />
                <div className="auth-content">
                  <h2>Aunadvisory</h2>
                  <h4>
                    Your Trusted Advisory{" "}
                    <span className="d-lg-block d-sm-inline">
                      Partner in the GCC
                    </span>{" "}
                  </h4>
                  <p>
                    Business setup, guidance, and expert consultation—all in{" "}
                    <span className="d-lg-block d-sm-inline">
                      one seamless platform.
                    </span>{" "}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-6 col-md-12 col-sm-12">
              <div className="login-container">
                <div className="login-header-content">
                  <div className="lg_sub_content mb-5">
                    <h3>Verification</h3>
                    <p>We sent a 6-digit code to {email || "your email"}</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error-box">{error}</div>}

                    <div className="custom-frm-second-box">
                      <div className="otp-filed-box" onPaste={handlePaste}>
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            ref={inputRefs[i]}
                            className="form-control text-center"
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 terms-content text-center">
                      {resent ? (
                        <p className="fz-16 mb-0">
                          <FaCheck /> New code sent to your email
                        </p>
                      ) : (
                        <button
                          type="button"
                          className="term-btn"
                          onClick={handleResend}
                          disabled={resending}
                        >
                          {resending
                            ? "Sending…"
                            : "Didn't receive a code? Resend"}
                        </button>
                      )}
                    </div>

                    <div className="mt-4">
                      <button
                        type="submit"
                        className="lg-thm-btn w-100"
                        disabled={loading || otp.join("").length !== 6}
                      >
                        {loading ? (
                          <span className="spinner-btn">
                            <span className="spinner-loader" />
                            Verifying...
                          </span>
                        ) : (
                          "Verify Email"
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="col-lg-12 mt-3">
                    <div className="text-center">
                      <Link to="/forgot-password" className="back-btn">
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
    </>
  );
}

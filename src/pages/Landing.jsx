import { FiCheck } from 'react-icons/fi';
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css';
import {
  FaBuilding,
  FaFileAlt,
  FaPassport,
  FaMoneyBillWave,
  FaFileContract,
  FaCheckCircle,
  FaArrowRight,
  FaUser,
  FaStar
} from "react-icons/fa";
import { FaBars } from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import "../assets/css/style.css";
import "../assets/css/responsive.css";

/* ── Navbar ────────────────────────────────────────────────── */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [user, setUser] = useState(null);
  const headerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);


  const { platformName } = useSettings();
  const [name1, name2] = platformName.includes('Advisory')
    ? [platformName.replace('Advisory', ''), 'Advisory']
    : [platformName, ''];


  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => { document.body.style.overflow = ""; document.body.style.touchAction = ""; };
  }, [menuOpen]);

  const [isSticky, setIsSticky] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 70);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const scrollToSection = (sectionId) => {
    closeMenu();
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: sectionId } });
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };


  useEffect(() => {
    if (location.state?.scrollTo) {
      setTimeout(() => {
        const el = document.getElementById(location.state.scrollTo);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [location]);

  return (

    // <nav className="lp-nav">
    //   <div className="lp-nav-inner">
    //     <div className="lp-logo">{name1}<span style={{ color: 'var(--secondary-col)' }}>{name2 || ''}</span></div>

    //     <ul className="lp-links" style={{ display: 'flex' }}>
    //       {['About', 'Services', 'Pricing', 'Advisors', 'Contact'].map(link => (
    //         <li key={link}>
    //           <a href={`#${link.toLowerCase()}`}>{link}</a>
    //         </li>
    //       ))}
    //     </ul>

    //     <div className="lp-nav-btns">
    //       <button
    //         style={{ fontFamily: 'var(--font-h)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', letterSpacing: '0.02em' }}
    //         onClick={() => navigate('/auth/login')}
    //       >
    //         Sign In
    //       </button>
    //       <button
    //         style={{
    //           fontFamily: 'var(--font-h)', fontSize: 12, fontWeight: 700, color: '#111',
    //           background: 'var(--grad-btn)', border: 'none', cursor: 'pointer',
    //           padding: '7px 16px', borderRadius: 5, letterSpacing: '0.02em',
    //           boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    //         }}
    //         onClick={() => navigate('/auth/register')}
    //       >
    //         Get Started ✦
    //       </button>
    //     </div>
    //   </div>
    // </nav>


    <header className={`tp-header-section ${isSticky ? "tp-header-sticky" : ""}`}>
      {/* Prominent Legal Disclaimer */}
      <div style={{ background: '#111', color: '#fff', textAlign: 'center', padding: '8px 15px', fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em' }}>
        <span style={{ color: 'var(--secondary-col)', fontWeight: '700' }}>Disclaimer:</span> Integra is not a law firm. We provide business advisory services.
      </div>
      <nav ref={headerRef} className="navbar navbar-expand-lg navbar-light-box">
        <div className="container">
          <NavLink className="navbar-brand anu-logo-title me-0" to="/">
            {name1}
            <span >
              {name2 || ''}
            </span>
          </NavLink>
          <button className="navbar-toggler" type="button" onClick={toggleMenu}>
            <FaBars />
          </button>

          <div className={`collapse navbar-collapse ${menuOpen ? "show" : ""}`} id="navbarSupportedContent">
            <div className="mobile-close-btn d-lg-none">
              <IoMdClose onClick={closeMenu} />
            </div>
            <ul className="navbar-nav ms-auto me-5">
              {['About', 'Services', 'Pricing', 'Advisors', 'Contact'].map(link => (
                <li className="nav-item" key={link}>
                  <button
                    className="nav-link btn-link"
                    onClick={() => {
                      scrollToSection(link.toLowerCase());
                      closeMenu();
                    }}
                  >
                    {link}
                  </button>
                </li>
              ))}
            </ul>
            <div className="d-flex align-items-center gap-2">
              {user ? (
                <NavLink to="/dashboard" className="thm-btn" onClick={closeMenu}>
                  Go to Dashboard
                </NavLink>
              ) : (
                <>
                  <button
                    className="aun-sign-btn"
                    onClick={() => {
                      navigate('/auth/login');
                      closeMenu();
                    }}
                  >
                    Sign In
                  </button>

                  <button
                    className="thm-btn"
                    onClick={() => {
                      navigate('/auth/register');
                      closeMenu();
                    }}
                  >
                    Sign Up <FaArrowRight />

                  </button>
                </>
              )}

            </div>
          </div>

        </div>
      </nav>

      {/* OVERLAY */}
      {menuOpen && (
        <div className="mobile-overlay" onClick={closeMenu}></div>
      )}
    </header>

  );
}

/* ── Hero ──────────────────────────────────────────────────── */
function Hero() {
  const navigate = useNavigate();
  return (
    // <section style={{ position: 'relative', overflow: 'hidden', minHeight: 500, display: 'flex', alignItems: 'center' }}>
    //   <img
    //     src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1400&q=80"
    //     alt="Business advisory"
    //     style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
    //   />
    //   <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 50%, rgba(0,0,0,0.25) 100%)' }} />
    //   <div style={{ position: 'relative', zIndex: 2, maxWidth: 1280, margin: '0 auto', padding: '80px 40px', width: '100%' }}>
    //     <div style={{ maxWidth: 560 }}>
    //       <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '5px 14px', background: 'rgba(189,195,199,0.1)', border: '1px solid rgba(189,195,199,0.2)', borderRadius: 100 }}>
    //         <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
    //         <span style={{ fontSize: 11, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
    //           Trusted by 1,200+ businesses across the GCC
    //         </span>
    //       </div>
    //       <h1 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(30px,4.5vw,52px)', fontWeight: 800, color: '#FFF', lineHeight: 1.15, marginBottom: 18 }}>
    //         Your Trusted Partner for Business Success in the <span style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>GCC</span>
    //       </h1>
    //       <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, marginBottom: 32, maxWidth: 420 }}>
    //         Expert legal, regulatory, and business advisory — company formation, licensing, visa solutions, and more. All in one seamless platform.
    //       </p>
    //       <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
    //         <button
    //           onClick={() => navigate('/auth/register')}
    //           style={{
    //             display: 'inline-flex', alignItems: 'center', gap: 8,
    //             fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 700, color: '#111',
    //             background: 'var(--grad-btn)', border: 'none', cursor: 'pointer',
    //             padding: '12px 24px', borderRadius: 6, letterSpacing: '0.02em',
    //             boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
    //           }}
    //         >
    //           Start Your Journey →
    //         </button>
    //         <button
    //           onClick={() => navigate('/auth/login')}
    //           style={{
    //             fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
    //             background: 'transparent', border: '1px solid rgba(189,195,199,0.3)', cursor: 'pointer',
    //             padding: '12px 24px', borderRadius: 6, letterSpacing: '0.02em',
    //           }}
    //         >
    //           Sign In
    //         </button>
    //       </div>
    //     </div>
    //   </div>
    // </section>

    <section className="aun-hero-section">
      <img
        src="/home_banner.png"
        alt="Business advisory"
        className="aun-hero-bg"
      />

      <div className="aun-hero-overlay"></div>

      <div className="container ">
        <div className="row">
          <div className="col-lg-6">

            <div className='aun-hero-container'>
              <div className="aun-hero-badge">
                <span className="aun-badge-dot"></span>
                <span className="aun-badge-text">
                  Trusted by 1,200+ businesses across the GCC
                </span>
              </div>

              <h2 className="aun-hero-title">
                Your Trusted Partner for Business Success in the{" "}
                <span className="aun-gradient-text">GCC</span>
              </h2>

              <p className="aun-hero-desc">
                Helping you build, manage, and grow your business with confidence.
              </p>

              <div className="aun-hero-btns">
                <button
                  onClick={() => navigate('/auth/register')}
                  className="thm-btn px-3 fz-16"
                >
                  Get Free Consultancy <FaArrowRight />

                </button>

                <button
                  onClick={() => navigate('/auth/login')}
                  className="thm-btn outline px-3 fz-16"
                >
                  Sign In
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

  );
}

/* ── Stats Strip ───────────────────────────────────────────── */
function StatsStrip() {
  const stats = [
    { value: '1,200+', label: 'Businesses Served' },
    { value: '38', label: 'Expert Advisors' },
    { value: '6', label: 'GCC Countries' },
    { value: '98%', label: 'Client Satisfaction' },
  ];

  const refs = useRef([]);
  const [counts, setCounts] = useState(stats.map(() => 0));

  useEffect(() => {
    const observers = [];

    refs.current.forEach((el, i) => {
      if (!el) return;

      const end = parseInt(stats[i].value.replace(/\D/g, ""));
      if (!end) return;

      let start = 0;
      const duration = 1500;
      const step = end / (duration / 16);

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const timer = setInterval(() => {
              start += step;

              setCounts(prev => {
                const updated = [...prev];
                updated[i] = start >= end ? end : Math.floor(start);
                return updated;
              });

              if (start >= end) clearInterval(timer);
            }, 16);
          }
        },
        { threshold: 0.5 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, []);


  return (
    <div className="aun-stats-section">
      <div className="container">
        <div className="row text-center">
          {stats.map(({ value, label }, i) => {
            const formatted =
              value.includes('+') ? counts[i] + '+' :
                value.includes('%') ? counts[i] + '%' :
                  counts[i];

            return (
              <div key={label} className="col-lg-3 col-md-6">
                <div className="aun-stat-card">

                  <div
                    ref={el => (refs.current[i] = el)}
                    className="aun-stat-value"
                  >
                    {formatted}
                  </div>

                  <div className="aun-stat-label">
                    {label}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Services ──────────────────────────────────────────────── */
function Services() {


  const services = [
    {
      icon: <FaBuilding />,
      title: 'Executive Discovery',
      desc: 'Initial high-level strategy and feasibility assessment for your business goals.'
    },
    {
      icon: <FaFileAlt />,
      title: 'Market Entry Blueprint',
      desc: 'Comprehensive roadmap for entering the GCC market with clear actionable steps.'
    },
    {
      icon: <FaCheckCircle />,
      title: 'Regulatory Review',
      desc: 'In-depth analysis of legal and compliance requirements specific to your sector.'
    },
    {
      icon: <FaPassport />,
      title: 'Incorporation Pathway',
      desc: 'End-to-end execution of company registration, licensing, and setup.'
    },
    {
      icon: <FaFileContract />,
      title: 'Advisory Retainer',
      desc: 'Ongoing strategic and legal advisory for sustained compliance and growth.'
    }
  ];

  return (
    <section id="services" className="aun-services-section">
      <div className="container">
        <div className="aun-services-header text-center mb-5">
          <div className="aun-services-tag">
            WHAT WE OFFER
          </div>
          <h2 className="aun-services-title">
            Everything your business needs
          </h2>
          <p className="aun-services-desc mx-auto">
            From initial setup to ongoing compliance — our expert advisors handle every aspect of your business journey in the GCC.
          </p>
        </div>

        <div className="row">
          {services.map(({ icon, title, desc }) => (
            <div key={title} className="col-lg-4 col-md-6 col-sm-12 mb-3">
              <div className="aun-services-card h-100">
                <div className="aun-services-icon">
                  {icon}
                </div>
                <h3 className="aun-services-card-title">
                  {title}
                </h3>
                <p className="aun-services-card-desc">
                  {desc}
                </p>

              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

/* ── How It Works ──────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Create Your Account', desc: 'Sign up in minutes. Tell us about your business needs and goals.' },
    { num: '02', title: 'Match with an Advisor', desc: 'We connect you with a verified expert specializing in your required service.' },
    { num: '03', title: 'Submit Your Case', desc: 'Create a case, upload documents, and track progress in real time.' },
    { num: '04', title: 'Get Expert Guidance', desc: 'Receive personalized advisory through video calls, documents, and ongoing support.' },
  ];

  return (
    <section id="about" style={{ background: '#FBFBFB', padding: '80px 0' }}>
      <div className='container'>
        <div className='row'>
          <div className='col-lg-6'>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--lt-dark-grey)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 600, color: '#000', marginBottom: 14 }}>
              We Bridge Global Ambition with GCC Market Realities
            </h2>
            <p style={{ fontSize: 16, color: '#6A6A6A', lineHeight: 1.5, marginBottom: 36, }}>
              Aunadvisory helps global entrepreneurs and businesses expand into the Gulf, bridging international practices with regional realities for efficient, compliant market entry.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map(({ num, title, desc }, i) => (
                <div key={num} style={{ display: 'flex', gap: 20, padding: '15px 0', borderBottom: i < steps.length - 1 ? '1px solid #EAEAEA' : 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid #2F343A',
                    color: '#000000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-h)', flexShrink: 0,
                    background: "linear-gradient(180deg, #7F8C8D 0%, #BDC3C7 50%, #FFFFFF 75%, #7F8C8D 100%)",

                  }}>
                    {num}
                  </div>
                  <div>
                    <h5 style={{ fontFamily: 'var(--font-h)', fontSize: 18, fontWeight: 600, color: '#000000', marginBottom: 0 }}>{title}</h5>
                    <p style={{ fontSize: 14, color: '#6A6A6A', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className='col-lg-6'>
            <div className="aun-img-box">
              <img
                src="/hm_banner_01.jpg"
                alt="Advisory consultation"
                className="aun-img"
              />

              <div className="aun-content-box">
                <div className='anu-sub-content-box'>
                  <div className='landing-user-trust'>
                    <span className="anu-lc-ur-icon">
                      <FaUser />
                    </span>

                    <p>Trusted by Qatar Businesses</p>
                  </div>

                  <div className="anu-landing-stars">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <FaStar key={i} className="anu-star-icons" />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ───────────────────────────────────────────────── */
function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../services/api').then(m =>
      m.publicAPI.getPlans()
        .then(r => setPlans(r.data.data || []))
        .catch(() => { })
        .finally(() => setLoading(false))
    );
  }, []);

  /* Fallback static plans while loading or if API fails */
  const displayPlans = plans.length > 0 ? plans.map(plan => {
    const features = typeof plan.features === 'string'
      ? (() => { try { return JSON.parse(plan.features); } catch { return []; } })()
      : (plan.features || []);
    const isFeatured = plan.name?.toLowerCase() === 'pro' || plan.name?.toLowerCase() === 'professional';
    const priceStr = plan.price === 0 ? 'Free' : `${plan.currency || 'QAR'} ${Number(plan.price).toLocaleString()}`;
    const periodStr = plan.price > 0 ? (plan.duration_days === 30 ? '/month' : `/${plan.duration_days} days`) : '';
    const ctaText = plan.price === 0 ? 'Start Free' : `Get ${plan.name}`;
    return { tier: plan.name, price: priceStr, period: periodStr, desc: plan.description || '', features, unavail: [], cta: ctaText, featured: isFeatured };
  }) : [
    { tier: 'Executive Discovery', price: 'Custom', period: '', desc: 'Initial consultation and feasibility check.', features: ['45-min Discovery Call', 'High-level feasibility check', 'Needs Assessment'], unavail: ['Detailed Blueprint', 'Execution / Filing'], cta: 'Book Discovery', featured: false },
    { tier: 'Market Entry Blueprint', price: 'Custom', period: '', desc: 'Strategic roadmap for GCC expansion.', features: ['Market Analysis', 'Jurisdiction Selection', 'Step-by-step Roadmap', 'Cost Estimation'], unavail: ['Company Registration', 'Visa Processing'], cta: 'Get Blueprint', featured: true },
    { tier: 'Regulatory Review', price: 'Custom', period: '', desc: 'Compliance and legal gap analysis.', features: ['Sector Compliance Check', 'Legal Gap Analysis', 'Risk Mitigation Report'], unavail: ['Ongoing Retainer', 'Representation'], cta: 'Request Review', featured: false },
    { tier: 'Incorporation Pathway', price: 'Custom', period: '', desc: 'End-to-end business setup.', features: ['Trade License Setup', 'PRO Services', 'Bank Account Intro', 'Visa Assistance'], unavail: ['Post-setup Retainer'], cta: 'Start Incorporation', featured: false },
    { tier: 'Advisory Retainer', price: 'Custom', period: '/month', desc: 'Ongoing support for your business.', features: ['Dedicated Advisor', 'Monthly Strategy Calls', 'Ongoing Compliance', 'Priority Support'], unavail: [], cta: 'Join Retainer', featured: true },
  ];

  return (
    <section id="pricing" style={{ background: '#000', padding: '80px 0' }}>
      <div className='container'>

        <div className='row mb-3'>
          <div className='col-lg-12'>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, }}>
              PRICING
            </div>
          </div>
          <div className='col-lg-6'>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 600, color: '#FFF', marginBottom: 12 }}>
              Pick Your Plan
            </h2>
          </div>
          <div className='col-lg-6'>
            <p style={{ fontSize: 14, color: 'var(--text-3)', maxWidth: 400, margin: '0 auto' }}>
              Precision-driven advisory aligned with your business objectives and expansion roadmap.
            </p>
          </div>
        </div>




        {/* {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40 }}>Loading plans…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${displayPlans.length},1fr)`, gap: 20 }}>
            {displayPlans.map(({ tier, price, period, desc, features, unavail, cta, featured }) => (
              <div key={tier} style={{
                background: featured ? 'linear-gradient(160deg,rgba(189,195,199,0.06) 0%,#111 60%)' : '#111',
                border: `1px solid ${featured ? 'var(--secondary-col)' : 'var(--border-dk)'}`,
                borderRadius: 'var(--radius)', padding: '36px 28px', position: 'relative',
              }}>
                {featured && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--grad-btn)', color: '#111', fontSize: 10, fontWeight: 700,
                    padding: '4px 16px', borderRadius: 100, letterSpacing: '0.06em', fontFamily: 'var(--font-h)',
                    whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--secondary-col)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
                  {tier}
                </div>
                <div style={{ fontFamily: 'var(--font-h)', fontSize: 38, fontWeight: 800, color: '#FFF', lineHeight: 1, marginBottom: 4 }}>
                  {price}<span style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>{period}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '12px 0 22px', lineHeight: 1.6 }}>{desc}</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
                  {features.map(f => (
                    <li key={f} style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                  {(unavail || []).map(f => (
                    <li key={f} style={{ fontSize: 13, color: 'var(--text-4)', display: 'flex', alignItems: 'center', gap: 9, opacity: 0.4 }}>
                      <span>—</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/auth/register')}
                  style={{
                    width: '100%', padding: '12px', fontFamily: 'var(--font-h)', fontSize: 13,
                    fontWeight: 700, letterSpacing: '0.02em',
                    background: featured ? 'var(--grad-btn)' : 'transparent',
                    color: featured ? '#111' : 'var(--text-1)',
                    border: featured ? 'none' : '1px solid var(--border-2)',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  }}
                >
                  {cta}
                </button>
              </div>
            ))}
          </div>

        )} */}

        {loading ? (
          <div className="text-center text-muted py-5">
            Loading plans…
          </div>
        ) : (
          <div className="row">
            {displayPlans.map(({ tier, price, period, desc, features, unavail, cta, featured }) => (
              <div key={tier} className="col-lg-4 col-md-6 col-sm-12 mb-3">
                <div className={`aun-price-card ${featured ? 'aun-price-featured' : ''}`}>
                  {featured && (
                    <div className="aun-price-badge">
                      MOST POPULAR
                    </div>
                  )}

                <div className='anu-price-tier-main-section'>
                    <div>
                    <div className="aun-price-tier">
                    <h5>{tier}</h5>
                  </div>

                  <div className="aun-price-value">
                    <h4>{price}</h4>
                    <span className="aun-price-period">{period}</span>
                  </div>

                  <p className="aun-price-desc">
                    {desc}
                  </p>

                  


                  <ul className="aun-price-features">
                    {features.map(f => (
                      <li key={f} className="aun-price-item">
                        <span className="aun-check"><FiCheck /></span> {f}
                      </li>
                    ))}

                    {(unavail || []).map(f => (
                      <li key={f} className="aun-price-item aun-unavailable">
                        <span>—</span> {f}
                      </li>
                    ))}
                  </ul>
                  </div>


                 <div>
                   <button
                    onClick={() => navigate('/auth/register')}
                    className={`thm-btn w-100 my-2 ${featured ? 'thm-btn' : 'thm-btn outline'}`}
                  >
                    {cta}
                  </button>
                 </div>
                </div>



                </div>

              </div>
            ))}
          </div>
        )}


      </div>
    </section>
  );
}

function WorkFlow() {
  const steps = [
    { num: '01', title: 'Rule-Based Logic Engine', desc: 'Pre-configured advisory flows, not generative AI' },
    { num: '02', title: 'Jurisdiction Selection', desc: 'Guided GCC market identification based on your criteria' },
    { num: '03', title: 'Advisory Objective Mapping', desc: 'Structured questions to identify your exact needs' },
    { num: '04', title: 'Always Recommends a Consultant', desc: 'Every flow ends with a human expert recommendation' },
  ];

  return (
    <section id="advisors" style={{ background: '#FBFBFB', padding: '80px 0' }}>
      <div className='container'>
        <div className='row'>

          <div className='col-lg-6'>
            <div className="aun-img-box">
              <img
                src="/hm_banner_02.jpg"
                alt="Advisory consultation"
                className="aun-img"
              />


            </div>
          </div>


          <div className='col-lg-6'>
           <div className='advisor-content-page'>
             <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--lt-dark-grey)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              HOW IT Workflow
            </div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 600, color: '#000', marginBottom: 14 }}>
              Guided Advisory Workflow
            </h2>
            <p style={{ fontSize: 16, color: '#6A6A6A', lineHeight: 1.5, marginBottom: 36, }}>
              Our structured advisory assistant guides you through a pre-configured workflow to understand your needs
            </p>
           </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {steps.map(({ num, title, desc }, i) => (
                <div key={num} style={{ display: 'flex', gap: 20, padding: '15px 0', borderBottom: i < steps.length - 1 ? '1px solid #EAEAEA' : 'none' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', border: '1px solid #2F343A',
                    color: '#000000', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-h)', flexShrink: 0,
                    background: "linear-gradient(180deg, #7F8C8D 0%, #BDC3C7 50%, #FFFFFF 75%, #7F8C8D 100%)",

                  }}>
                    {num}
                  </div>
                  <div>
                    <h5 style={{ fontFamily: 'var(--font-h)', fontSize: 18, fontWeight: 600, color: '#000000', marginBottom: 0 }}>{title}</h5>
                    <p style={{ fontSize: 14, color: '#6A6A6A', margin: 0, lineHeight: 1.5 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}




/* ── Testimonials ──────────────────────────────────────────── */
function Testimonials() {
  const testimonials = [
    { name: 'Omar Al-Khalid', role: 'CEO, TechVentures Qatar', rating: '★★★★★', text: 'AunAdvisory helped us set up our QFC entity in record time. The advisors were professional, responsive, and truly understood our needs.' },
    { name: 'Sarah Al-Nouri', role: 'Founder, NovaBrands UAE', rating: '★★★★★', text: 'From trademark filing to employment visas, the platform handles everything. It has become an essential tool for our business operations.' },
    { name: 'James Hartley', role: 'CFO, FintechCore DIFC', rating: '★★★★★', text: 'The tax advisory team saved us significant costs through proper structuring. The whole experience was seamless and highly professional.' },
  ];

  return (
    <section className='anu-testimonial-section'>
      <div className='container'>
        <div className='row mb-3'>
          <div className='col-lg-8'>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--lt-dark-grey)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              TESTIMONIALS
            </div>
            <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 600, color: '#000' }}>
              What Our Clients Say
            </h2>
          </div>
          <div className='col-lg-4'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#FFF', border: '1px solid #EAEAEA', borderRadius: 'var(--radius)' }}>
              <span style={{ color: '#C9A84C', fontSize: 14, display: 'inline-flex', gap: 2 }}>{[0, 1, 2, 3, 4].map(i => <FaStar key={i} />)}</span>
              <span style={{ fontSize: 13, color: '#6B7280' }}><strong style={{ color: '#000' }}>4.9/5</strong> from 200+ reviews</span>
            </div>
          </div>
        </div>
        <div className='row'>


          <div className='col-lg-12'>
            <Splide
              options={{
                type: 'loop',
                perPage: 3,
                focus: 'center',
                gap: '20px',
                arrows: false,
                pagination: true,
                autoplay: true,
                interval: 2500,
                pauseOnHover: false,
                pauseOnFocus: false,
                breakpoints: {
                  992: {
                    perPage: 1,
                    focus: 'center',
                  },
                  576: {
                    perPage: 1,
                    focus: 'center',
                  },
                },
              }}
            >
              {testimonials.map(({ name, role, rating, text }) => (
                <SplideSlide key={name}>
                  <div className="aun-testimonial-card">

                    <div className="aun-testimonial-rating">
                      {rating}
                    </div>

                    <p className="aun-testimonial-text">
                      "{text}"
                    </p>

                    <div className="aun-testimonial-user">

                      <div className="aun-testimonial-avatar">
                        {name.charAt(0)}
                      </div>

                      <div>
                        <div className="aun-testimonial-name">{name}</div>
                        <div className="aun-testimonial-role">{role}</div>
                      </div>

                    </div>

                  </div>
                </SplideSlide>
              ))}
            </Splide>

          </div>


        </div>
      </div>
    </section>
  );
}


/* ── Faq  ──────────────────────────────────────────── */

function Faq() {
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      id: 1,
      question: "How does Aun Advisory help my business?",
      answer:
        "We provide expert legal and compliance guidance tailored to your business needs.",
    },
    {
      id: 2,
      question: "How quickly can I connect with an advisor?",
      answer:
        "You can book a consultation instantly and connect within minutes.",
    },
    {
      id: 3,
      question: "Are consultations confidential?",
      answer:
        "Yes, all consultations are completely secure and confidential.",
    },
    {
      id: 4,
      question: "What industries do you support?",
      answer:
        "We support startups, SMEs, and enterprises across multiple industries.",
    },
  ];

  const faqQ = (faq) => faq.question;
  const faqA = (faq) => faq.answer;




  return (
    <section className="faq-section" id="faq-section">
      <div className="container">
        <div className="row">

          <div className="col-lg-12">
            <div className="flow-content">
              <h4>
                FAQ
              </h4>
            </div>
          </div>

          <div className="col-lg-12">
            <div className="faq-cards">
              <div className="accordion zx-faq-accordion">

                {faqs.map((faq, i) => {
                  const isOpen = openFaq === i;

                  return (
                    <div className="accordion-item" key={faq.id}>

                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button zx-faq-btn ${isOpen ? "" : "collapsed"
                            }`}
                          onClick={() =>
                            setOpenFaq(isOpen ? null : i)
                          }
                        >
                          {faqQ(faq)}
                        </button>
                      </h2>

                      <div
                        className={`accordion-collapse collapse ${isOpen ? "show" : ""
                          }`}
                      >
                        <div className="accordion-body">
                          <p>{faqA(faq)}</p>
                        </div>
                      </div>

                    </div>
                  );
                })}

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}


/* ── CTA Band ──────────────────────────────────────────────── */
function CTABand() {
  const navigate = useNavigate();
  return (
    // <section style={{ background: '#0D0D0D', borderTop: '1px solid var(--border-dk)', borderBottom: '1px solid var(--border-dk)', padding: '80px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
    //   <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,var(--secondary-col),transparent)' }} />
    //   <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 40px' }}>
    //     <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 800, color: '#FFF', marginBottom: 14 }}>
    //       Ready to grow your business in the GCC?
    //     </h2>
    //     <p style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 34, lineHeight: 1.7 }}>
    //       Join 1,200+ businesses that trust AunAdvisory for their legal and regulatory needs. Start free today.
    //     </p>
    //     <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
    //       <button
    //         onClick={() => navigate('/auth/register')}
    //         style={{
    //           fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 700, color: '#111',
    //           background: 'var(--grad-btn)', border: 'none', cursor: 'pointer',
    //           padding: '13px 28px', borderRadius: 6, letterSpacing: '0.02em',
    //         }}
    //       >
    //         Get Started Free
    //       </button>
    //       <button
    //         onClick={() => navigate('/contact')}
    //         style={{
    //           fontFamily: 'var(--font-h)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
    //           background: 'transparent', border: '1px solid rgba(189,195,199,0.3)', cursor: 'pointer',
    //           padding: '13px 28px', borderRadius: 6, letterSpacing: '0.02em',
    //         }}
    //       >
    //         Talk to an Expert
    //       </button>
    //     </div>
    //   </div>
    // </section>

    <section className="aun-cta-section text-center">

      {/* gradient line */}
      <div className="aun-cta-line"></div>

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">

            <h2 className="aun-cta-title">
              Ready to Enter the GCC Market?
            </h2>

            <p className="aun-cta-desc">
              Trusted by businesses successfully entering GCC markets with Aunadvisory.
            </p>

            <div className="aun-cta-btns d-flex justify-content-center flex-wrap">
              <button
                onClick={() => navigate('/auth/register')}
                className="thm-btn px-3 fz-16"
              >
                Get Started Free <FaArrowRight />

              </button>

              <button
                onClick={() => navigate('/contact')}
                className="thm-btn outline px-3 fz-16"
              >
                Talk to an Expert
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>

  );
}

/* ── Footer ────────────────────────────────────────────────── */
function Footer() {
  const cols = [
    { title: 'Platform', links: ['Dashboard', 'How It Works', 'Pricing', 'Advisors', 'Case Tracking'] },
    { title: 'Services', links: ['Company Formation', 'Business Licensing', 'Visa & Residency', 'Tax Advisory', 'Contract Review'] },
    { title: 'Legal', links: ['Terms of Service', 'Privacy Policy', 'Disclaimer', 'Cookie Policy', 'Contact Us'] },
  ];



  return (
    // <footer style={{ background: '#111', borderTop: '1px solid var(--border-dk)', padding: '60px 0 32px' }}>
    //   <div className='container'>
    //     <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
    //       <div>
    //         <div style={{ fontFamily: 'var(--font-h)', fontSize: 18, fontWeight: 800, color: '#FFF', marginBottom: 12 }}>
    //           Aun<span style={{ color: 'var(--secondary-col)' }}>Advisory</span>
    //         </div>
    //         <p style={{ fontSize: 13, color: 'var(--text-4)', maxWidth: 260, lineHeight: 1.7, margin: '0 0 20px' }}>
    //           Your trusted partner for business setup, licensing, and legal advisory across the GCC region.
    //         </p>
    //         <div style={{ display: 'flex', gap: 10 }}>
    //           {['𝕏', 'in', '⊡'].map(icon => (
    //             <button key={icon} style={{
    //               width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border-2)',
    //               background: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer',
    //               display: 'flex', alignItems: 'center', justifyContent: 'center',
    //             }}>{icon}</button>
    //           ))}
    //         </div>
    //       </div>
    //       {cols.map(({ title, links }) => (
    //         <div key={title}>
    //           <h5 style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-h)', color: '#FFF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
    //             {title}
    //           </h5>
    //           <ul style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    //             {links.map(link => (
    //               <li key={link}>
    //                 <a href="#" style={{ fontSize: 13, color: 'var(--text-4)', transition: 'color 0.2s' }}
    //                   onMouseEnter={e => e.target.style.color = '#FFF'}
    //                   onMouseLeave={e => e.target.style.color = 'var(--text-4)'}
    //                 >
    //                   {link}
    //                 </a>
    //               </li>
    //             ))}
    //           </ul>
    //         </div>
    //       ))}
    //     </div>
    //     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid var(--border-dk)' }}>
    //       <p style={{ fontSize: 12, color: 'var(--text-4)' }}>© {new Date().getFullYear()} AunAdvisory. All rights reserved.</p>
    //       <div style={{ display: 'flex', gap: 20 }}>
    //         {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
    //           <Link key={l} to={`/${l.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 12, color: 'var(--text-4)' }}>{l}</Link>
    //         ))}
    //       </div>
    //     </div>
    //   </div>
    // </footer>




    <footer className="footer-section">
      <div className="container">
        <div className="row mb-5">
          <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
            <h5 className="sub-title">AunAdvisory</h5>
            <div className="footer-text">
              <p>
                Aunai Legal Solutions and Services employs a smart AI-legal approach
                with the option to escalate to legal professionals. We help global
                entrepreneurs and businesses expand into the Gulf with efficient,
                compliant market entry.
              </p>
            </div>


          </div>

          <div className="col-lg-8 col-md-6 col-sm-12">
            <div className="row">
              {cols.map(({ title, links }) => (
                <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={title}>

                  <h5 className="sub-title">{title}</h5>

                  <ul className="footer-links">
                    {links.map(link => (
                      <li className="footer-item" key={link}>
                        <a href="#" className="footer-nav-link">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>

                </div>
              ))}

            </div>
          </div>
        </div>

        <div className="row footer-bottom align-items-center">
          <div className="col-lg-7">
            <p className="mb-0">
              © {new Date().getFullYear()} AunAdvisory. All rights reserved.
            </p>
          </div>

          <div className="col-lg-5">
            <div className="footer-social">
              <ul className="social-icon-list">
                <li>
                  <a href="#" className="social-nav-link">
                    <FaFacebookF />
                  </a>
                </li>

                <li>
                  <a href="#" className="social-nav-link">
                    <FaInstagram />
                  </a>
                </li>

                <li>
                  <a href="#" className="social-nav-link">
                    <FaLinkedinIn />
                  </a>
                </li>

                <li>
                  <a href="#" className="social-nav-link">
                    <FaWhatsapp />
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </footer>


  );
}

/* ── Main Export ───────────────────────────────────────────── */
export default function Landing() {
  return (
    <div style={{ background: '#000' }}>
      {/* <Navbar /> */}
      <Hero />
      <StatsStrip />
      <Services />
      <HowItWorks />
      <Pricing />
      <WorkFlow />
      <Testimonials />
      <Faq />
      {/* <CTABand /> */}
      {/* <Footer /> */}
    </div>
  );
}

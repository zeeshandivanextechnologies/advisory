import React, { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { FaArrowRight, FaBars } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  // const [user, setUser] = useState(null);
  const { user } = useAuth();
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

  // Handle scroll after navigation from another page
  useEffect(() => {
    if (location.state?.scrollTo) {
      setTimeout(() => {
        const el = document.getElementById(location.state.scrollTo);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  }, [location]);

  return (
    <>

      {/*  <nav className="lp-nav">
           <div className="lp-nav-inner">
             <div className="lp-logo">{name1}<span style={{ color: 'var(--secondary-col)' }}>{name2 || ''}</span></div>
    
            <ul className="lp-links" style={{ display: 'flex' }}>
            {['About', 'Services', 'Pricing', 'Advisors', 'Contact'].map(link => (
               <li key={link}>
                  <a href={`#${link.toLowerCase()}`}>{link}</a>
                </li>
               ))}
           </ul>
    
             <div className="lp-nav-btns">
               <button
                 style={{ fontFamily: 'var(--font-h)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', letterSpacing: '0.02em' }}
                onClick={() => navigate('/auth/login')}
              >
                 Sign In
               </button>
               <button
                 style={{
                  fontFamily: 'var(--font-h)', fontSize: 12, fontWeight: 700, color: '#111',
                   background: 'var(--grad-btn)', border: 'none', cursor: 'pointer',
                   padding: '7px 16px', borderRadius: 5, letterSpacing: '0.02em',
                   boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                 }}
                 onClick={() => navigate('/auth/register')}
               >
                 Get Started ✦
               </button>
            </div>
           </div>
         </nav> */}
 
      <header className={`tp-header-section ${isSticky ? "tp-header-sticky" : ""}`}>
        {/* Disclaimer: business advisory, not a law firm */}
        <div style={{ background: '#111', color: '#fff', textAlign: 'center', padding: '8px 15px', fontSize: '12px', fontWeight: '500', letterSpacing: '0.04em' }}>
          <span style={{ color: 'var(--secondary-col)', fontWeight: '700' }}>Disclaimer:</span> {platformName} is not a law firm. We provide business advisory services.
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
                      // onClick={() => {
                      //   scrollToSection(link.toLowerCase());
                      //   closeMenu();
                      // }}
                       onClick={() => {
                            if (link === 'Contact') {
                              navigate('/contact');
                            } else {
                              scrollToSection(link.toLowerCase());
                            }
                            closeMenu();
                          }}

                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="d-flex align-items-center gap-2 ms-2 mt-lg-0 mt-3">
                {user && user?.role ?  (
                  <NavLink to={`/${user.role}/dashboard`} className="thm-btn fz-16" onClick={closeMenu}>
                    Go to Dashboard
                  </NavLink>
                ) : (
                  <>
                    <button
                      className="aun-sign-btn fz-16"
                      onClick={() => {
                        navigate('/auth/login');
                        closeMenu();
                      }}
                    >
                      Sign In
                    </button>

                    <button
                      className="thm-btn fz-16"
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

        {menuOpen && (
          <div className="mobile-overlay d-block" onClick={closeMenu}></div>
        )}
      </header>

    </>
  )
}

export default Header
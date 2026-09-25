import {
  FaArrowRight,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
import {  NavLink, useNavigate } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";

function Footer() {
  const { platformName } = useSettings();
  const cols = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", path: "#" },
      { label: "How It Works", path: "#" },
      { label: "Pricing", path: "#" },
      { label: "Advisors", path: "#" },
      { label: "Case Tracking", path: "#" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Company Formation", path: "#" },
      { label: "Business Licensing", path: "#" },
      { label: "Visa & Residency", path: "#" },
      { label: "Tax Advisory", path: "#" },
      { label: "Contract Review", path: "#" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Terms of Service", path: "/terms" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Disclaimer", path: "/disclaimer" },
      { label: "Cookie Policy", path: "#" },
      { label: "Contact Us", path: "/contact" },
    ],
  },
];

  const navigate = useNavigate();

  return (
    <>
      <section className="aun-cta-section text-center">
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
                className="thm-btn px-3 fz-16">
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

      <footer className="footer-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
              <h5 className="sub-title">{platformName}</h5>
              <div className="footer-text">
                <p>
                  {platformName} provides business, market-entry and
                  regulatory-navigation advisory for global entrepreneurs and
                  businesses expanding into the Gulf. We are not a law firm —
                  legal work is handled by independent licensed counsel.
                </p>
              </div>
            </div>

            <div className="col-lg-8 col-md-6 col-sm-12">
              <div className="row">
                {cols.map(({ title, links }) => (
                  <div className="col-lg-4 col-md-6 col-sm-12 mb-4" key={title}>
                    <h5 className="sub-title">{title}</h5>
                    <ul className="footer-links">
                    {links.map((link) => (
                      <li className="footer-item" key={link.path}>
                        <NavLink to={link.path} className="footer-nav-link">
                          {link.label}
                        </NavLink>
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
                © {new Date().getFullYear()} {platformName}. All rights reserved.
              </p>
            </div>

            <div className="col-lg-5">
              <div className="footer-social">
                <ul className="social-icon-list">
                  <li>
                    <NavLink href="#" className="social-nav-link">
                      <FaFacebookF />
                    </NavLink>
                  </li>

                  <li>
                    <NavLink href="#" className="social-nav-link">
                      <FaInstagram />
                    </NavLink>
                  </li>

                  <li>
                    <NavLink href="#" className="social-nav-link">
                      <FaLinkedinIn />
                    </NavLink>
                  </li>

                  <li>
                    <NavLink href="#" className="social-nav-link">
                      <FaWhatsapp />
                    </NavLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;

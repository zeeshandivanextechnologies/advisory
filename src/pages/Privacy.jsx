// export { Privacy as default } from './PublicPages';
import React from "react";
import { useSettings } from "../context/SettingsContext";

function Privacy() {
  return (
    <>
      <section className="legal-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-content">
                <h2>Privacy Policy</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="legal-content-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-update-content">
                <div className="legal-page-title">
                  <h1 className="legal-main-title">Privacy Policy</h1>
                  <p className="legal-subtitle">
                    Last updated:{" "}
                    {new Date().toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>1. Information We Collect</h2>
                  <p>
                    We collect information you provide directly (name, email,
                    phone, company details), information generated through
                    Platform use (cases, documents, session history), and
                    technical data (IP address, browser type, device
                    information) for security and analytics purposes.
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>2. How We Use Your Information</h2>
                  <ul className="legal-list">
                    {[
                      "Facilitate connections between clients and advisors",
                      "Process payments and manage subscriptions",
                      "Send service-related notifications and updates",
                      "Improve Platform functionality and user experience",
                      "Comply with legal obligations and regulatory requirements",
                      "Prevent fraud and ensure platform security",
                    ].map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="legal-update-content">
                  <h2>3. Data Sharing</h2>
                  <p>
                    We do not sell your personal data. We share data only with:
                    advisors you engage on the Platform, payment processors for
                    transaction handling, and regulatory authorities where
                    legally required. All third parties are contractually
                    obligated to protect your data.
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>4. Data Retention</h2>
                  <p>
                    We retain your data for as long as your account is active
                    and for 7 years thereafter to comply with legal and
                    regulatory requirements. You may request deletion of your
                    account and personal data, subject to legal retention
                    obligations.
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>5. Your Rights</h2>
                  <p>
                    <PrivacyContact type="rights" />
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>6. Cookies</h2>
                  <p>
                    We use essential cookies for authentication and security,
                    and optional analytics cookies to improve the Platform. You
                    can manage cookie preferences through your browser settings.
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>7. Security</h2>
                  <p>
                    We implement industry-standard security including TLS
                    encryption, bcrypt password hashing, JWT authentication, and
                    regular security audits. However, no system is 100% secure
                    and we cannot guarantee absolute security.
                  </p>
                </div>

                <div className="legal-update-content">
                  <h2>8. Contact</h2>
                  <p>
                    <PrivacyContact type="inquiries" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
export default Privacy;

function PrivacyContact({ type }) {
  const { privacyEmail } = useSettings();

  if (type === "rights") {
    return (
      <>
        You have the right to access, correct, export, or delete your personal
        data. To exercise these rights, contact{" "}
        <a
          href={`mailto:${privacyEmail}`}
          className="legal-link text-black fw-600"
        >
          {privacyEmail}
        </a>
        . We will respond within 30 days.
      </>
    );
  }

  return (
    <>
      For privacy inquiries:{" "}
      <a
        href={`mailto:${privacyEmail}`}
        className="legal-link text-black fw-600"
      >
        {privacyEmail}
      </a>
    </>
  );
}

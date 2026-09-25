// export { Terms as default } from './PublicPages';

import React from 'react'
import { useSettings } from '../context/SettingsContext';

function Terms() {
  const { platformName } = useSettings();
  return (
    <>
    <section className="legal-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-content">
                <h2>Term of Services</h2>
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
                <h1 className="legal-main-title">
                  Terms of Service
                </h1>
                <p className="legal-subtitle">
                  Last updated: {new Date().toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="legal-update-content">
                <h2>1. Acceptance of Terms</h2>
                <p>
                  By accessing or using {platformName} ("the Platform"), you agree
                  to be bound by these Terms of Service and all applicable laws
                  and regulations. If you do not agree with any part of these
                  terms, you may not access the Platform.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>2. Description of Services</h2>
                <p>
                  {platformName} provides business, market-entry and
                  regulatory-navigation advisory, and connects clients with
                  verified business and regulatory advisors specializing in GCC
                  jurisdictions. Services include company formation advisory,
                  licensing guidance, visa assistance, tax consultation, and
                  commercial contract review. {platformName} is not a law firm
                  and does not provide legal advice; legal work is referred, with
                  your consent, to independent licensed counsel.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>3. User Accounts</h2>
                <p className="mb-2">You must:</p>
                <ul className="legal-list">
                  {[
                    "Provide accurate and complete registration information",
                    "Maintain the security of your account credentials",
                    "Notify us immediately of any unauthorized access",
                    "Be at least 18 years of age to use the Platform",
                    "Not share your account with third parties",
                  ].map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="legal-update-content">
                <h2>4. Advisor Relationship</h2>
                <p>
                  Advisors on the Platform are independent professionals.
                  {platformName} does not employ advisors and is not responsible
                  for the quality, accuracy, or legality of advice provided.
                  Clients engage advisors directly and {platformName} acts solely
                  as an intermediary platform.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>5. Fees and Payments</h2>
                <p>
                  Platform fees are charged according to your selected
                  subscription plan. Consultation fees are agreed directly
                  between clients and advisors. All payments are processed
                  securely. Refunds are subject to our refund policy available
                  upon request.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>6. Confidentiality</h2>
                <p>
                  All communications and documents shared through the Platform
                  are treated as confidential. We implement industry-standard
                  security measures to protect your data. Advisors are
                  contractually bound to maintain client confidentiality.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>7. Intellectual Property</h2>
                <p>
                  All content, trademarks, logos, and platform technology are
                  the exclusive property of {platformName}. Users may not
                  reproduce, distribute, or create derivative works without
                  explicit written permission.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>8. Limitation of Liability</h2>
                <p>
                  {platformName} shall not be liable for any indirect, incidental,
                  special, or consequential damages arising from use of the
                  Platform. Our total liability shall not exceed the fees paid
                  by you in the three months preceding the claim.
                </p>
              </div>

              <div className="legal-update-content">
                <h2>9. Governing Law</h2>
                <p>
                  These Terms are governed by the laws of the State of Qatar.
                  Any disputes shall be subject to the exclusive jurisdiction of
                  the Qatari courts or, where applicable, the Qatar Financial
                  Centre courts.
                </p>
              </div>

              {/* Contact Section */}
              <TermsLegalContact />

            </div>

          </div>
        </div>
      </div>
    </section>



      
    
    </>
  )
}

export default Terms


function TermsLegalContact() {
  const { legalEmail } = useSettings();

  return (
    <div className="legal-update-content">
      <h2>10. Contact</h2>
      <p>
        For questions about these Terms, contact us at{" "}
        <a href={`mailto:${legalEmail}`} className="legal-link">
          {legalEmail}
        </a>
      </p>
    </div>
  );
}



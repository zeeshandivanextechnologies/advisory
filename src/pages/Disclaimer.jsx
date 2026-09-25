import { FiAlertTriangle } from 'react-icons/fi';
// export { Disclaimer as default } from './PublicPages';

function Disclaimer() {
  return (
    <>
    <section className="legal-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-content">
                <h2>Legal Disclaimer</h2>
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
              Legal Disclaimer
            </h1>
            <p className="legal-subtitle">
              Please read this disclaimer carefully before using our platform.
            </p>
          </div>

          <div className="legal-warning-box">
            <span className="warning-icon"><FiAlertTriangle /></span>
            <p>
              <strong>Important:</strong> AunAdvisory is an information and
              connection platform. Content on this platform does not constitute
              legal advice and should not be relied upon as such.
            </p>
          </div>

          {/* Sections */}

          <div className="legal-update-content">
            <h2>No Legal Advice</h2>
            <p>
              AunAdvisory is a technology platform that connects users with
              independent advisors. The information, guidance, and content
              available on the Platform — whether from AunAdvisory or its
              advisors — is for general informational purposes only and does not
              constitute legal, financial, tax, or regulatory advice.
            </p>
          </div>

          <div className="legal-update-content">
            <h2>Independent Professional Advice</h2>
            <p>
              You should always seek advice from a qualified, licensed
              professional in your specific jurisdiction before making any
              legal, financial, or business decisions. The advisors listed on
              the Platform are independent professionals; their views are their
              own and do not represent the views of AunAdvisory.
            </p>
          </div>

          <div className="legal-update-content">
            <h2>No Guarantee of Outcomes</h2>
            <p>
              AunAdvisory makes no representations or warranties about the
              accuracy, completeness, or suitability of information provided on
              the Platform. Business registration, licensing, and regulatory
              outcomes depend on many factors outside our control.
            </p>
          </div>

          <div className="legal-update-content">
            <h2>Jurisdiction-Specific Advice</h2>
            <p>
              Laws and regulations vary by country and emirate within the GCC.
              Information provided may not be current or applicable to your
              specific jurisdiction. Always verify regulatory requirements with
              the relevant authorities.
            </p>
          </div>

          <div className="legal-update-content">
            <h2>Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, AunAdvisory expressly
              disclaims all liability for any loss or damage — whether direct,
              indirect, incidental, or consequential — arising from your
              reliance on content or advice available through the Platform.
            </p>
          </div>

        </div>

      </div>
    </div>
  </div>
</section>

    </>
  )
}

export default Disclaimer


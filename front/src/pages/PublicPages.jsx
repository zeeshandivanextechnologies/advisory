import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

/* ── Shared layout for public pages ───────────────────────── */
function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7' }}>
      <nav style={{ background: '#000', borderBottom: '1px solid var(--border-dk)', padding: '0 40px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily: 'var(--font-h)', fontSize: 15, fontWeight: 700, color: '#FFF' }}>
          Aun<span style={{ color: 'var(--secondary-col)' }}>Advisory</span>
        </Link>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/auth/login" style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-h)', fontWeight: 600 }}>Sign In</Link>
          <Link to="/auth/register" style={{ fontSize: 12, color: '#111', background: 'var(--grad-btn)', padding: '6px 14px', borderRadius: 5, fontFamily: 'var(--font-h)', fontWeight: 700 }}>Get Started</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '60px 40px' }}>
        {children}
      </div>
      <footer style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid var(--border-light)', fontSize: 12, color: 'var(--text-dark-4)' }}>
        © {new Date().getFullYear()} AunAdvisory · <Link to="/privacy" style={{ color: 'inherit' }}>Privacy</Link> · <Link to="/terms" style={{ color: 'inherit' }}>Terms</Link>
      </footer>
    </div>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 40, paddingBottom: 24, borderBottom: '1px solid var(--border-light)' }}>
      <h1 style={{ fontFamily: 'var(--font-h)', fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800, color: 'var(--text-dark)', marginBottom: 8 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: 'var(--text-dark-4)' }}>{subtitle}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: 'var(--font-h)', fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 10 }}>{title}</h2>
      <div style={{ fontSize: 14, color: 'var(--text-dark-3)', lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

/* ═══ CONTACT ══════════════════════════════════════════════ */
export function Contact() {
  const { contactEmail, contactPhone, contactAddress, officeHours } = useSettings();
  const [form, setForm]     = useState({ name: '', email: '', company: '', subject: '', message: '' });
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // FIX: Calls real backend endpoint — was a fake setTimeout simulation
      await import('../services/api').then(m => m.default.post('/contact', form));
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <PageTitle title="Contact Us" subtitle="We typically respond within 2 business hours." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-h)', fontSize: 15, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 16 }}>Get in touch</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dark-3)', lineHeight: 1.7, marginBottom: 28 }}>
            Whether you have a question about our services, pricing, or need expert guidance, our team is ready to help.
          </p>

          {[
            { icon: '📧', label: 'Email',    value: contactEmail },
            { icon: '📞', label: 'Phone',    value: contactPhone },
            { icon: '📍', label: 'Location', value: contactAddress },
            { icon: '🕐', label: 'Hours',    value: officeHours },
          ].map(({ icon, label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, color: 'var(--text-dark-3)' }}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#FFF', padding: 28, borderRadius: 'var(--radius)', border: '1px solid var(--border-light)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
              <h3 style={{ fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 8 }}>Message Sent!</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>We'll get back to you within 2 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Subject *</label>
                <select className="form-select" value={form.subject} onChange={e => set('subject', e.target.value)} required>
                  <option value="">Select topic</option>
                  <option>Company Formation</option>
                  <option>Business Licensing</option>
                  <option>Visa & Residency</option>
                  <option>Tax Advisory</option>
                  <option>Pricing & Plans</option>
                  <option>General Inquiry</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message *</label>
                <textarea className="form-textarea" rows={4} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us about your business needs…" required />
              </div>
              <button type="submit" className="btn btn-accent" disabled={loading}>
                {loading ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

/* ═══ TERMS ════════════════════════════════════════════════ */
export function Terms() {
  return (
    <PublicLayout>
      <PageTitle title="Terms of Service" subtitle={`Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <Section title="1. Acceptance of Terms">
        By accessing or using AunAdvisory ("the Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not access the Platform.
      </Section>

      <Section title="2. Description of Services">
        AunAdvisory provides a digital platform connecting clients with verified legal and business advisors specializing in GCC jurisdictions. Services include company formation advisory, licensing guidance, visa assistance, tax consultation, and contract review. The Platform facilitates connections between parties but does not itself provide legal advice.
      </Section>

      <Section title="3. User Accounts">
        <p style={{ marginBottom: 8 }}>You must:</p>
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Provide accurate and complete registration information', 'Maintain the security of your account credentials', 'Notify us immediately of any unauthorized access', 'Be at least 18 years of age to use the Platform', 'Not share your account with third parties'].map(item => (
            <li key={item} style={{ fontSize: 14, color: 'var(--text-dark-3)', lineHeight: 1.6 }}>• {item}</li>
          ))}
        </ul>
      </Section>

      <Section title="4. Advisor Relationship">
        Advisors on the Platform are independent professionals. AunAdvisory does not employ advisors and is not responsible for the quality, accuracy, or legality of advice provided. Clients engage advisors directly and AunAdvisory acts solely as an intermediary platform.
      </Section>

      <Section title="5. Fees and Payments">
        Platform fees are charged according to your selected subscription plan. Consultation fees are agreed directly between clients and advisors. All payments are processed securely. Refunds are subject to our refund policy available upon request.
      </Section>

      <Section title="6. Confidentiality">
        All communications and documents shared through the Platform are treated as confidential. We implement industry-standard security measures to protect your data. Advisors are contractually bound to maintain client confidentiality.
      </Section>

      <Section title="7. Intellectual Property">
        All content, trademarks, logos, and platform technology are the exclusive property of AunAdvisory. Users may not reproduce, distribute, or create derivative works without explicit written permission.
      </Section>

      <Section title="8. Limitation of Liability">
        AunAdvisory shall not be liable for any indirect, incidental, special, or consequential damages arising from use of the Platform. Our total liability shall not exceed the fees paid by you in the three months preceding the claim.
      </Section>

      <Section title="9. Governing Law">
        These Terms are governed by the laws of the State of Qatar. Any disputes shall be subject to the exclusive jurisdiction of the Qatari courts or, where applicable, the Qatar Financial Centre courts.
      </Section>

      <TermsLegalContact />
    </PublicLayout>
  );
}

function TermsLegalContact() {
  const { legalEmail } = useSettings();
  return (
    <Section title="10. Contact">
      For questions about these Terms, contact us at <a href={`mailto:${legalEmail}`} style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{legalEmail}</a>
    </Section>
  );
}

/* ═══ PRIVACY ══════════════════════════════════════════════ */
function PrivacyContact({ type }) {
  const { privacyEmail } = useSettings();
  if (type === 'rights') {
    return (
      <>
        You have the right to access, correct, export, or delete your personal data. To exercise these rights, contact{' '}
        <a href={`mailto:${privacyEmail}`} style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{privacyEmail}</a>. We will respond within 30 days.
      </>
    );
  }
  return (
    <>
      For privacy inquiries:{' '}
      <a href={`mailto:${privacyEmail}`} style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{privacyEmail}</a>
    </>
  );
}

export function Privacy() {
  return (
    <PublicLayout>
      <PageTitle title="Privacy Policy" subtitle={`Last updated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`} />

      <Section title="1. Information We Collect">
        We collect information you provide directly (name, email, phone, company details), information generated through Platform use (cases, documents, session history), and technical data (IP address, browser type, device information) for security and analytics purposes.
      </Section>

      <Section title="2. How We Use Your Information">
        <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Facilitate connections between clients and advisors',
            'Process payments and manage subscriptions',
            'Send service-related notifications and updates',
            'Improve Platform functionality and user experience',
            'Comply with legal obligations and regulatory requirements',
            'Prevent fraud and ensure platform security',
          ].map(item => (
            <li key={item} style={{ fontSize: 14, color: 'var(--text-dark-3)', lineHeight: 1.6 }}>• {item}</li>
          ))}
        </ul>
      </Section>

      <Section title="3. Data Sharing">
        We do not sell your personal data. We share data only with: advisors you engage on the Platform, payment processors for transaction handling, and regulatory authorities where legally required. All third parties are contractually obligated to protect your data.
      </Section>

      <Section title="4. Data Retention">
        We retain your data for as long as your account is active and for 7 years thereafter to comply with legal and regulatory requirements. You may request deletion of your account and personal data, subject to legal retention obligations.
      </Section>

      <Section title="5. Your Rights">
        <PrivacyContact type="rights" />
      </Section>

      <Section title="6. Cookies">
        We use essential cookies for authentication and security, and optional analytics cookies to improve the Platform. You can manage cookie preferences through your browser settings.
      </Section>

      <Section title="7. Security">
        We implement industry-standard security including TLS encryption, bcrypt password hashing, JWT authentication, and regular security audits. However, no system is 100% secure and we cannot guarantee absolute security.
      </Section>

      <Section title="8. Contact">
        <PrivacyContact type="inquiries" />
      </Section>
    </PublicLayout>
  );
}

/* ═══ DISCLAIMER ════════════════════════════════════════════ */
export function Disclaimer() {
  return (
    <PublicLayout>
      <PageTitle title="Legal Disclaimer" subtitle="Please read this disclaimer carefully before using our platform." />

      <div style={{ background: '#FEF9E7', border: '1px solid #F39C12', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 32, display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <p style={{ fontSize: 13, color: '#7D6608', margin: 0, lineHeight: 1.6 }}>
          <strong>Important:</strong> AunAdvisory is an information and connection platform. Content on this platform does not constitute legal advice and should not be relied upon as such.
        </p>
      </div>

      <Section title="No Legal Advice">
        AunAdvisory is a technology platform that connects users with independent advisors. The information, guidance, and content available on the Platform — whether from AunAdvisory or its advisors — is for general informational purposes only and does not constitute legal, financial, tax, or regulatory advice.
      </Section>

      <Section title="Independent Professional Advice">
        You should always seek advice from a qualified, licensed professional in your specific jurisdiction before making any legal, financial, or business decisions. The advisors listed on the Platform are independent professionals; their views are their own and do not represent the views of AunAdvisory.
      </Section>

      <Section title="No Guarantee of Outcomes">
        AunAdvisory makes no representations or warranties about the accuracy, completeness, or suitability of information provided on the Platform. Business registration, licensing, and regulatory outcomes depend on many factors outside our control.
      </Section>

      <Section title="Jurisdiction-Specific Advice">
        Laws and regulations vary by country and emirate within the GCC. Information provided may not be current or applicable to your specific jurisdiction. Always verify regulatory requirements with the relevant authorities.
      </Section>

      <Section title="Limitation of Liability">
        To the fullest extent permitted by law, AunAdvisory expressly disclaims all liability for any loss or damage — whether direct, indirect, incidental, or consequential — arising from your reliance on content or advice available through the Platform.
      </Section>
    </PublicLayout>
  );
}

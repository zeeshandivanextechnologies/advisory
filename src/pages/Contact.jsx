// export { Contact as default } from './PublicPages';


import React, { useState } from "react";
import { FiMail, FiPhone, FiMapPin, FiClock } from "react-icons/fi";
import { useSettings } from "../context/SettingsContext";

function Contact() {
  const { contactEmail, contactPhone, contactAddress, officeHours } =
    useSettings();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {

      await import("../services/api").then((m) =>
        m.default.post("/contact", form),
      );
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const contactData = [
    { icon: <FiMail />, label: "Email", value: contactEmail },
    { icon: <FiPhone />, label: "Phone", value: contactPhone },
    { icon: <FiMapPin />, label: "Location", value: contactAddress },
    { icon: <FiClock />, label: "Hours", value: officeHours },
  ];

  return (
    <>
      <section className="legal-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="legal-content">
                <h2>Contact Us</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ai-contact-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-6 col-md-12 col-sm-12 mb-3 mb-lg-0">
              <div className="ai-contact-picture">
                <img src="/ai_contact_us.jpg" alt="contact" />

                <div className="contact-us-content">
                  {contactData.map(({ icon, label, value }) => (
                    <div className="ai-contact-content" key={label}>
                      <div className="ai-contact-row">
                        <span className="ai-contact-icon">{icon}</span>

                        <div>
                          <h6>{label}</h6>
                          <h4>{value}</h4>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-6 col-md-12 col-sm-12 ps-lg-5 ps-sm-0">
              <div className="contact-form-wrapper">
                {sent ? (
                  <div className="contact-success text-center">
                    <div className="success-icon">✅</div>
                    <h3 className="success-title">Message Sent!</h3>
                    <p className="success-text">
                      We'll get back to you within 2 business hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-lg-6">
                        <div className="custom-frm-bx">
                          <input
                            type="text"
                            name="name"
                            className="form-control"
                            placeholder="Enter Your Name"
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-lg-6">
                        <div className="custom-frm-bx">
                          <input
                            type="email"
                            name="email"
                            className="form-control"
                            placeholder="Enter Your Email"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="col-lg-6">
                        <div className="custom-frm-bx">
                          <input
                            type="text"
                            name="company"
                            className="form-control"
                            placeholder="Company"
                            value={form.company}
                            onChange={(e) => set("company", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="col-lg-6">
                        <div className="custom-frm-bx">
                          <select
                            name="subject"
                            className="form-select"
                            value={form.subject}
                            onChange={(e) => set("subject", e.target.value)}
                            required
                          >
                            <option value="">Select topic</option>
                            <option>Company Formation</option>
                            <option>Business Licensing</option>
                            <option>Visa & Residency</option>
                            <option>Tax Advisory</option>
                            <option>Pricing & Plans</option>
                            <option>General Inquiry</option>
                          </select>
                        </div>
                      </div>

                      <div className="col-lg-12">
                        <div className="custom-frm-bx">
                          <textarea
                            name="message"
                            className="form-control"
                            placeholder="Enter Your Message"
                            value={form.message}
                            onChange={(e) => set("message", e.target.value)}
                            required
                            rows={4}
                          />
                        </div>
                      </div>

                      <div className="col-lg-12">
                        <div className="mt-2">
                          <button
                            type="submit"
                            className="lg-thm-btn fz-16"
                            disabled={loading}
                          >
                            {loading ? "Sending..." : "Submit Message"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Contact;

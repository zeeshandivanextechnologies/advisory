import { useState } from 'react';
import { Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiZap, FiLock, FiGlobe, FiClipboard } from "react-icons/fi";
import {
    FiHome,
    FiFileText,
    FiCreditCard,
    FiDollarSign,
    FiCheckCircle,
    FiAward,
    FiUsers
} from "react-icons/fi";

import {
    FiUpload,
    FiUser,
    FiCalendar
} from "react-icons/fi";


// ── Dots indicator ────────────────────────────────────────
const Dots = ({ total, active }) => (
    <div className='dots-box'>
        {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
                width: i === active ? 24 : 8,
                height: 8,
                borderRadius: 100,
                background: i === active ? '#BDC3C7' : '#3A3F45',
                transition: 'all .3s',
            }} />
        ))}
    </div>
);



export default function Boarding() {
    // const nav = useNavigate();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const dashPath   = user?.role === 'advisor' ? '/advisor/dashboard' : '/user/dashboard';




    const skip = () => navigate('/login');
    const next = () => step < 2 ? setStep(s => s + 1) : navigate('/register');
    const back = () => step > 0 ? setStep(s => s - 1) : navigate('/');




    const [selected, setSelected] = useState([]);
    const toggle = (label) =>
        setSelected(prev =>
            prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
        );

    const NEEDS = [
        { icon: <FiHome />, label: 'Start a Business', desc: 'Company formation & registration in the GCC' },
        { icon: <FiFileText />, label: 'Get a License', desc: 'Business licensing & trade permits' },
        { icon: <FiCreditCard />, label: 'Visa & Residency', desc: 'Work permits & residency applications' },
        { icon: <FiDollarSign />, label: 'Tax Advisory', desc: 'VAT, corporate tax & compliance' },
        { icon: <FiClipboard />, label: 'Contract Review', desc: 'Legal document drafting & review' },
        { icon: <FiCheckCircle />, label: 'Compliance', desc: 'Regulatory & corporate governance' },
        { icon: <FiAward />, label: 'Trademark / IP', desc: 'Brand protection & IP rights' },
        { icon: <FiUsers />, label: 'M&A Advisory', desc: 'Mergers, acquisitions & due diligence' },
    ];

    const NEXT_STEPS = [
        { icon: FiFileText, text: "Create your first advisory case" },
        { icon: FiUpload, text: "Upload required documents" },
        { icon: FiUser, text: "Connect with a verified advisor" },
        { icon: FiCalendar, text: "Book your first consultation" },
    ];


    const WRAPPER = ({ children, rightPanel }) => (
        <section className='onboarding-section'>
            <div className='container-fluid px-lg-0'>
                <div className='row '>
                    <div className='col-lg-12 px-0'>
                        <div className='onboarding-header'>
                            <div className='onboarding-logo-box'>
                                <NavLink to="/"> <span className='fz-28 fw-700 text-white'>AunAdvisory</span> </NavLink>
                            </div>
                            <div className='onboarding-skip-box'>
                                <button onClick={skip} className='skip-btn' onClick={() => navigate('/user/dashboard')}>
                                    Skip Intro
                                </button>
                            </div>
                        </div>
                        <div className='onboarding-dots'>
                            <span><Dots total={3} active={step} className /></span>
                        </div>
                    </div>
                </div>
                <div className='row justify-content-center'>
                    <div className='col-lg-12'>
                        {children}
                    </div>
                </div>

                <div className="step-footer">
                    {step !== 0 && (
                        <button onClick={back} className="back-btn">
                            Back
                        </button>
                    )}

                    <button
                        onClick={next}
                        className={`thm-btn fz-16 px-4 ${step === 2 ? 'active' : ''}`}>
                        {step === 0 ? 'Get Started' : step === 1 ? 'Next' : 'Enter your Workspace'}
                    </button>
                </div>
            </div>
        </section>


    );

    // ── Step 0: Welcome ───────────────────────────────────────
    if (step === 0) return (
        <WRAPPER>
            <div className='onboarding-content'>
                <div className='row'>
                    <div className='col-lg-12'>
                        <h2>Welcome, {user?.full_name?.split(' ')[0]}!</h2>
                        <p>
                            Your account is ready. Let's get you set up so we can match you with the right advisor for your business needs.
                        </p>
                        <div>

                            <div className="feature-grid">
                                {[
                                    { icon: <FiZap />, text: 'Expert advisors available now' },
                                    { icon: <FiLock />, text: 'Fully secure & confidential' },
                                    { icon: <FiGlobe />, text: 'GCC jurisdiction specialists' },
                                    { icon: <FiClipboard />, text: 'End-to-end case management' },
                                ].map(({ icon, text }) => (
                                    <div key={text} className="feature-card">
                                        <span className="feature-icon">{icon}</span>
                                        <span className="feature-text">{text}</span>
                                    </div>
                                ))}
                            </div>


                        </div>
                    </div>
                </div>
            </div>
        </WRAPPER>
    );

    // ── Step 1: AI Legal Guidance ─────────────────────────────
    if (step === 1) return (
        <WRAPPER>
            <div className='guidance-section'>
                <div className='row justify-content-center'>
                    <div className='col-lg-6'>
                        <div className='onboarding-need-cards'>
                            <div className='onboarding-need-content'>
                                <h2>What do you need help with?</h2>
                                <p>
                                    Select all that apply — we'll personalise your advisory experience
                                </p>
                            </div>
                            <div className="aun-needs-grid">
                                {NEEDS.map(({ icon, label, desc }) => (
                                    <div
                                        key={label}
                                        className={`aun-need-card ${selected.includes(label) ? 'aun-selected' : ''}`}
                                        onClick={() => toggle(label)}
                                    >
                                        <div className="aun-need-icon">{icon}</div>
                                        <h5 className="aun-need-title">{label}</h5>
                                        <p className="aun-need-desc">{desc}</p>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </WRAPPER>
    );

    // ── Step 2: Connect with Legal Experts ────────────────────
    return (
        <WRAPPER>
            <div className='expert-section'>
                <div className='row justify-content-center'>
                    <div className='col-lg-4'>
                        <div className='onboarding-need-cards'>
                            <div className='onboarding-need-content'>
                                <div style={{ fontSize: 52, marginBottom: 10 }}>🚀</div>
                                <h2>You're all set!</h2>
                                <p >
                                    Your profile is complete. You can now connect with verified advisors, create cases, and upload documents — all in one place.
                                </p>
                            </div>

                            <div className="next-box">
                                <div className="next-title">What's next</div>

                                {NEXT_STEPS.map(({ icon: Icon, text }) => (
                                    <div key={text} className="next-item">
                                        <Icon className="next-icon" />
                                        <span>{text}</span>
                                    </div>
                                ))}
                            </div>



                        </div>

                    </div>


                </div>

            </div>

        </WRAPPER>
    );
}
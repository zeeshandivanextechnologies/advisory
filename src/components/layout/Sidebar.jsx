import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IoIosClose } from "react-icons/io";

import { FiBarChart2, FiCalendar, FiFolder, FiHome, FiLogOut } from "react-icons/fi";
import { FiBriefcase } from "react-icons/fi";
import { FiFileText } from "react-icons/fi";
import { FiUsers } from "react-icons/fi";
import { FiMessageSquare } from "react-icons/fi";
import { FiCreditCard } from "react-icons/fi";
import { FiBell } from "react-icons/fi";
import { FiSettings } from "react-icons/fi";


// const Icon = ({ d, extraPath }) => (
//   <svg className="sidebar-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
//     {extraPath && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={extraPath} />}
//   </svg>
// );

const Icon = ({ icon }) => (
  <span className="sidebar-icon" style={{ display: 'flex', alignItems: 'center', fontSize: 18 }}>
    {icon}
  </span>
);


const ICONS = {
  dashboard: <FiHome />,
  business:  <FiBriefcase />,
  docs:      <FiFileText />,
  users:     <FiUsers />,
  consult:   <FiMessageSquare />,
  plans:     <FiCreditCard />,
  bell:      <FiBell />,
  settings:  <FiSettings />,
  logout:    <FiLogOut />,
  revenue:   <FiBarChart2 />,
  cases:     <FiFolder /> ,
  schedule:  <FiCalendar />
};

const navItems = {
  user: [
    { label: 'Main', links: [
      { to: '/user/dashboard',        icon: 'dashboard', text: 'Dashboard' },
      { to: '/user/start-business',   icon: 'business',  text: 'Start a Business' },
      { to: '/user/documents',        icon: 'docs',      text: 'Upload Documents' },
      { to: '/user/connect-advisor',  icon: 'users',     text: 'Connect Advisor' },
      { to: '/user/consultations',    icon: 'consult',   text: 'Consultations' },
      { to: '/user/plans',            icon: 'plans',     text: 'Subscription Plans' },
      { to: '/user/notifications',    icon: 'bell',      text: 'Notifications', badge: true },
      { to: '/user/settings',         icon: 'settings',  text: 'Settings' },
    ]},
  ],

  advisor: [
    { label: 'Advisor', links: [
      { to: '/advisor/dashboard',     icon: 'dashboard', text: 'Overview' },
      { to: '/advisor/documents',     icon: 'docs',      text: 'Documents' },
      { to: '/advisor/clients',       icon: 'users',     text: 'Clients' },
      { to: '/advisor/schedule',      icon: 'schedule', text: 'Schedule' },
      { to: '/advisor/notifications', icon: 'bell',      text: 'Notifications', badge: true },
      { to: '/advisor/settings',      icon: 'settings',  text: 'Settings' },
    ]},
  ],
  
  admin: [
    { label: 'Admin Panel', links: [
      { to: '/admin/dashboard',  icon: 'dashboard', text: 'Dashboard' },
      { to: '/admin/users',      icon: 'users',     text: 'All Users' },
      { to: '/admin/advisors',   icon: 'consult',   text: 'Advisors' },
      { to: '/admin/cases',      icon: 'cases',     text: 'All Cases' },
      { to: '/admin/documents',  icon: 'docs',      text: 'Documents' },
      { to: '/admin/revenue',    icon: 'revenue',   text: 'Revenue' },
      { to: '/admin/settings',   icon: 'settings',  text: 'Settings' },
    ]},
  ],
};

const avatarColors = {
  admin:   { bg: 'rgba(220,38,38,0.15)',  color: '#DC2626', border: 'rgba(220,38,38,0.3)' },
  advisor: { bg: 'rgba(22,163,74,0.15)',  color: '#16A34A', border: 'rgba(22,163,74,0.3)' },
  user:    { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: 'rgba(59,130,246,0.3)' },
};

export default function Sidebar({ unread = 0 }) {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const sections         = navItems[user?.role] || [];
  const avColor          = avatarColors[user?.role] || avatarColors.user;
  const initials         = user?.full_name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U';

  const handleLogout = () => { logout(); navigate('/auth/login'); };


  // Mobile Close Sidebar
  const handleClose = (e) => {
  const dashboard = document.querySelector(".client-dashboard-left-side");
  const overlay   = document.querySelector(".client-mobile-overlay");
  dashboard?.classList.remove("mobile-show");
  overlay?.classList.remove("show");
};

const handleCloseBtn = (e) => {
  e.preventDefault();
  handleClose();
};
  

  return (
    
    <>

    {/* <aside className="sidebar">
      <div className="sidebar-logo">
        <NavLink to="/">Aun<span style={{ color: 'var(--accent)' }}>Advisory</span></NavLink>
      </div>

      <div className="sidebar-user">
        <div className="sidebar-avatar" style={{ background: avColor.bg, color: avColor.color, borderColor: avColor.border }}>
          {initials}
        </div>
        <div className="sidebar-user-info">
          <div className="user-name">{user?.full_name || 'User'}</div>
          <div className="user-role" style={user?.role === 'admin' ? { color: '#DC2626', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } : {}}>
            {user?.role === 'admin' ? 'Administrator' : user?.role === 'advisor' ? 'Consultant' : 'Subscriber'}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <Icon d={ICONS[link.icon]} />
                {link.text}
                {link.badge && unread > 0 && (
                  <span className="sidebar-badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', color: 'var(--red)' }}>
          <Icon d={ICONS.logout} />
          Log Out
        </button>
      </div>
    </aside> */}

    <aside className=" sidebar client-dashboard-left-side text-white min-vh-100 flex-shrink-0">
  <div className="text-end admn-mob-close-bx">
    <NavLink
      to="#"
      className="d-lg-none tp-mobile-close-btn modal-close-btn" onClick={handleCloseBtn}
    >
      <IoIosClose />
    </NavLink>
  </div>

  <div className="sidebar-logo task-vendr-left-title-bx">
    <NavLink to="/" className="dash-hp-title">
      Aun<span style={{ color: 'var(--accent)' }}>Advisory</span>
    </NavLink>
  </div>

  <div className="sidebar-user user-ai-content">
    <div className="sidebar-avatar user-avatar">
      {initials}
    </div>

    <div className="sidebar-user-info ai-user-info">
      <div className="user-name ai-user-name">
        <h4>{user?.full_name || 'User'}</h4>
      </div>

      <div
        className="user-role ai-user-plan"
        style={
          user?.role === 'admin'
            ? {
                color: '#DC2626',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }
            : {}
        }
      >
        {user?.role === 'admin'
          ? 'Administrator'
          : user?.role === 'advisor'
          ? 'Consultant'
          : 'Subscriber'}
      </div>
    </div>
  </div>


  <nav className="sidebar-nav left-navigation flex-grow-1 overflow-auto ai-user-navlist">
    {sections.map((section) => (
      <div key={section.label}>
        <div className="sidebar-section-label">{section.label}</div>

        {section.links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={handleClose} 
            className={({ isActive }) =>
              `sidebar-link ai-sidebar-nav${isActive ? ' active' : ''}`
            }
          >
             <Icon icon={ICONS[link.icon]} />
            {link.text}

            {link.badge && unread > 0 && (
              <span className="sidebar-badge">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    ))}
  </nav>


  <div className="sidebar-bottom sidebar-logout-wrap">
    {/* <button
      className="sidebar-link sidebar-logout-btn"
      onClick={handleLogout}
      style={{ width: '100%', color: 'var(--red)' }}
    >
      <Icon d={ICONS.logout} className="sidebar-logout-icon" />
      Log Out
    </button> */}

    <button
  className="sidebar-logout-btn"
  onClick={handleLogout}
  style={{ width: '100%', color: 'var(--red)' }}
>
  {ICONS.logout}
  Log Out
</button>

  </div>

</aside>

    
    </>

  );
}

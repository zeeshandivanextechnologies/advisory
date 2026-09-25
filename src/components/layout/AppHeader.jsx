import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { IoIosNotifications } from 'react-icons/io';
import { FaGear } from 'react-icons/fa6';
import { LuChevronsLeftRight, LuDot } from 'react-icons/lu';

export default function AppHeader({ breadcrumb, badge, unread = 0, action }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const notifPath = `/${user?.role}/notifications`;
  const settPath  = `/${user?.role}/settings`;
  const [isOpen, setIsOpen] = useState(true);

   
 useEffect(() => {
    let overlay = document.querySelector(".client-mobile-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.classList.add("client-mobile-overlay");
      document.body.appendChild(overlay);
    }

    const dashboard = document.querySelector(".client-dashboard-left-side");
    const menuBtn   = document.querySelector(".tp-mobile-menu-btn");
    const closeBtns = document.querySelectorAll(".tp-mobile-close-btn, .client-mobile-overlay");

    const handleMenuClick = (e) => {
      e.preventDefault();
      if (window.innerWidth < 992) {
        dashboard.classList.add("mobile-show");
        overlay.classList.add("show");
      } else {
        dashboard.classList.toggle("hide-sidebar");
      }
    };
    const handleClose = (e) => {
      e.preventDefault();
      dashboard.classList.remove("mobile-show");
      overlay.classList.remove("show");
    };

    menuBtn?.addEventListener("click", handleMenuClick);
    closeBtns.forEach((btn) => btn.addEventListener("click", handleClose));
    return () => {
      menuBtn?.removeEventListener("click", handleMenuClick);
      closeBtns.forEach((btn) => btn.removeEventListener("click", handleClose));
    };
  }, []);

  
   

  return (
    
    <>
    {/* <header className="app-header">
      <div className="app-header-left">
        {badge && (
          <>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, fontFamily: 'var(--font-h)', letterSpacing: '0.06em', background: '#FEF2F2', color: '#DC2626' }}>
              {badge}
            </span>
            <span className="breadcrumb-sep">·</span>
          </>
        )}
        <span className="breadcrumb-current">{breadcrumb}</span>
      </div>

      <div className="app-header-right">
        {action && action}

        <button className="icon-btn" onClick={() => navigate(notifPath)} title="Notifications">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unread > 0 && <span className="notif-dot" />}
        </button>

        <button className="icon-btn" onClick={() => navigate(settPath)} title="Settings">
          <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx={12} cy={12} r={3} strokeWidth={1.5} />
          </svg>
        </button>
      </div>
    </header> */}


    <div className="client-tp-header-section d-flex align-items-center justify-content-between w-100 py-2 px-3">
  <div className="dash-vendr-header-left-bx d-flex align-items-center">
    <a href="#" className="tp-mobile-menu-btn" onClick={(e) => { e.preventDefault(); setIsOpen((prev) => !prev); }}>
      <LuChevronsLeftRight />
    </a>
   

    <div className="ai-user-content d-flex align-items-center">
      
      {badge && (
        <>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 4,
              fontFamily: 'var(--font-h)',
              letterSpacing: '0.06em',
              background: '#FEF2F2',
              color: '#DC2626'
            }}
          >
            {badge}
          </span>
          <span className="breadcrumb-sep text-black"><LuDot /></span>
        </>
      )}
      <h5 className="mb-0">{breadcrumb}</h5>
    </div>
  </div>

  <div className="tp-right-admin-bx ai-legal-mobile d-flex align-items-center gap-2">
    
    {action && action}

    <button
      onClick={() => navigate(notifPath)}
      className="tp-bell-icon fz-24 position-relative"
      title="Notifications"
    >
      <IoIosNotifications />
      {unread > 0 && <span className="notif-dot" />}
    </button>

    <button
      onClick={() => navigate(settPath)}
      className="tp-bell-icon fz-20"
      title="Settings"
    >
      <FaGear />
    </button>

  </div>
</div>

    </>

  );
}

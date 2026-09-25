import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, EmptyState, showToast } from '../../components/common/index';
import { notifAPI } from '../../services/api';
import { FiBell } from 'react-icons/fi';
import { FiFileText } from "react-icons/fi";
import { FiAlertCircle } from "react-icons/fi";
import { FiDollarSign } from "react-icons/fi";
import { FiCalendar } from "react-icons/fi";
import { IoAlert } from 'react-icons/io5';
import { IoIosNotifications } from 'react-icons/io';


const NOTIF_TYPES = {
  session: {
    icon: <FiCalendar />,
    color: '#3B82F6',
    bg: '#EFF6FF'
  },
  case_update: {
    icon: <FiFileText />,
    color: '#3B82F6',
    bg: '#EFF6FF'
  },
  billing: {
    icon: <FiDollarSign />,
    color: '#3B82F6',
    bg: '#EFF6FF'
  },
  document: {
    icon: <FiAlertCircle />,
    color: '#EF4444',
    bg: '#FEE2E2'
  },
  action: {
    icon: <FiBell />,
    color: '#3B82F6',
    bg: '#EFF6FF'
  }
};

const getType = (type = '') => {
  if (type.includes('document'))     return NOTIF_TYPES.document;
  if (type.includes('billing'))      return NOTIF_TYPES.billing;
  return NOTIF_TYPES.session;
};

export default function Notifications() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    notifAPI.list({ limit: 50 })
      .then(r => {
        setNotifs(r.data.data || []);
        setUnread(r.data.meta?.unread || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await notifAPI.markRead({});
      setUnread(0);
      setNotifs(p => p.map(n => ({ ...n, is_read: 1 })));
    } catch {
      showToast('Failed to mark as read', 'error');
    }
  };

  const formatTime = (dt) => {
    const d = new Date(dt);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)   return 'Just Now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `Today · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return `${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
  };

  

  

  return (
    <>
      <AppHeader breadcrumb="Notifications" unread={unread} />

      <div className="main-content flex-grow-1 p-3 overflow-auto">

        <div style={{ marginBottom: 10 }}>
          <h2 className='page-title'>Notifications</h2>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h5 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 3 }}>
                Notifications
              </h5>
              {unread > 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>{unread} unread</p>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark-4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-h)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? <Spinner /> : notifs.length ? notifs.map(n => {
            const t = getType(n.type);
            const isAlert = n.type?.includes('document') || n.title?.toLowerCase().includes('action');

            return (
              <div
                key={n.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--border-light)',
                  background: n.is_read ? 'white' : '#FAFAFA',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'white' : '#FAFAFA'}
              >

                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: isAlert ? '#FEE2E2' : '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isAlert ? 13 : 16, fontWeight: 700, color: isAlert ? '#EF4444' : '#3B82F6',
                }}>
                  {isAlert ? <IoAlert />  : <IoIosNotifications />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000000', marginBottom: 3 }}>
                    {n.title}
                    {!n.is_read && (
                      <span style={{ marginLeft: 8, width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block', verticalAlign: 'middle' }} />
                    )}
                  </h4>
                  <h6 style={{ fontSize: 14, fontWeight: 500, color: '#4A4949', lineHeight: 1.2, marginBottom: 0 }}>{n.body}</h6>
                  <p style={{ fontSize: 12, fontWeight: 400, color: '#A6A5A4', marginBottom: 0 }}>
                    {n.link && <span style={{ color: 'var(--blue)', marginRight: 8 }}>{n.link}</span>}
                    {formatTime(n.created_at)}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div >
              <EmptyState icon={<FiBell />} title="No notifications" text="You're all caught up!" />
            </div>
          )}
        </div>
      </div>

    </>
  );
}

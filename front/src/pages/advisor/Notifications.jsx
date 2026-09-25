import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, EmptyState, showToast } from '../../components/common/index';
import { notifAPI } from '../../services/api';
import { FaBell } from "react-icons/fa";
import {
  FiFileText,
  FiClipboard,
  FiCalendar,
  FiBell
} from "react-icons/fi";

export default function AdvisorNotifications() {
  const [notifs,  setNotifs]  = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notifAPI.list({ limit: 50 })
      .then(r => {
        setNotifs(r.data.data);
        setUnread(r.data.meta?.unread || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    try {
      await notifAPI.markRead({});
      setUnread(0);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {
      showToast('Failed to mark as read', 'error');
    }
  };

 const getIcon = (type = '') => {
  if (type.includes('document'))     return <FiFileText />;
  if (type.includes('case'))         return <FiClipboard />;
  if (type.includes('consultation')) return <FiCalendar />;
  return <FiBell />;
};

  return (
    <>
      <AppHeader breadcrumb="Notifications" unread={unread} />

      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-0">
          <div>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button className="btn btn-outline-dark btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {loading ? <Spinner /> : (
          <div className="table-card">
            {notifs.length ? notifs.map(n => (
              <div key={n.id} style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-light)',
                background: n.is_read ? 'white' : '#F0F9FF',
                display: 'flex', gap: 12,
              }}>
                <div style={{ fontSize: 25, flexShrink: 0, }}>
                  {getIcon(n.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000', }}>
                    {n.title}
                    {!n.is_read && (
                      <span style={{
                        marginLeft: 8, width: 7, height: 7,
                        background: 'var(--blue)', borderRadius: '50%',
                        display: 'inline-block',
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: '#4A4949)' }}>{n.body}</div>
                  <div style={{ fontSize: 12, color: '#A6A5A4' }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )) : (
              <EmptyState icon={<FaBell />}  title="No notifications" text="You're all caught up!" />
            )}
          </div>
        )}
      </div>

    </>
  );
}

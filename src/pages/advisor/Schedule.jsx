import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState } from '../../components/common/index';
import { userAPI } from '../../services/api';
import { FaCalendarAlt } from "react-icons/fa";
import {
  FiVideo,
  FiPhone,
  FiUsers,
  FiCalendar
} from "react-icons/fi";

export default function AdvisorSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    userAPI.getConsultations({ limit: 50 })
      .then(r => setSessions(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = sessions.reduce((acc, s) => {
    const date = new Date(s.scheduled_at).toLocaleDateString('en-GB', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  // const mediumIcon = (m) => ({ video: '📹', phone: '📞', in_person: '🤝' }[m] || '📅');
  const mediumIcon = (m) => ({
  video: <FiVideo />,
  phone: <FiPhone />,
  in_person: <FiUsers />,
}[m] || <FiCalendar />);







  return (
    <>
      <AppHeader breadcrumb="Schedule" />

      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h1 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>My Schedule</h1>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{sessions.length} total sessions</p>
          </div>
        </div>

        {loading ? <Spinner /> : Object.entries(grouped).length ? (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-h)',
                color: 'var(--text-dark-4)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 10,
              }}>
                {date}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map(s => (
                  <div key={s.id} className="card-light" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 30, textAlign: 'center', flexShrink: 0 }}>
                      {mediumIcon(s.medium)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 3 }}>
                        {s.client_name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>
                        {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' · '}{s.duration_min} min
                        {' · '}{s.medium?.replace('_', ' ')}
                      </div>
                    </div>
                    <Badge status={s.status} />
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState icon={<FaCalendarAlt  />}  title="No sessions scheduled" text="Sessions appear here when clients book with you" />
        )}
      </div>

    </>
  );
}

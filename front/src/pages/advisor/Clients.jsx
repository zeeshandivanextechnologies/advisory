// ── advisor/Clients.jsx ──────────────────────────────────────
import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState } from '../../components/common/index';
import { userAPI } from '../../services/api';
import { FiUsers } from 'react-icons/fi';

export default function AdvisorClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getConsultations({ limit: 100 })
      .then(r => {
        const unique = {};
        (r.data.data || []).forEach(c => {
          if (!unique[c.user_id]) unique[c.user_id] = c;
        });
        setClients(Object.values(unique));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);



  return (
    <>
      <AppHeader breadcrumb="Clients" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>My Clients</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{clients.length} clients</p>
          </div>
        </div>

        <div className="ai-table-section">
          <div className='table-responsive'>
          {loading ? <Spinner /> : (
            <table className="table billing-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Last Session</th>
                  <th>Medium</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.length ? clients.map(c => (
                  <tr key={c.id}>
                    <td>{c.client_name}</td>
                    <td >
                      {new Date(c.scheduled_at).toLocaleDateString()}
                    </td>
                    <td >{c.medium}</td>
                    <td><Badge status={c.status} /></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState icon={<FiUsers />}  title="No clients yet" text="Clients will appear once they book with you" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        </div>
      </div>

    </>
  );
}

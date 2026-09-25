import React, { useState, useEffect } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { StatCard, Badge, Spinner, EmptyState, showToast } from '../../components/common/index';
import { advisorAPI, documentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FiUsers,
  FiCalendar,
  FiBarChart2,
  FiStar
} from "react-icons/fi";
import { FiFileText } from "react-icons/fi";


export default function AdvisorDashboard() {
  const { user }        = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    advisorAPI.getDashboard()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const approveDoc = async (docId) => {
    try {
      await documentAPI.review(docId, { status: 'approved' });
      showToast('Document approved');
      setData(prev => ({
        ...prev,
        recent_docs: prev.recent_docs.map(d =>
          d.id === docId ? { ...d, status: 'approved' } : d
        ),
      }));
    } catch {
      showToast('Action failed', 'error');
    }
  };

  if (loading) return <><AppHeader breadcrumb="Dashboard" /><Spinner /></>;

  const { stats, recent_docs, upcoming } = data || {};


const tempDocs = [
  {
    id: 1,
    client_name: "Rahul Sharma",
    original_name: "Aadhar Card.pdf",
    category: "identity",
    status: "pending",
  },
  {
    id: 2,
    client_name: "Priya Verma",
    original_name: "Bank Statement.pdf",
    category: "finance",
    status: "approved",
  },
  {
    id: 3,
    client_name: "Amit Singh",
    original_name: "Passport Copy.pdf",
    category: "travel",
    status: "pending",
  },
];

const docsToShow = recent_docs?.length ? recent_docs : tempDocs;

  return (
    <>
      <AppHeader breadcrumb="Dashboard" />

      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>
              Good morning, {user?.full_name?.split(' ')[0]}
            </h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>Here's your advisory dashboard for today</p>
          </div>
        </div>

        <div className="stats-grid">
  <StatCard 
    icon={<FiUsers />} 
    label="Active Clients"     
    value={stats?.active_clients ?? '—'} 
    sub="+3 this month" 
  />

  <StatCard 
    icon={<FiCalendar />} 
    label="Upcoming Sessions"  
    value={stats?.upcoming_sessions ?? '—'} 
    sub="Scheduled" 
    borderColor="var(--green)" 
  />

  <StatCard 
    icon={<FiBarChart2 />} 
    label="Active Cases"       
    value={stats?.active_cases ?? '—'} 
    sub="In progress" 
    borderColor="var(--blue)" 
  />

  <StatCard 
    icon={<FiStar />} 
    label="Avg. Rating"        
    value="—" 
    sub="From clients" 
    borderColor="var(--orange)" 
  />
</div>

        <div className='session-credit-cards'>
          {/* Upcoming Sessions */}
          <div className="ai-table-section">
            <div className="table-header">
              <h5 className="fz-14 text-black fw-600 mb-0">Upcoming Sessions</h5>
            </div>
           <div className='table-responsive'>
             <table className="table billing-table align-middle mb-0">
              <thead>
                <tr><th>Client</th><th>Date & Time</th><th>Medium</th><th>Status</th></tr>
              </thead>
              <tbody>
                {upcoming?.length ? upcoming.map(s => (
                  <tr key={s.id}>
                    <td>{s.client_name}</td>
                    <td>
                      {new Date(s.scheduled_at).toLocaleString()}
                    </td>
                    <td>{s.medium}</td>
                    <td><Badge status={s.status} /></td>
                  </tr>
                )) : (
                  <tr>
                 <td colSpan={4}>
                  <EmptyState 
                    icon={<FiCalendar />} 
                    title="No upcoming sessions" 
                  />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
           </div>
          </div>

      


          {/* Pending Documents */}
          <div className="ai-table-section">
            <div className="table-header">
              <h5 className="fz-14 text-black fw-600 mb-0">Pending Documents</h5>
            </div>
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0">
              <thead>
                <tr><th>Client</th><th>Document</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {recent_docs?.length ? recent_docs.map(d => (
                  <tr key={d.id}>
                    <td>{d.client_name}</td>
                    <td>
                      <div className='plan-table-content'>
                        <h5>{d.original_name}</h5>
                      <p>{d.category?.toUpperCase()}</p>
                      </div>
                    </td>
                    <td><Badge status={d.status} /></td>
                    <td>
                      {d.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => approveDoc(d.id)}>
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState 
  icon={<FiFileText />} 
  title="No pending documents" 
/>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { StatCard, Badge, Spinner, EmptyState } from '../../components/common/index';
import { userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FaBuilding, FaCalendarCheck, FaClipboardList, FaFile, FaPlus, FaUserTie } from 'react-icons/fa6';
import { FaCalendarAlt, FaFileAlt, FaSyncAlt } from 'react-icons/fa';
import { IoMdDocument } from 'react-icons/io';

export default function UserDashboard() {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userAPI.getDashboard()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return <><AppHeader breadcrumb="Dashboard" /><Spinner /></>;

  const { stats, recent_cases, recent_docs } = data || {};

  return (
    <>
      <AppHeader breadcrumb="Dashboard" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4  style={{fontSize : "24px", fontWeight : 600, color : "#000", marginBottom : 0}} >{greeting()}, {user?.full_name?.split(' ')[0]}</h4>
            <p style={{fontSize : "16px", fontWeight : 400, color : "#4A4949"}}>Here's your advisory dashboard for today</p>
          </div>
          <button className="thm-btn" onClick={() => navigate('/user/start-business')}>
            <FaPlus /> <span className='session-title-hd'>Start New Case</span>
          </button>
        </div>

        


        

        <div className="stats-grid">
          <StatCard icon={<FaClipboardList />}  label="Total Cases"       value={stats?.total_cases}       sub="Lifetime" />
          <StatCard icon={<FaSyncAlt />} label="Open Cases"        value={stats?.open_cases}        sub="In progress" borderColor="var(--blue)" />
          <StatCard icon={<FaFileAlt />} label="Documents"         value={stats?.total_docs}        sub="Uploaded" />
          <StatCard icon={<FaCalendarAlt />}  label="Upcoming Sessions" value={stats?.upcoming_sessions} sub="Scheduled" borderColor="var(--green)" />
        </div>

        <div className='advisor-recent-case-box'>
          {/* Recent Cases */}
          <div className="ai-table-section">
            <div className="table-header">
              <span className="table-title fz-14">Recent Cases</span>
              <button className="ai-thm-btn outline" onClick={() => navigate('/user/start-business')}>
                View All
              </button>
            </div>
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Case</th><th>Category</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recent_cases?.length ? recent_cases.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5 >{c.title}</h5>
                      <p >{c.case_number}</p>
                      </div>
                    </td>
                    <td >
                      {c.category?.replace(/_/g, ' ')}
                    </td>
                    <td><Badge status={c.status} /></td>
                    <td >{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><EmptyState icon={<IoMdDocument /> } title="No cases yet" text="Start your first case" /></td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Recent Documents */}
            <div className="ai-table-section">
          <div className='table-responsive'>
            <div className="table-header">
              <span className="table-title fz-14">Recent Documents</span>
              <button className="btn btn-outline-dark btn-sm" onClick={() => navigate('/user/documents')}>View All</button>
            </div>
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Document</th><th>Category</th><th>Status</th></tr></thead>
              <tbody>
                {recent_docs?.length ? recent_docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5 className="doc-name">{d.original_name}</h5>
                      <p className="doc-meta">{new Date(d.created_at).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td >{d.category}</td>
                    <td><Badge status={d.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={3}><EmptyState icon={<FaFile /> } title="No documents yet" text="Upload your first document" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ai-table-section" style={{padding : "16px"}} >
          <h3 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 600, marginBottom: 16, color: 'var(--text-dark)' }}>
            Quick Actions
          </h3>
          <div className='advisor-quick-action-box'>
            {[
              { icon: <FaBuilding />,label: 'Start a Business',    to: '/user/start-business' },
               { icon: <FaFileAlt />, label: 'Upload Document',     to: '/user/documents' },
              { icon: <FaUserTie />, label: 'Find an Advisor',     to: '/user/connect-advisor' },
              { icon: <FaCalendarCheck />, label: 'Book Consultation',   to: '/user/book-consultation' },
            ].map(({ icon, label, to }) => (
              <button key={to}
                onClick={() => navigate(to)}
                style={{
                  padding: '16px 12px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                  background: 'var(--grey-shade)', cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.2s', fontFamily: 'var(--font-h)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--lt-grey)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--grey-shade)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              >
                <h6 style={{ fontSize: 24, marginBottom:10 }}>{icon}</h6>
                <h5 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '0.02em', marginBottom: 0 }}>{label}</h5>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

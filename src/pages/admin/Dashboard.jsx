import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AppHeader from '../../components/layout/AppHeader';
import { StatCard, Badge, Spinner, EmptyState, showToast } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { FiUsers, FiTarget, FiFileText, FiDollarSign } from "react-icons/fi";
import { FaFile, FaUser } from 'react-icons/fa6';
import { FaArrowDown } from 'react-icons/fa';

export default function AdminDashboard() {
  const navigate          = useNavigate();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('30d'); // FIX: working filter state
  const { currency }      = useSettings();

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getDashboard()
      .then(r => setData(r.data.data))
      .catch(() => showToast('Failed to load dashboard', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // FIX: Real CSV export from actual data
  const handleExport = () => {
    if (!data) return;
    const rows = [
      ['Name', 'Email', 'Plan', 'Joined', 'Status'],
      ...(data.recent_users || []).map(u => [
        u.full_name, u.email, u.plan,
        new Date(u.created_at).toLocaleDateString('en-GB'),
        u.is_active ? 'Active' : 'Suspended',
      ]),
    ];
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `aunadvisory-report-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported successfully');
  };

  if (loading) return <><AppHeader breadcrumb="Dashboard" badge="SUPER ADMIN" /><Spinner /></>;

  const { stats, deltas, recent_users, recent_cases, revenue_chart } = data || {};

  // FIX: Build real delta strings from API data
  const buildDelta = (val) => val > 0 ? `+${val} this month` : val === 0 ? 'No change this month' : `${val} this month`;

  return (
    <>
      <AppHeader breadcrumb="Dashboard" badge="SUPER ADMIN" />
      
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Platform Overview</h4> 
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>Complete administrative overview — AunAdvisory</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems : "center"}}>
            {/* FIX: Working date filter with onChange */}
            <select
              className="form-select"
              style={{ fontSize: 14, padding: '8px 32px 8px 12px', width: 'auto' }}
              value={period}
              onChange={e => { setPeriod(e.target.value); load(); }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            {/* FIX: Export button with real handler */}
            <button className="ai-thm-btn" onClick={handleExport}> <FaArrowDown /> <span className='mobile-ai-secure-title'>Export Report</span> </button>
          </div>
        </div>

        {/* Stats — FIX: real deltas from API */}
       <div className="stats-grid advisor-quick-action-box">

          <StatCard
            icon={<FiUsers />}
            label="Total Users"
            value={stats?.total_users?.toLocaleString()}
            sub={buildDelta(deltas?.new_users_month)}
            borderColor="var(--blue)"
          />

          <StatCard
            icon={<FiTarget />}
            label="Active Advisors"
            value={stats?.total_advisors}
            sub={buildDelta(deltas?.new_advisors_month)}
            subColor="var(--green)"
            borderColor="var(--green)"
          />

          <StatCard
            icon={<FiFileText />}
            label="Active Cases"
            value={stats?.active_cases}
            borderColor="var(--orange)"
          />

          <StatCard
            icon={<FiDollarSign />}
            label="Monthly Revenue"
            value={`${currency} ${Number(stats?.monthly_revenue || 0).toLocaleString()}`}
            borderColor="#7C3AED"
          />

        </div>

        <div className='advisor-admin-general-tab mb-3'>
          {/* Recent Users */}
          <div className="ai-table-section">
            <div className="table-header">
              <h5 className="fz-14 text-black fw-600 mb-0">Recent Sign-ups</h5>
              <button className="ai-thm-btn outline" onClick={() => navigate('/admin/users')}>View All</button>
            </div>
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>User</th><th>Plan</th><th>Joined</th><th>Status</th></tr></thead>
              <tbody>
                {recent_users?.length ? recent_users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5>{u.full_name}</h5>
                      <p>{u.email}</p>
                      </div>
                    </td>
                    <td><Badge status={u.plan} /></td>
                    <td>
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td><Badge status={u.is_active ? 'active' : 'suspended'} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><EmptyState icon={<FaUser />}title="No users yet" /></td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

  
          <div className="ai-table-section">
            <div className="table-header">
              <h5 className="fz-14 text-black fw-600 mb-0">Recent Cases</h5>
              <button className="ai-thm-btn outline" onClick={() => navigate('/admin/cases')}>View All</button>
            </div>
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead><tr><th>Case</th><th>Category</th><th>User</th><th>Status</th></tr></thead>
              <tbody>
                {recent_cases?.length ? recent_cases.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5 >{c.title}</h5>
                      <p >{c.case_number}</p>
                      </div>
                    </td>
                    <td>
                      {c.category?.replace(/_/g, ' ')}
                    </td>
                    <td>{c.user_name}</td>
                    <td><Badge status={c.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><EmptyState icon={<FaFile />} title="No cases yet" /></td></tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Revenue Chart — FIX: totals cast to Number for recharts */}
        {revenue_chart?.length > 0 && (
          <div className="advisor-legal-cards h-auto">
            <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)', marginBottom: 20 }}>
              Revenue (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenue_chart} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#A6A5A4' }} />
                <YAxis tick={{ fontSize: 12, fill: '#A6A5A4' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #2F343A', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#BDC3C7' }} itemStyle={{ color: '#FFF' }}
                  formatter={v => [`${currency} ${Number(v).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="total" fill="#BDC3C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </>
  );
}

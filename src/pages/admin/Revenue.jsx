import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import AppHeader from '../../components/layout/AppHeader';
import { StatCard, Badge, Spinner, EmptyState } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { FaArrowDown, FaCreditCard } from 'react-icons/fa6';
import { FiDollarSign, FiClock, FiBarChart2 } from "react-icons/fi";

export default function AdminRevenue() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]   = useState('bar'); // 'bar' | 'line'
  const { currency }      = useSettings();

  useEffect(() => {
    adminAPI.getRevenue()
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <><AppHeader breadcrumb="Revenue" badge="SUPER ADMIN" /><Spinner /></>;

  const { stats, summary = [], recent_payments = [] } = data || {};

  const totalRevenue = Number(stats?.total_revenue || 0);
  const pendingAmount = Number(stats?.pending_amount || 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#111', border: '1px solid #2F343A', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: '#BDC3C7', marginBottom: 4 }}>{label}</div>
        <div style={{ color: '#FFF', fontWeight: 700 }}>
          {currency} {Number(payload[0].value).toLocaleString()}
        </div>
      </div>
    );
  };

  return (
    <>
      <AppHeader breadcrumb="Revenue" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h1 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Revenue & Payments</h1>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>Financial overview of the platform</p>
          </div>
          <button className="ai-thm-btn"><FaArrowDown /> <span className='mobile-ai-secure-title'>Export CSV</span> </button>
        </div>


        <div className="stats-grid advisor-revenue-cards">
          <StatCard
            icon={<FiDollarSign />}
            label="Total Revenue"
            value={`${currency} ${totalRevenue.toLocaleString()}`}
            sub="All time"
            borderColor="var(--green)"
          />

          <StatCard
            icon={<FiClock />}
            label="Pending Payments"
            value={`${currency} ${pendingAmount.toLocaleString()}`}
            sub="Awaiting collection"
            borderColor="var(--orange)"
          />

          <StatCard
            icon={<FiBarChart2 />}
            label="Monthly Transactions"
            value={summary[0]?.transactions || 0}
            sub="Current month"
            borderColor="var(--blue)"
          />
        </div>

        {/* Chart */}
        {summary.length > 0 && (
          <div className="advisor-legal-cards h-auto" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark)' }}>
                Monthly Revenue
              </h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {['bar', 'line'].map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      padding: '5px 12px', fontSize: 11, fontWeight: 700,
                      fontFamily: 'var(--font-h)', letterSpacing: '0.04em',
                      textTransform: 'uppercase', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${view === v ? 'var(--lt-black)' : 'var(--border-light)'}`,
                      background: view === v ? 'var(--lt-black)' : 'white',
                      color: view === v ? 'white' : 'var(--text-dark-4)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              {view === 'bar' ? (
                <BarChart data={summary} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#A6A5A4', fontFamily: 'Montserrat' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#A6A5A4', fontFamily: 'Montserrat' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" fill="#BDC3C7" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={summary}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#A6A5A4', fontFamily: 'Montserrat' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#A6A5A4', fontFamily: 'Montserrat' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#16A34A"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#16A34A' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Transactions Table */}
        <div className="ai-table-section">
          <div className="table-header py-3">
            <h5 className="fz-14 text-black fw-600 mb-0">Recent Transactions</h5>
          </div>
          <div className='table-responsive'>
            <table className="table billing-table align-middle mb-0 ai-case-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent_payments.length ? recent_payments.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.invoice_no}
                  </td>
                  <td >{p.user_name}</td>
                  <td >
                    {Number(p.amount).toLocaleString()}
                  </td>
                  <td >{p.currency}</td>
                  <td >
                    {p.payment_method?.replace('_', ' ')}
                  </td>
                  <td >
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                  </td>
                  <td><Badge status={p.status} /></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<FaCreditCard />} title="No transactions yet" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </>
  );
}

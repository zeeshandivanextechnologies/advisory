import { FaStar } from 'react-icons/fa';
import { FiTarget } from 'react-icons/fi';
import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, showToast } from '../../components/common/index';
import { adminAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';

export default function AdminAdvisors() {
  const [advisors, setAdvisors]   = useState([]);
  const [meta, setMeta]           = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading]     = useState(true);
  const { currency }              = useSettings();

  const load = useCallback((page = 1) => {
    setLoading(true);
    adminAPI.getAdvisors({ search, status: statusFilter, page, limit: 20 })
      .then(r => { setAdvisors(r.data.data); setMeta(r.data.meta); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateAdvisorStatus(id, { status });
      showToast(`Advisor ${status} successfully`);
      load(meta.page);
    } catch {
      showToast('Action failed', 'error');
    }
  };

  return (
    <>
      <AppHeader breadcrumb="Advisors" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Advisor Management</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{meta.total} advisors registered</p>
          </div>
          <select
            className="form-select"
            style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">All Advisors</h5>
            <SearchInput value={search} onChange={setSearch} placeholder="Search advisors…" />
          </div>

          {loading ? <Spinner /> : (
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr>
                  <th>Advisor</th>
                  <th>Specializations</th>
                  <th>Rate / hr</th>
                  <th>Clients</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advisors.length ? advisors.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5>{a.full_name}</h5>
                      <p>{a.email}</p>
                      </div>
                    </td>
                    <td >
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(JSON.parse(a.specializations || '[]')).slice(0, 2).map(s => (
                          <span key={s} className="badge badge-blue">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td >
                      {a.hourly_rate ? `${currency} ${a.hourly_rate}` : '—'}
                    </td>
                    <td >{a.total_clients || 0}</td>
                    <td >
                      <FaStar style={{ color: '#F59E0B', verticalAlign: '-2px' }} /> {Number(a.rating || 0).toFixed(1)}
                    </td>
                    <td><Badge status={a.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.status !== 'active' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => updateStatus(a.id, 'active')}
                          >
                            Approve
                          </button>
                        )}
                        {a.status !== 'suspended' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => updateStatus(a.id, 'suspended')}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={<FiTarget />} title="No advisors found" text="Try adjusting the search filters" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
          <Pagination page={meta.page} total={meta.total} limit={meta.limit} onChange={load} />
        </div>
      </div>
    </>
  );
}

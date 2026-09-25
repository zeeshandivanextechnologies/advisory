import { FiClock } from 'react-icons/fi';
import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, showToast } from '../../components/common/index';
import { serviceAPI, communityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LogHoursModal, RetainerLogModal } from '../../components/services/RetainerModals';
import { MarketBriefs } from '../user/Community';
import { hours, fmtDate } from '../../utils/services';

export default function AdvisorRetainers() {
  const { user }                  = useAuth();
  const [retainers, setRetainers] = useState([]);
  const [briefs, setBriefs]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [logFor, setLogFor]       = useState(null);
  const [viewId, setViewId]       = useState(null);

  const load = useCallback(() => {
    Promise.all([serviceAPI.getRetainers(), communityAPI.getBriefs()])
      .then(([r, b]) => { setRetainers(r.data.data || []); setBriefs(b.data.data || []); })
      .catch(() => showToast('Failed to load retainers', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <><AppHeader breadcrumb="Retainers" /><Spinner /></>;

  return (
    <>
      <AppHeader breadcrumb="Retainers" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Advisory Retainers</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>
              Log time against each client's monthly allotment. Unused hours don't roll over.
            </p>
          </div>
        </div>

        <div className="ai-table-section mb-3">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">My Retainer Clients</h5>
          </div>
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr><th>Client</th><th>This month</th><th>Left</th><th>Minimum term ends</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {retainers.length ? retainers.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="plan-table-content">
                        <h5>{r.client_name}</h5>
                        <p>{r.client_email}</p>
                      </div>
                    </td>
                    <td>{hours(r.month_used)} / {hours(r.monthly_hours)}</td>
                    <td>{hours(r.month_remaining)}</td>
                    <td>{fmtDate(r.min_term_end)}</td>
                    <td><Badge status={r.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="thm-btn" disabled={r.status !== 'active' || Number(r.month_remaining) <= 0} onClick={() => setLogFor(r)}>
                          Log Hours
                        </button>
                        <button className="ai-thm-btn outline" onClick={() => setViewId(r.id)}>View Log</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6}><EmptyState icon={<FiClock />} title="No retainer clients" text="Retainers assigned to you by the admin appear here" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <MarketBriefs briefs={briefs} />
      </div>

      <LogHoursModal open={!!logFor} retainer={logFor} onClose={() => setLogFor(null)} onSaved={load} />
      <RetainerLogModal open={!!viewId} retainerId={viewId} onClose={() => setViewId(null)} currentUserId={user?.id} onChanged={load} />
    </>
  );
}

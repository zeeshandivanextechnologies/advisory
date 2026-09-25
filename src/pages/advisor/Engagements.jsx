import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, showToast } from '../../components/common/index';
import { journeyAPI } from '../../services/api';
import EngagementManager from '../../components/journey/EngagementManager';
import { money } from '../../utils/services';
import { ENGAGEMENT_LABELS, engagementBadge } from '../../utils/journey';
import { FiBriefcase, FiX } from 'react-icons/fi';

export default function AdvisorEngagements() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    journeyAPI.getEngagements()
      .then(r => setRows(r.data.data || []))
      .catch(() => showToast('Failed to load engagements', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <AppHeader breadcrumb="Engagements" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>My Engagements</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>
              Move work through delivery, post Friday updates in the workspace, and complete QA before delivery.
            </p>
          </div>
        </div>

        {selected && (
          <div className="advisor-legal-cards mb-3">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="ai-thm-btn outline" onClick={() => setSelected(null)}><FiX /> Close</button>
            </div>
            <EngagementManager key={selected} engagementId={selected} role="advisor" onChanged={load} />
          </div>
        )}

        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">Assigned to me</h5>
          </div>
          {loading ? <Spinner /> : (
            <div className="table-responsive">
              <table className="table billing-table align-middle mb-0 ai-case-table">
                <thead><tr><th>Client</th><th>Engagement</th><th>Value</th><th>QA</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rows.length ? rows.map(e => (
                    <tr key={e.id}>
                      <td><div className="plan-table-content"><h5>{e.client_name}</h5><p>{e.client_email}</p></div></td>
                      <td><div className="plan-table-content"><h5>{e.title}</h5><p>{e.case_number || 'Workspace after deposit'}</p></div></td>
                      <td>{money(e.amount, e.currency)}</td>
                      <td>{e.qa_total ? `${e.qa_done}/${e.qa_total}` : '—'}</td>
                      <td><Badge status={engagementBadge(e.status)} text={ENGAGEMENT_LABELS[e.status]} /></td>
                      <td><button className="thm-btn" onClick={() => { setSelected(e.id); document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Manage</button></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><EmptyState icon={<FiBriefcase />} title="No engagements assigned" text="The admin assigns engagements to you after the client accepts a proposal" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

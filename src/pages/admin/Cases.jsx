import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, SearchInput, Pagination, Modal, showToast } from '../../components/common/index';
import { caseAPI } from '../../services/api';
import { IoIosDocument } from 'react-icons/io';

const STATUSES   = ['open', 'in_progress', 'pending_docs', 'review', 'closed', 'cancelled'];
const CATEGORIES = ['company_formation', 'licensing', 'visa', 'tax', 'compliance', 'contract_review', 'trademark', 'other'];

export default function AdminCases() {
  const navigate                    = useNavigate();
  const [cases, setCases]           = useState([]);
  const [meta, setMeta]             = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [categoryFilter, setCategory] = useState('');
  const [loading, setLoading]       = useState(true);
  const [detailModal, setDetailModal] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState('');

  const load = useCallback((page = 1) => {
    setLoading(true);
    caseAPI.list({ search, status: statusFilter, category: categoryFilter, page, limit: 20 })
      .then(r => { setCases(r.data.data); setMeta(r.data.meta); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => { load(1); }, [load]);

  const openDetail = async (c) => {
    setDetailModal(c);
    setStatusUpdate(c.status);
  };

  const openWorkspace = () => { const id = detailModal.id; setDetailModal(null); navigate(`/admin/cases/${id}`); };

  const handleStatusUpdate = async () => {
    try {
      await caseAPI.update(detailModal.id, { status: statusUpdate });
      showToast('Case status updated');
      setDetailModal(null);
      load(meta.page);
    } catch {
      showToast('Update failed', 'error');
    }
  };

  return (
    <>
      <AppHeader breadcrumb="All Cases" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3 flex-wrap">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Case Management</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>{meta.total} total cases</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="form-select"
              style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
              value={statusFilter}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">All Status</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              className="form-select"
              style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
              value={categoryFilter}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ai-table-section">
          <div className="table-header">
            <span className="table-title">All Cases</span>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by title or case number…" />
          </div>

          {loading ? <Spinner /> : (
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Client</th>
                  <th>Advisor</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.length ? cases.map(c => (
                  <tr key={c.id}>
                    <td>
                     <div className='plan-table-content'>
                       <h5>{c.title}</h5>
                      <p>{c.case_number}</p>
                     </div>
                    </td>
                    <td>{c.user_name}</td>
                    <td>{c.advisor_name || '—'}</td>
                    <td>
                      {c.category?.replace(/_/g, ' ')}
                    </td>
                    <td><Badge status={c.priority} /></td>
                    <td><Badge status={c.status} /></td>
                    <td>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="ai-thm-btn outline" onClick={() => openDetail(c)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon={<IoIosDocument />} title="No cases found" text="Try adjusting the filters" />
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

      {/* Case Detail / Update Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={`Case: ${detailModal?.case_number}`}
        footer={
          <>
            <button className="ai-thm-btn outline" onClick={() => setDetailModal(null)}>Cancel</button>
            <button className="ai-thm-btn outline" onClick={openWorkspace}>Open Workspace</button>
            <button className="ai-thm-btn" onClick={handleStatusUpdate}>Update Status</button>
          </>
        }
      >
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <h5 style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 0 }}>
                Title
              </h5>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#4A4949', marginBottom: 0 }}>{detailModal.title}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Client',      value: detailModal.user_name },
                { label: 'Advisor',     value: detailModal.advisor_name || 'Unassigned' },
                { label: 'Category',    value: detailModal.category?.replace(/_/g, ' ') },
                { label: 'Jurisdiction',value: detailModal.jurisdiction || '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <h5 style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 0 }}>
                    {label}
                  </h5>
                  <p style={{ fontSize: 14, color: '#4A4949', fontWeight: 400, textTransform: 'capitalize', marginBottom: 0 }}>{value}</p>
                </div>
              ))}
            </div>
            {detailModal.description && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-h)', color: 'var(--text-dark-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  Description
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-dark-3)', lineHeight: 1.6 , wordWrap  : "break-word"}}>{detailModal.description}</p>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Update Status</label>
              <select className="form-select" value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

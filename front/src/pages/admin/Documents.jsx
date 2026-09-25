import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Pagination, Modal, showToast } from '../../components/common/index';
import { documentAPI } from '../../services/api';
import { IoMdDocument } from 'react-icons/io';

export default function AdminDocuments() {
  const [docs, setDocs]             = useState([]);
  const [meta, setMeta]             = useState({ total: 0, page: 1, limit: 20 });
  const [statusFilter, setStatus]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback((page = 1) => {
    setLoading(true);
    documentAPI.list({ status: statusFilter, page, limit: 20 })
      .then(r => { setDocs(r.data.data); setMeta(r.data.meta); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(1); }, [load]);

  const handleViewDocument = async (doc) => {
    try {
      const res = await documentAPI.download(doc.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: doc.file_type }));
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (err) {
      showToast('Failed to load document', 'error');
    }
  };

  const handleReview = async (status) => {
    try {
      await documentAPI.review(reviewModal.id, { status, notes: reviewNote });
      showToast(`Document ${status} successfully`);
      setReviewModal(null);
      setReviewNote('');
      load(meta.page);
    } catch {
      showToast('Review action failed', 'error');
    }
  };

  return (
    <>
      <AppHeader breadcrumb="Documents" badge="SUPER ADMIN" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-2">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Document Management</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0  }}>Review and manage all uploaded documents</p>
          </div>
          <select
            className="form-select"
            style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">All Documents</h5>
            <span style={{ fontSize: 14, fontWeight : 500, color: '#4A4949' }}>
              {meta.total} total documents
            </span>
          </div>

          {loading ? <Spinner /> : (
            <div className='table-responsive'>
              <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Uploaded By</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.length ? docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5 >{d.original_name}</h5>
                      <p >{d.file_type}</p>
                      </div>
                    </td>
                    <td >{d.uploader_name}</td>
                    <td >
                      {d.category}
                    </td>
                    <td >
                      {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td>
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td><Badge status={d.status} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {d.status === 'pending' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => { setReviewModal(d); setReviewNote(''); }}
                          >
                            Review
                          </button>
                        )}
                        <button
                          className="ai-thm-btn outline py-2"
                          onClick={() => handleViewDocument(d)}
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={<IoMdDocument />} title="No documents found" text="Documents will appear here when uploaded" />
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

      {/* Review Modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => { setReviewModal(null); setReviewNote(''); }}
        title="Review Document"
        footer={
          <>
            <button className="btn btn-danger btn-sm" onClick={() => handleReview('rejected')}>
              Reject
            </button>
            <button className="btn btn-success btn-sm" onClick={() => handleReview('approved')}>
              Approve
            </button>
          </>
        }
      >
        {reviewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 14px', background: 'var(--grey-shade)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)' }}>
                {reviewModal.original_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dark-4)', marginTop: 2 }}>
                Uploaded by: {reviewModal.uploader_name} · {reviewModal.category?.toUpperCase()}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Review Notes (optional)</label>
              <textarea
                className="form-textarea"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                placeholder="Add a note for the client about this document…"
                rows={3}
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

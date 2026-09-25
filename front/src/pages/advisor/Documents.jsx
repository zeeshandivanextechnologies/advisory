import React, { useState, useEffect, useCallback } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { documentAPI } from '../../services/api';
import { FiFileText } from "react-icons/fi";

export default function AdvisorDocuments() {
  const [docs, setDocs]           = useState([]);
  const [statusFilter, setStatus] = useState('');
  const [loading, setLoading]     = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [note, setNote]           = useState('');

  const load = useCallback(() => {
    setLoading(true);
    documentAPI.list({ status: statusFilter })
      .then(r => setDocs(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

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
      await documentAPI.review(reviewModal.id, { status, notes: note });
      showToast(`Document ${status}`);
      setReviewModal(null);
      setNote('');
      load();
    } catch {
      showToast('Action failed', 'error');
    }
  };




  return (
    <>
      <AppHeader breadcrumb="Documents" />
      
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.02em', marginBottom : 0 }}>Client Documents</h4>
            <p style={{ fontSize: 14, color: '#4A4949',  fontWeight: 400, letterSpacing: '0.02em', marginBottom : 0 }}>Review documents submitted by your clients</p>
          </div>
          <select
            className="form-select"
            style={{ fontSize: 14, padding: '7px 28px 7px 10px', width: 'auto' }}
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="ai-table-section">
          <div className='table-responsive'>         
          {loading ? <Spinner /> : (
            <table className="table billing-table align-middle mb-0">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Client</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.length ? docs.map(d => (
                  <tr key={d.id}>
                    <td>
                      <div className='plan-table-content'>
                        <h5>{d.original_name}</h5>
                      <p>{d.file_type}</p>
                      </div>
                    </td>
                    <td >{d.uploader_name}</td>
                    <td >
                      {d.category}
                    </td>
                    <td >
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td><Badge status={d.status} /></td>
                    <td >
                      <div className='d-flex gap-2'>
  
                      {d.status === 'pending' && (
                        <button className="btn btn-success btn-sm" onClick={() => setReviewModal(d)}>
                          Review
                        </button>
                      )}
                      <button
                        className="ai-thm-btn outline"
                        onClick={() => handleViewDocument(d)}
                      >
                        View
                      </button>
                      </div>

                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<FiFileText  />}  title="No documents found" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        </div>

      </div>

      <Modal
        open={!!reviewModal}
        onClose={() => { setReviewModal(null); setNote(''); }}
        title="Review Document"
        footer={
          <>
            <button className="btn btn-danger btn-sm" onClick={() => handleReview('rejected')}>Reject</button>
            <button className="btn btn-success btn-sm" onClick={() => handleReview('approved')}>Approve</button>
          </>
        }
      >
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          <strong>{reviewModal?.original_name}</strong>
        </p>
        <div className="form-group">
          <label className="form-label">Review Notes (optional)</label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add notes about this document…"
          />
        </div>
      </Modal>
    </>
  );
}

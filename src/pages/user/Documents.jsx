import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppHeader from '../../components/layout/AppHeader';
import { Spinner, EmptyState, showToast } from '../../components/common/index';
import { documentAPI } from '../../services/api';
import { CiSearch } from 'react-icons/ci';
import { FaFile, FaSearch } from 'react-icons/fa';
import { GoFileDirectoryFill } from 'react-icons/go';
import { IoClose } from 'react-icons/io5';

const STATUS_TABS = ['All', 'Active', 'Review'];

const statusBadge = (status) => {
  const map = {
    approved: { label: 'Active',        bg: '#D1FAE5', color: '#065F46' },
    pending:  { label: 'In Review',     bg: '#FEF3C7', color: '#92400E' },
    rejected: { label: 'Action Needed', bg: '#FEE2E2', color: '#991B1B' },
  };
  const s = map[status] || { label: status, bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
};

export default function Documents() {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('All');
  const [search, setSearch]     = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc]   = useState(null);

  // Upload form
  const [jurisdiction, setJurisdiction] = useState('Qatar');
  const [docType, setDocType]           = useState('Memorandum of Association');
  const [dragOver, setDragOver]         = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const statusMap = { Active: 'approved', Review: 'pending' };
    documentAPI.list({ status: statusMap[tab] || '', limit: 50 })
      .then(r => setDocs(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab]);

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

  const filtered = docs.filter(d =>
    !search || d.original_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = async (file) => {
    if (!file) return showToast('Please select a file', 'error');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', docType.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, ''));
    try {
      await documentAPI.upload(fd);
      showToast('Document uploaded successfully');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e) => handleUpload(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files[0]);
  };


  return (
    <>
      <AppHeader breadcrumb="Documents" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">

        <div className='row'>
          <div className='col-lg-12'>
                 <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ fontSize: 24, color: '#000000', fontFamily: 'var(--font-h)', fontWeight: 600, letterSpacing: '0.04em' }}>Documents</h5>
        </div>

          </div>

         
          <div className='col-lg-9 col-md-12 col-sm-12 mb-lg-0 mb-3'>

            {/* <div style={{ padding: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dark-4)' }} width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx={11} cy={11} r={8} strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  style={{ width: '100%', padding: '7px 10px 7px 30px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-dark)', background: 'var(--grey-shade)' }}
                  placeholder="Search by document name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {STATUS_TABS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: '6px 14px', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-h)',
                      border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
                      background: tab === t ? 'var(--lt-black)' : 'white',
                      color: tab === t ? 'white' : 'var(--text-dark-4)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >{t}</button>
                ))}
              </div>
            </div> */}

            <div className="case-search-box mb-3">

  <div className="ai-custom-frm-bx mb-0">
    <input
      className="form-control "
      placeholder="Search by document name"
      style={{paddingLeft : "40px"}}
      value={search}
      onChange={e => setSearch(e.target.value)}
    />

    <div className="filter-search-box">
      <span>
        <FaSearch  className="filter-icon-search fz-16 text-black" />
      </span>
    </div>
  </div>

  <div className="filter-tabs">
    <div className="nav nav-pills gap-2">
      {STATUS_TABS.map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`nav-link filter-nav-btn ${tab === t ? 'active' : ''}`}
        >
          {t}
        </button>
      ))}
    </div>
  </div>

            </div>
            <div className='ai-table-section'>
         
            {loading ? <Spinner /> : (
              <div className='table-responsive'>
                <table className='table billing-table align-middle mb-0 ai-case-table'>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['ID', 'Document', 'Status', 'Action'].map(h => (
                      <th key={h} >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length ? filtered.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td >
                        Doc{String(101 + i).padStart(3, '0')}
                      </td>

                      <td >
                        <div className='plan-table-content'>
                          <h5 >{d.original_name}</h5>
                        <p>
                          {d.category?.replace(/_/g, ' ')} · {d.file_size ? `${(d.file_size / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB'} · PDF
                        </p>
                        </div>
                      </td>
                      <td >{statusBadge(d.status)}</td>
                      <td >
                        <button
                          onClick={() => setViewDoc(d)}
                         className='ai-thm-btn py-2 outline' >
                          View
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4}>
                       <div  style={{ padding: 40, textAlign: 'center',}}>
                        <p  style={{  textAlign: 'center', color: '#000', fontSize: 14 }}> No documents found</p>
                       </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>
          </div>

          
          <div className='col-lg-3'>
            <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: 20 }}>
            <h3 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 400, color: '#000000', marginBottom: 15 }}>
              Upload Document
            </h3>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--lt-black)' : '#D1D5DB'}`,
                borderRadius: 'var(--radius-sm)', padding: '28px 16px',
                textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                background: dragOver ? '#F9FAFB' : 'white', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 28, marginBottom: 8, color : "#CECECE" }}><GoFileDirectoryFill /></span>
              <h6 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>
                Drop files or click
              </h6>
              <div style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>PDF, DOCX, XLSX MAX 25 MB</div>
              <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.xlsx,.jpg,.png" onChange={handleFileInput} />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Change this belong too</label>
              <select className="form-select" style={{ fontSize: 14 }} value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}>
                {['Qatar', 'UAE', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Oman'].map(j => <option key={j}>{j}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Document Type</label>
              <select className="form-select" style={{ fontSize: 14 }} value={docType} onChange={e => setDocType(e.target.value)}>
                {['Memorandum of Association', 'Business License', 'Shareholder Agreement', 'Trade Licence', 'Visa / Residency', 'Contract', 'Tax Document', 'ID / Passport', 'Other'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              className="ai-thm-btn"
              style={{ width: '100%' }}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* View Document Modal */}
      {viewDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setViewDoc(null)}>
          <div style={{ background: 'white', borderRadius: 'var(--radius)', padding: 24, width: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontFamily: 'var(--font-h)', fontWeight: 700, color: 'var(--text-dark)' }}>Document</h3>
              <button onClick={() => setViewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#000' }}> <IoClose size={20} /> </button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0 24px' , border : "2px dashed #EDEDED", borderRadius : 6, marginBottom : 10 }}>
              <span style={{ fontSize: 40, marginBottom: 0, color : "#CECECE" }}><GoFileDirectoryFill /></span>
              <h6 style={{ fontSize: 14, fontWeight: 400, color: '#4A4949' }}>{viewDoc.original_name}</h6>
            </div>

            <button
              onClick={() => handleViewDocument(viewDoc)}
             className='ai-thm-btn w-100'
            >
              Download / View
            </button>
          </div>
        </div>
      )}
    </>
  );
}

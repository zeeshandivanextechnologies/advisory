import { FiAlertTriangle, FiFolder } from 'react-icons/fi';
import React, { useState, useEffect, useRef, useCallback, Component } from 'react';
import { FaSearch } from 'react-icons/fa';


/* ── Error Boundary ───────────────────────────────────────── */
export class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', padding: 40,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}><FiAlertTriangle /></div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-dark)' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 24, maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page or go back to the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-outline-dark"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
            <button className="btn btn-accent" onClick={() => window.location.href = '/'}>
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Badge ────────────────────────────────────────────────── */
export const Badge = ({ status, text, customStyle }) => {
  const map = {
    active:      'badge-green',  completed:   'badge-green',  approved:    'badge-green',
    open:        'badge-blue',   scheduled:   'badge-blue',   in_progress: 'badge-blue',
    pending:     'badge-orange', pending_docs:'badge-orange', review:      'badge-orange',
    closed:      'badge-gray',   cancelled:   'badge-gray',   suspended:   'badge-gray',
    draft:       'badge-gray',   no_show:     'badge-gray',
    rejected:    'badge-red',    failed:      'badge-red',    urgent:      'badge-red',
    free:        'badge-gray',   pro:         'badge-blue',   enterprise:  'badge-gray',
    high:        'badge-orange', medium:      'badge-blue',   low:         'badge-gray',
    new:         'badge-blue',   in_review:   'badge-orange', proposal_sent: 'badge-blue',
    won:         'badge-green',  declined:    'badge-red',    invited:     'badge-orange',
    paused:      'badge-orange', ended:       'badge-gray',   expired:     'badge-gray',
    nurture:     'badge-orange', referred:    'badge-gray',
  };
  const cls   = map[status] || 'badge-gray';
  const label = text || status?.replace(/_/g, ' ') || '—';
  return <span className={`badge ${cls}`} style={customStyle}>{label}</span>;
};

/* ── StatCard ─────────────────────────────────────────────── */
export const StatCard = ({ icon, label, value, sub, subColor, borderColor }) => (
  <div className="stat-card" style={borderColor ? { borderLeft: `3px solid ${borderColor}` } : {}}>
    {icon && <div className="stat-card-icon" style={{ fontSize: 20 }}>{icon}</div>}
    <div className="stat-card-label">{label}</div>
    <div className="stat-card-val">{value ?? '—'}</div>
    {sub && <div className="stat-card-sub" style={subColor ? { color: subColor } : {}}>{sub}</div>}
  </div>
);

/* ── Modal ────────────────────────────────────────────────── */
// export const Modal = ({ open, onClose, title, children, footer }) => {
//   useEffect(() => {
//     const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
//     if (open) document.addEventListener('keydown', handler);
//     return () => document.removeEventListener('keydown', handler);
//   }, [open, onClose]);

//   if (!open) return null;
//   return (
//     <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
//       <div className="modal">
//         <div className="modal-header">
//           <span className="modal-title">{title}</span>
//           <button className="modal-close" onClick={onClose}>✕</button>
//         </div>
//         <div className="modal-body">{children}</div>
//         {footer && <div className="modal-footer">{footer}</div>}
//       </div>
//     </div>
//   );
// };

export const Modal = ({ open, onClose, title, children, footer }) => {
  const modalRef = useRef(null);
  const bsModal = useRef(null);
  useEffect(() => {
    if (window.bootstrap && modalRef.current) {
      bsModal.current = new window.bootstrap.Modal(modalRef.current);

      modalRef.current.addEventListener('hidden.bs.modal', () => {
        onClose?.();
      });
    }
  }, []);

  useEffect(() => {
    if (!bsModal.current) return;

    if (open) {
      bsModal.current.show();
    } else {
      bsModal.current.hide();
    }
  }, [open]);

  return (
    <div className="modal fade" tabIndex="-1" ref={modalRef}>
      <div className="modal-dialog modal-dialog-centered ">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">{children}</div>

          {footer && <div className="modal-footer">{footer}</div>}

        </div>
      </div>
    </div>
  );
};


/* ── Confirm Modal ────────────────────────────────────────── */
export const ConfirmModal = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title || 'Confirm Action'}
    footer={
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="ai-thm-btn outline" onClick={onClose}>Cancel</button>
        <button
          className={`ai-thm-btn ${danger ? 'btn-danger' : 'ai-thm-btn'}`}
          style={danger ? { background: 'var(--red)', color: 'white', border: 'none' } : {}}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    }
  >
    <p style={{ fontSize: 14, color: 'var(--text-dark-3)', margin: 0 }}>{message}</p>
  </Modal>
);

/* ── Spinner ──────────────────────────────────────────────── */
export const Spinner = ({ size = 36, center = true }) => {
  const el = <div className="spinner" style={{ width: size, height: size, borderWidth: size / 12 }} />;
  return center ? <div className="loading-overlay">{el}</div> : el;
};

/* ── Toast ────────────────────────────────────────────────── */
let _setToasts = null;

export const showToast = (message, type = 'success') => {
  if (_setToasts) {
    const id = Date.now();
    _setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => _setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  } else {
    // Fallback if ToastContainer not yet mounted
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[showToast] ToastContainer not mounted. Message:', message);
    }
  }
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    _setToasts = setToasts;
    return () => { _setToasts = null; };
  }, []);
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        // `show` is required: Bootstrap's CSS hides any `.toast` without it
        <div key={t.id} className={`toast toast-${t.type} show`} role="alert">{t.message}</div>
      ))}
    </div>
  );
};

/* ── Search Input ─────────────────────────────────────────── */
export const SearchInput = ({ value, onChange, placeholder = 'Search…', style }) => (
  <div style={{ position: 'relative', ...style }}>
    <span style={{
      position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
      fontSize: 14, color: 'var(--text-dark-4)', pointerEvents: 'none',
    }}> <FaSearch /> </span>
    <input
      type="text"
      className="form-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ paddingLeft: 32, minWidth: 220 }}
    />
  </div>
);

/* ── Empty State ──────────────────────────────────────────── */
export const EmptyState = ({ icon = <FiFolder />, title = 'Nothing here', text = '' }) => (
  <div className="empty-state">
    <div className="empty-state-icon mb-0">{icon}</div>
    <h4>{title}</h4>
    {text && <p>{text}</p>}
  </div>
);

/* ── Pagination ───────────────────────────────────────────── */
// FIX: Sliding window — always shows current page in context
export const Pagination = ({ page, total, limit, onChange }) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const delta = 2; // pages on each side of current
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      {getPages().map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} style={{ padding: '0 6px', color: 'var(--text-dark-4)' }}>…</span>
          : (
            <button
              key={p}
              className={`page-btn${page === p ? ' active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
      )}
      <button className="page-btn" onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
    </div>
  );
};

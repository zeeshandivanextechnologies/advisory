import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, StatCard, EmptyState, Modal, ConfirmModal, showToast } from '../../components/common/index';
import { serviceAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { priceLabel, money, hours, fmtDate, retainerCategoryLabel, OPEN_REQUEST, REQUEST_STATUSES } from '../../utils/services';
import { FiClock, FiCalendar, FiDollarSign, FiCheckCircle } from 'react-icons/fi';

const statusText = (s) => REQUEST_STATUSES.find(x => x.value === s)?.label || s;

const Check = ({ ok }) => (
  <span style={{ color: ok ? '#10B981' : '#9CA3AF', fontSize: 14, flexShrink: 0 }}>{ok ? '✓' : '✕'}</span>
);

const ListBlock = ({ title, items, ok = true, limit }) => {
  if (!items?.length) return null;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div style={{ marginBottom: 12 }}>
      <h6 style={{ fontSize: 12, fontWeight: 600, color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{title}</h6>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {shown.map((t, i) => (
          <li key={i} style={{ fontSize: 13, color: ok ? '#4A4949' : '#6B7280', padding: '4px 0', display: 'flex', gap: 8 }}>
            <Check ok={ok} /> {t}
          </li>
        ))}
        {limit && items.length > limit && (
          <li style={{ fontSize: 12, color: 'var(--text-dark-4)', padding: '2px 0 0 22px' }}>+{items.length - limit} more</li>
        )}
      </ul>
    </div>
  );
};

/* ── The client's active retainer: hours this month + recent work ── */
function RetainerPanel({ retainer }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    serviceAPI.getRetainer(retainer.id).then(r => setDetail(r.data.data)).catch(() => {});
  }, [retainer.id]);

  const pct = Math.min(100, (Number(retainer.month_used) / Number(retainer.monthly_hours || 1)) * 100);

  return (
    <div className="advisor-legal-cards mb-3">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>{retainer.offering_name}</h3>
          <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
            {retainer.advisor_name ? `Your advisor: ${retainer.advisor_name}` : 'An advisor will be assigned shortly'}
          </p>
        </div>
        <Badge status={retainer.status} />
      </div>

      <div className="stats-grid mb-3">
        <StatCard icon={<FiClock />} label={`Used in ${retainer.month}`} value={hours(retainer.month_used)} sub={`of ${hours(retainer.monthly_hours)} this month`} />
        <StatCard icon={<FiCheckCircle />} label="Hours left" value={hours(retainer.month_remaining)} sub="Unused hours don't roll over" borderColor="var(--green)" />
        <StatCard icon={<FiDollarSign />} label="Monthly fee" value={money(retainer.monthly_fee, retainer.currency)} sub={`Minimum ${retainer.min_term_months} months`} />
        <StatCard icon={<FiCalendar />} label="Minimum term ends" value={fmtDate(retainer.min_term_end)} sub={`Started ${fmtDate(retainer.start_date)}`} borderColor="var(--blue)" />
      </div>

      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--orange)' : 'var(--green)' }} />
      </div>

      <h6 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 8 }}>Recent work</h6>
      {!detail ? <Spinner size={24} /> : detail.logs?.length ? (
        <div className="table-responsive">
          <table className="table billing-table align-middle mb-0 ai-case-table">
            <thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Hours</th></tr></thead>
            <tbody>
              {detail.logs.slice(0, 8).map(l => (
                <tr key={l.id}>
                  <td>{fmtDate(l.work_date)}</td>
                  <td>{retainerCategoryLabel(l.category)}</td>
                  <td>{l.description || '—'}</td>
                  <td>{hours(l.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0 }}>No time logged yet this term.</p>}
    </div>
  );
}

export default function Services() {
  const location                  = useLocation();
  const { platformName }          = useSettings();
  const [catalog, setCatalog]     = useState([]);
  const [requests, setRequests]   = useState([]);
  const [retainers, setRetainers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState(location.state?.category || 'all');
  const [detail, setDetail]       = useState(null);
  const [requestFor, setRequestFor] = useState(null);
  const [form, setForm]           = useState({ message: '', budget: '' });
  const [sending, setSending]     = useState(false);
  const [cancelId, setCancelId]   = useState(null);

  const load = useCallback(() => {
    Promise.all([serviceAPI.getCatalog(), serviceAPI.getMyRequests(), serviceAPI.getRetainers()])
      .then(([c, r, t]) => {
        setCatalog(c.data.data || []);
        setRequests(r.data.data || []);
        setRetainers(t.data.data || []);
      })
      .catch(() => showToast('Failed to load services', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openRequestFor = (id) => requests.find(r => r.offering_id === id && OPEN_REQUEST.includes(r.status));
  const activeRetainer = retainers.find(r => r.status !== 'ended');

  const startRequest = (o) => { setForm({ message: '', budget: '' }); setDetail(null); setRequestFor(o); };

  const sendRequest = async () => {
    setSending(true);
    try {
      await serviceAPI.requestService({ offering_id: requestFor.id, ...form });
      showToast('Request sent — we will reply within 4–6 working hours');
      setRequestFor(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send request', 'error');
    } finally {
      setSending(false);
    }
  };

  const cancelRequest = async () => {
    try {
      await serviceAPI.cancelRequest(cancelId);
      showToast('Request cancelled');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not cancel request', 'error');
    }
  };

  if (loading) return <><AppHeader breadcrumb="Services" /><Spinner /></>;

  const shownCategories = category === 'all' ? catalog : catalog.filter(c => c.key === category);

  return (
    <>
      <AppHeader breadcrumb="Services" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>Advisory Services</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>
              Clearly scoped offerings — from the first market-entry decision to ongoing support
            </p>
          </div>
        </div>

        {activeRetainer && <RetainerPanel retainer={activeRetainer} />}

        {/* Category tabs */}
        <div className="case-search-box mb-3">
          <div className="filter-tabs">
            <div className="nav nav-pills gap-2">
              {[{ key: 'all', name: 'All Services' }, ...catalog].map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`nav-link filter-nav-btn ${category === c.key ? 'active' : ''}`}
                  style={{ border: '1px solid var(--border-light)' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {shownCategories.map(cat => (
          <div key={cat.key} className="mb-4">
            <div className="mb-2">
              <h5 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>{cat.name}</h5>
              <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>{cat.purpose}</p>
            </div>

            {cat.offerings.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>No services available in this category right now.</p>
            ) : (
              <div className="row">
                {cat.offerings.map(o => {
                  const open = openRequestFor(o.id);
                  return (
                    <div key={o.id} className="col-lg-4 col-md-6 col-sm-12 mb-3">
                      <div className="advisor-plan-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-h)', color: '#000', marginBottom: 4 }}>{o.name}</h3>

                        <div style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 22, fontWeight: 600, color: '#000' }}>{priceLabel(o)}</span>
                          {o.price_note && <span style={{ fontSize: 13, color: 'var(--text-dark-4)', marginLeft: 6 }}>{o.price_note}</span>}
                        </div>

                        {o.summary && <p style={{ fontSize: 14, color: '#4A4949', marginBottom: 10 }}>{o.summary}</p>}
                        {o.best_fit && (
                          <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 10 }}>
                            <b style={{ color: '#000' }}>Best fit:</b> {o.best_fit}
                          </p>
                        )}

                        <div style={{ flex: 1 }}>
                          <ListBlock title="What's included" items={o.in_scope} limit={4} />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button className="ai-thm-btn outline" style={{ flex: 1 }} onClick={() => setDetail(o)}>Details</button>
                          <button
                            className="ai-thm-btn"
                            style={{ flex: 1 }}
                            disabled={!!open}
                            onClick={() => startRequest(o)}
                          >
                            {open ? statusText(open.status) : 'Request'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* My requests */}
        <div className="ai-table-section">
          <div className="table-header">
            <h5 className="fz-14 text-black fw-600 mb-0">My Service Requests</h5>
          </div>
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-0 ai-case-table">
              <thead>
                <tr><th>Service</th><th>Requested</th><th>Quote</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {requests.length ? requests.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="plan-table-content">
                        <h5>{r.offering_name}</h5>
                        {r.budget && <p>Budget: {r.budget}</p>}
                      </div>
                    </td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>{r.quoted_amount ? money(r.quoted_amount, r.currency) : '—'}</td>
                    <td><Badge status={r.status} text={statusText(r.status)} /></td>
                    <td>
                      {OPEN_REQUEST.includes(r.status)
                        ? <button className="ai-remove-btn" onClick={() => setCancelId(r.id)}>Cancel</button>
                        : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}><EmptyState icon="🧭" title="No requests yet" text="Choose a service above to get started" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-dark-4)', marginTop: 16 }}>
          {platformName} provides business, market-entry, regulatory-navigation and relationship-development advisory.
          It is not a law firm and does not provide legal advice. Legal drafting, opinions and representation are
          handled by licensed counsel in the relevant jurisdiction.
        </p>
      </div>

      {/* Offering details */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name || 'Service'}
        footer={detail && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setDetail(null)}>Close</button>
            <button className="ai-thm-btn" disabled={!!openRequestFor(detail.id)} onClick={() => startRequest(detail)}>
              {openRequestFor(detail.id) ? 'Request open' : 'Request this service'}
            </button>
          </div>
        )}
      >
        {detail && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 600, color: '#000' }}>{priceLabel(detail)}</span>
              {detail.price_note && <span style={{ fontSize: 13, color: 'var(--text-dark-4)', marginLeft: 6 }}>{detail.price_note}</span>}
            </div>
            {detail.summary && <p style={{ fontSize: 14, color: '#4A4949' }}>{detail.summary}</p>}
            {detail.best_fit && <p style={{ fontSize: 13, color: '#4A4949' }}><b style={{ color: '#000' }}>Best fit:</b> {detail.best_fit}</p>}
            {detail.timeline && <p style={{ fontSize: 13, color: '#4A4949' }}><b style={{ color: '#000' }}>Timeline:</b> {detail.timeline}</p>}
            {detail.included_hours && (
              <p style={{ fontSize: 13, color: '#4A4949' }}><b style={{ color: '#000' }}>Included time:</b> {hours(detail.included_hours)} per month</p>
            )}
            <ListBlock title="What's included" items={detail.in_scope} />
            <ListBlock title="You receive" items={detail.deliverables} />
            <ListBlock title="Not included" items={detail.out_of_scope} ok={false} />
            {!detail.in_scope?.length && !detail.deliverables?.length && (
              <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>Scope is agreed with you during a short discovery conversation.</p>
            )}
          </div>
        )}
      </Modal>

      {/* Request form */}
      <Modal
        open={!!requestFor}
        onClose={() => setRequestFor(null)}
        title={requestFor ? `Request: ${requestFor.name}` : 'Request service'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setRequestFor(null)}>Cancel</button>
            <button className="ai-thm-btn" onClick={sendRequest} disabled={sending}>{sending ? 'Sending…' : 'Send Request'}</button>
          </div>
        }
      >
        {requestFor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
              {priceLabel(requestFor)}{requestFor.price_note ? ` · ${requestFor.price_note}` : ''}
            </p>
            <div className="form-group">
              <label className="form-label">What would you like to achieve?</label>
              <textarea
                className="form-input"
                style={{ height: 100, resize: 'vertical' }}
                placeholder="Your business, target market, timeline and main question"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Budget (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. $5,000 – $10,000"
                value={form.budget}
                onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
              />
            </div>
            {requestFor.out_of_scope?.length > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-dark-4)', marginBottom: 0 }}>
                Not included: {requestFor.out_of_scope.join(', ')}.
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={cancelRequest}
        title="Cancel request"
        message="Cancel this service request?"
        confirmLabel="Cancel Request"
        danger
      />
    </>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/layout/AppHeader';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../../components/common/index';
import { journeyAPI, subscriptionAPI } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import EngagementStepper from '../../components/journey/EngagementStepper';
import { money, fmtDate } from '../../utils/services';
import { PROPOSAL_LABELS, proposalBadge, ENGAGEMENT_LABELS, engagementBadge, invoiceBadge } from '../../utils/journey';
import { FiFileText, FiExternalLink, FiCheck, FiX } from 'react-icons/fi';

export default function Engagements() {
  const navigate                      = useNavigate();
  const { platformName }              = useSettings();
  const [proposals, setProposals]     = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [details, setDetails]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState(null);
  const [sign, setSign]               = useState({ signed_name: '', agree: false, reason: '', declining: false });
  const [busy, setBusy]               = useState(false);

  const load = useCallback(() => {
    Promise.all([journeyAPI.getMyProposals(), journeyAPI.getEngagements()])
      .then(async ([p, e]) => {
        setProposals(p.data.data || []);
        const list = e.data.data || [];
        setEngagements(list);
        // Invoices and follow-ups come with each engagement's detail
        const entries = await Promise.all(list.map(x => journeyAPI.getEngagement(x.id).then(r => [x.id, r.data.data]).catch(() => [x.id, null])));
        setDetails(Object.fromEntries(entries));
      })
      .catch(() => showToast('Failed to load engagements', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Back from online invoice payment: ?checkout=success&session_id=…
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    if (!checkout) return;
    window.history.replaceState(null, '', window.location.pathname);
    if (checkout === 'cancelled') { showToast('Payment was cancelled', 'error'); return; }
    if (sessionId) {
      subscriptionAPI.confirmCheckout(sessionId)
        .then(r => { showToast(r.data.data?.status === 'paid' ? 'Payment received — thank you!' : 'Your payment is processing'); load(); })
        .catch(err => showToast(err.response?.data?.message || 'Could not confirm the payment', 'error'));
    }
  }, [load]);

  const openProposal = (pr) => { setSign({ signed_name: '', agree: false, reason: '', declining: false }); setView(pr); };

  const respond = async (accept) => {
    setBusy(true);
    try {
      await journeyAPI.respondProposal(view.id, accept
        ? { accept: true, signed_name: sign.signed_name, agree: sign.agree }
        : { accept: false, reason: sign.reason });
      showToast(accept ? 'Proposal accepted — your deposit invoice is below' : 'Proposal declined');
      setView(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally { setBusy(false); }
  };

  const payOnline = async (inv) => {
    setBusy(true);
    try {
      const r = await journeyAPI.payInvoiceOnline(inv.id);
      if (r.data.redirect_url) window.location.href = r.data.redirect_url;
    } catch (err) {
      showToast(err.response?.data?.message || 'Online payment unavailable', 'error');
    } finally { setBusy(false); }
  };

  if (loading) return <><AppHeader breadcrumb="Engagements" /><Spinner /></>;

  const openProposals = proposals.filter(p => p.status === 'sent' && !p.is_expired);
  const pastProposals = proposals.filter(p => !(p.status === 'sent' && !p.is_expired));

  return (
    <>
      <AppHeader breadcrumb="Engagements" />
      <div className="main-content flex-grow-1 p-3 overflow-auto">
        <div className="page-header mb-3">
          <div>
            <h4 style={{ fontSize: 24, fontFamily: 'var(--font-h)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 4 }}>My Engagements</h4>
            <p style={{ fontSize: 14, color: 'var(--text-dark-4)', marginBottom: 0 }}>Proposals, invoices and progress on your projects</p>
          </div>
          <button className="thm-btn" onClick={() => navigate('/user/intake')}>Intake Form</button>
        </div>

        {/* Proposals waiting for a response */}
        {openProposals.map(pr => (
          <div key={pr.id} className="advisor-legal-cards mb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>New proposal: {pr.title}</h3>
              <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
                {money(pr.amount, pr.currency)} · {pr.deposit_percent}% deposit to start · respond by {fmtDate(pr.valid_until)}
              </p>
            </div>
            <button className="ai-thm-btn" onClick={() => openProposal(pr)}>Review & Respond</button>
          </div>
        ))}

        {/* Engagements */}
        {engagements.map(e => {
          const d = details[e.id];
          return (
            <div key={e.id} className="advisor-legal-cards mb-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>{e.title}</h3>
                  <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
                    {money(e.amount, e.currency)}{e.advisor_name ? ` · Advisor: ${e.advisor_name}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge status={engagementBadge(e.status)} text={ENGAGEMENT_LABELS[e.status]} />
                  {e.case_id && <button className="ai-thm-btn outline" onClick={() => navigate(`/user/cases/${e.case_id}`)}><FiExternalLink /> Workspace</button>}
                </div>
              </div>

              {e.status !== 'cancelled' && <EngagementStepper status={e.status} />}
              {e.status === 'awaiting_deposit' && (
                <p style={{ fontSize: 13, color: '#4A4949' }}>Work begins as soon as the deposit is received.</p>
              )}

              <h6 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 8 }}>Invoices</h6>
              {d?.invoices?.length ? (
                <div className="table-responsive">
                  <table className="table billing-table align-middle mb-0 ai-case-table">
                    <thead><tr><th>Invoice</th><th>Amount</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {d.invoices.map(i => (
                        <tr key={i.id}>
                          <td><div className="plan-table-content"><h5>{i.invoice_no}</h5><p>{i.kind === 'deposit' ? 'Deposit' : 'Final balance'}</p></div></td>
                          <td>{money(i.amount, i.currency)}</td>
                          <td>{i.status === 'paid' ? `Paid ${fmtDate(i.paid_at)}` : fmtDate(i.due_date)}</td>
                          <td><Badge status={invoiceBadge(i)} text={i.status} /></td>
                          <td>
                            {i.status === 'unpaid'
                              ? <button className="thm-btn" disabled={busy} onClick={() => payOnline(i)}>Pay Online</button>
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>{d ? 'No invoices yet.' : 'Loading…'}</p>}
              {d?.invoices?.some(i => i.status === 'unpaid') && (
                <p style={{ fontSize: 12, color: 'var(--text-dark-4)', margin: '8px 0 0' }}>Prefer bank transfer? Reply to the invoice email and we will send the details.</p>
              )}
            </div>
          );
        })}

        {!openProposals.length && !engagements.length && (
          <div className="advisor-legal-cards mb-3">
            <EmptyState icon={<FiFileText />} title="No engagements yet" text="Request a service and we will send you a proposal after the discovery call" />
          </div>
        )}

        {pastProposals.length > 0 && (
          <div className="ai-table-section">
            <div className="table-header"><h5 className="fz-14 text-black fw-600 mb-0">Proposal History</h5></div>
            <div className="table-responsive">
              <table className="table billing-table align-middle mb-0 ai-case-table">
                <thead><tr><th>Proposal</th><th>Amount</th><th>Sent</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {pastProposals.map(pr => (
                    <tr key={pr.id}>
                      <td>{pr.title}</td>
                      <td>{money(pr.amount, pr.currency)}</td>
                      <td>{fmtDate(pr.sent_at)}</td>
                      <td><Badge status={proposalBadge(pr)} text={pr.is_expired ? 'Expired' : PROPOSAL_LABELS[pr.status]} /></td>
                      <td><button className="ai-thm-btn outline" onClick={() => openProposal(pr)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Proposal / SOW — accepting it is the contract */}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.title || 'Proposal'}
        footer={view && view.status === 'sent' && !view.is_expired && (
          sign.declining ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="ai-thm-btn outline" onClick={() => setSign(s => ({ ...s, declining: false }))}>Back</button>
              <button className="ai-remove-btn" disabled={busy} onClick={() => respond(false)}>Decline Proposal</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="ai-thm-btn outline" onClick={() => setSign(s => ({ ...s, declining: true }))}>Decline</button>
              <button className="ai-thm-btn" disabled={busy || !sign.agree || !sign.signed_name.trim()} onClick={() => respond(true)}>
                {busy ? 'Signing…' : 'Accept & Sign'}
              </button>
            </div>
          )
        )}>
        {view && (
          <div>
            <p style={{ fontSize: 20, fontWeight: 600, color: '#000', marginBottom: 2 }}>{money(view.amount, view.currency)}</p>
            <p style={{ fontSize: 13, color: '#4A4949' }}>
              {view.deposit_percent}% deposit ({money(view.deposit_amount, view.currency)}) on acceptance · valid until {fmtDate(view.valid_until)}
            </p>
            <h6 style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>Scope</h6>
            <p style={{ fontSize: 13, color: '#4A4949', whiteSpace: 'pre-wrap' }}>{view.scope}</p>
            {view.deliverables?.length > 0 && (
              <>
                <h6 style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>Deliverables</h6>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {view.deliverables.map((x, i) => <li key={i} style={{ fontSize: 13, color: '#4A4949', display: 'flex', gap: 8 }}><span style={{ color: '#10B981' }}><FiCheck /></span>{x}</li>)}
                </ul>
              </>
            )}
            {view.out_of_scope?.length > 0 && (
              <>
                <h6 style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>Not included</h6>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {view.out_of_scope.map((x, i) => <li key={i} style={{ fontSize: 13, color: '#6B7280', display: 'flex', gap: 8 }}><span style={{ color: '#9CA3AF' }}><FiX /></span>{x}</li>)}
                </ul>
              </>
            )}
            {view.timeline && <p style={{ fontSize: 13, color: '#4A4949' }}><b style={{ color: '#000' }}>Timeline:</b> {view.timeline}</p>}
            {view.payment_terms && <p style={{ fontSize: 13, color: '#4A4949' }}><b style={{ color: '#000' }}>Payment terms:</b> {view.payment_terms}</p>}
            <p style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>
              {platformName} provides business advisory services and is not a law firm; legal work is performed by licensed counsel.
            </p>

            {view.status === 'accepted' && <p style={{ fontSize: 13, color: 'var(--green)' }}>Signed by {view.signed_name} on {fmtDate(view.responded_at)}.</p>}

            {view.status === 'sent' && !view.is_expired && (sign.declining ? (
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={sign.reason} onChange={e => setSign(s => ({ ...s, reason: e.target.value }))} />
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Type your full name to sign *</label>
                  <input className="form-input" value={sign.signed_name} onChange={e => setSign(s => ({ ...s, signed_name: e.target.value }))} />
                </div>
                <label style={{ fontSize: 13, color: '#4A4949', display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8 }}>
                  <input type="checkbox" checked={sign.agree} onChange={e => setSign(s => ({ ...s, agree: e.target.checked }))} />
                  I agree to the scope, boundaries and payment terms above, including the deposit before work starts.
                </label>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

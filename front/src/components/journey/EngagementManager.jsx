import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Spinner, Modal, showToast } from '../common/index';
import { journeyAPI, teamAPI } from '../../services/api';
import { FinancialModelPanel } from './AiPanels';
import DeliverablesPanel from './DeliverablesPanel';
import { staffRoleLabel } from '../../utils/team';
import EngagementStepper from './EngagementStepper';
import { money, fmtDate, fmtDateTime } from '../../utils/services';
import { ENGAGEMENT_LABELS, engagementBadge, invoiceBadge, PAYMENT_METHODS, workspacePath } from '../../utils/journey';
import { FiCheckSquare, FiSquare, FiExternalLink, FiAlertTriangle } from 'react-icons/fi';

const H = ({ children }) => (
  <h6 style={{ fontSize: 14, fontWeight: 600, color: '#000', margin: '16px 0 8px' }}>{children}</h6>
);

/*
 * Staff view of one engagement (admin or assigned advisor): move it through
 * kickoff → delivery → QA → delivered, run the QA checklist, and (admin)
 * record invoice payments and see follow-ups.
 */
export default function EngagementManager({ engagementId, role, advisors = [], onChanged }) {
  const navigate                = useNavigate();
  const [d, setD]               = useState(null);
  const [busy, setBusy]         = useState(false);
  const [newQa, setNewQa]       = useState('');
  const [notes, setNotes]       = useState('');
  const [payFor, setPayFor]     = useState(null);
  const [team, setTeam]         = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [member, setMember]     = useState({ staff_member_id: '', responsibility: '', cost: '' });
  const isAdmin = role === 'admin';

  const load = useCallback(() => {
    journeyAPI.getEngagement(engagementId)
      .then(r => { setD(r.data.data); setNotes(r.data.data.delivery_notes || ''); })
      .catch(err => showToast(err.response?.data?.message || 'Failed to load engagement', 'error'));
  }, [engagementId]);

  useEffect(() => { load(); }, [load]);

  // Staffing: who works on this engagement and what they cost
  const loadTeam = useCallback(() => {
    teamAPI.getEngagementTeam(engagementId).then(r => setTeam(r.data.data || [])).catch(() => {});
  }, [engagementId]);
  useEffect(() => { loadTeam(); }, [loadTeam]);
  useEffect(() => { if (isAdmin) teamAPI.getStaff().then(r => setStaffList((r.data.data || []).filter(s => s.is_active))).catch(() => {}); }, [isAdmin]);

  const addMember = async () => {
    if (!member.staff_member_id) return showToast('Choose a team member', 'error');
    if (await act(() => teamAPI.saveTeamMember(engagementId, member), 'Team member added')) {
      setMember({ staff_member_id: '', responsibility: '', cost: '' });
      loadTeam();
    }
  };
  const removeMember = async (t) => {
    if (await act(() => teamAPI.removeTeamMember(t.id), 'Removed from team')) loadTeam();
  };

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); if (msg) showToast(msg); load(); onChanged?.(); return true; }
    catch (err) { showToast(err.response?.data?.message || 'Action failed', 'error'); return false; }
    finally { setBusy(false); }
  };

  if (!d) return <Spinner />;

  const move = (status, msg) => act(() => journeyAPI.updateEngagement(d.id, { status, delivery_notes: notes }), msg);
  const qaOpen = !['delivered', 'completed', 'cancelled'].includes(d.status);
  const qaLeft = (d.qa_items || []).filter(q => !q.is_checked).length;
  const qaHours = d.qa_completed_at ? (Date.now() - new Date(d.qa_completed_at).getTime()) / 36e5 : null;

  const recordPayment = async () => {
    if (await act(() => journeyAPI.adminRecordPayment(payFor.id, { method: payFor.method, reference: payFor.reference }), 'Payment recorded')) setPayFor(null);
  };

  return (
    <div>
      <EngagementStepper status={d.status} />

      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h5 style={{ fontSize: 16, fontWeight: 600, color: '#000', marginBottom: 2 }}>{d.title}</h5>
          <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
            {d.client_name} · {money(d.amount, d.currency)} · paid {money(d.paid_amount, d.currency)}
            {Number(d.outstanding) > 0 ? ` · outstanding ${money(d.outstanding, d.currency)}` : ''}
          </p>
        </div>
        <Badge status={engagementBadge(d.status)} text={ENGAGEMENT_LABELS[d.status]} />
      </div>

      {isAdmin && (
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Advisor</label>
          <select className="form-select" value={d.advisor_id || ''} disabled={busy}
            onChange={e => act(() => journeyAPI.updateEngagement(d.id, { advisor_id: e.target.value }), 'Advisor assigned')}>
            <option value="">Unassigned</option>
            {advisors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>
      )}

      {d.case_id && (
        <button className="ai-thm-btn outline" style={{ marginTop: 12 }} onClick={() => navigate(workspacePath(role, d.case_id))}>
          <FiExternalLink /> Open workspace ({d.case_number})
        </button>
      )}

      {/* Staffing */}
      <H>Team & margin</H>
      <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 6 }}>
        Staff cost {money(d.staff_cost, d.currency)} · margin <b style={{ color: Number(d.margin) < 0 ? 'var(--red)' : '#000' }}>{money(d.margin, d.currency)}</b>
      </p>
      {d.needs_financial_specialist && (
        <p style={{ fontSize: 12, color: '#92400E', background: '#F59E0B1F', borderRadius: 6, padding: '6px 10px' }}>
          <FiAlertTriangle style={{ verticalAlign: '-2px' }} /> Market Entry Blueprint / larger engagement — add a financial specialist for the model review ($500–$1,500).
        </p>
      )}
      {team.map(t => (
        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{t.full_name} · {staffRoleLabel(t.staff_role)}</div>
            <div style={{ fontSize: 12, color: '#4A4949' }}>{t.responsibility || '—'}{Number(t.cost) > 0 ? ` · ${money(t.cost, t.currency)}` : ''}</div>
          </div>
          {isAdmin && t.staff_role !== 'founder' && <button className="ai-remove-btn" disabled={busy} onClick={() => removeMember(t)}>Remove</button>}
        </div>
      ))}
      {!team.length && <p style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>No team assigned yet. Founders join automatically once they are in the team directory.</p>}
      {isAdmin && (
        <div className="row g-2" style={{ marginTop: 6 }}>
          <div className="col-md-4">
            <select className="form-select" value={member.staff_member_id} onChange={e => setMember(m => ({ ...m, staff_member_id: e.target.value }))}>
              <option value="">Add team member…</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name} ({staffRoleLabel(s.staff_role)})</option>)}
            </select>
          </div>
          <div className="col-md-4"><input className="form-input" placeholder="Responsibility" value={member.responsibility} onChange={e => setMember(m => ({ ...m, responsibility: e.target.value }))} /></div>
          <div className="col-md-2"><input type="number" className="form-input" placeholder="Cost" value={member.cost} onChange={e => setMember(m => ({ ...m, cost: e.target.value }))} /></div>
          <div className="col-md-2"><button className="ai-thm-btn outline w-100" disabled={busy} onClick={addMember}>Add</button></div>
        </div>
      )}

      {/* AI systems: financial-model scaffolding */}
      {d.status !== 'cancelled' && (
        <>
          <H>Financial model</H>
          <FinancialModelPanel engagementId={d.id} />
        </>
      )}

      {/* Next action */}
      <H>Next step</H>
      {d.status === 'awaiting_deposit' && (
        <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
          Waiting for the deposit. No work starts until it is paid{isAdmin ? ' — record it under Invoices below.' : '.'}
        </p>
      )}
      {d.status === 'kickoff' && (
        <button className="thm-btn" disabled={busy} onClick={() => move('in_delivery', 'Delivery started')}>Kickoff done — start delivery</button>
      )}
      {d.status === 'in_delivery' && (
        <button className="thm-btn" disabled={busy} onClick={() => move('qa', 'Moved to quality check')}>Deliverables drafted — start QA</button>
      )}
      {d.status === 'qa' && (
        <div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Delivery notes (walkthrough, handover)</label>
            <textarea className="form-input" style={{ height: 60, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {qaHours !== null && qaHours < 24 && (
            <p style={{ fontSize: 12, color: 'var(--orange)' }}>
              <FiAlertTriangle style={{ verticalAlign: '-2px' }} /> QA was completed {Math.max(0, Math.round(qaHours))}h ago — the standard is 24 hours before final delivery.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="thm-btn" disabled={busy || qaLeft > 0} onClick={() => move('delivered', 'Delivered — final invoice issued')}>
              {qaLeft > 0 ? `Complete QA first (${qaLeft} left)` : 'Mark delivered & issue final invoice'}
            </button>
            <button className="ai-thm-btn outline" disabled={busy} onClick={() => move('in_delivery', 'Back in delivery')}>Back to delivery</button>
          </div>
        </div>
      )}
      {d.status === 'delivered' && (
        <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>Delivered {fmtDateTime(d.delivered_at)}. Completes automatically when the final invoice is paid.</p>
      )}
      {d.status === 'completed' && (
        <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>Completed {fmtDateTime(d.completed_at)}. Follow-ups are scheduled below.</p>
      )}

      {/* Deliverables: QA checklist + approval before anything reaches the client */}
      {!['awaiting_deposit', 'cancelled'].includes(d.status) && (
        <>
          <H>Deliverables & QA</H>
          <DeliverablesPanel engagementId={d.id} mode="staff" />
        </>
      )}

      {/* QA checklist */}
      {d.qa_items?.length > 0 && (
        <>
          <H>Final delivery QA checklist ({d.qa_done}/{d.qa_total})</H>
          {d.qa_items.map(q => (
            <div key={q.id}
              onClick={() => !busy && qaOpen && act(() => journeyAPI.setQaItem(q.id, !q.is_checked))}
              style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-light)', cursor: qaOpen ? 'pointer' : 'default' }}>
              <span style={{ fontSize: 17, color: q.is_checked ? 'var(--green)' : '#9CA3AF', flexShrink: 0 }}>{q.is_checked ? <FiCheckSquare /> : <FiSquare />}</span>
              <div>
                <div style={{ fontSize: 13, color: '#000' }}>{q.label}</div>
                {q.is_checked && q.checked_by_name && <div style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>{q.checked_by_name} · {fmtDateTime(q.checked_at)}</div>}
              </div>
            </div>
          ))}
          {qaOpen && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="form-input" placeholder="Add a checklist point" value={newQa} onChange={e => setNewQa(e.target.value)} />
              <button className="ai-thm-btn outline" disabled={busy || !newQa.trim()}
                onClick={async () => { if (await act(() => journeyAPI.addQaItem(d.id, newQa))) setNewQa(''); }}>Add</button>
            </div>
          )}
        </>
      )}

      {/* Invoices */}
      <H>Invoices</H>
      {(d.invoices || []).map(i => (
        <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{i.invoice_no} · {i.kind === 'deposit' ? 'Deposit' : 'Final'}</div>
            <div style={{ fontSize: 12, color: '#4A4949' }}>
              {money(i.amount, i.currency)} · {i.status === 'paid' ? `paid ${fmtDate(i.paid_at)} (${(i.payment_method || '').replace('_', ' ')})` : `due ${fmtDate(i.due_date)}`}
              {i.reminder_days?.length ? ` · reminders sent: day ${i.reminder_days.join(', ')}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Badge status={invoiceBadge(i)} text={i.status} />
            {isAdmin && i.status === 'unpaid' && (
              <button className="thm-btn" onClick={() => setPayFor({ ...i, method: 'bank_transfer', reference: '' })}>Record payment</button>
            )}
          </div>
        </div>
      ))}
      {!d.invoices?.length && <p style={{ fontSize: 13, color: 'var(--text-dark-4)' }}>No invoices yet.</p>}

      {/* Follow-ups */}
      {isAdmin && d.followups?.length > 0 && (
        <>
          <H>Follow-ups</H>
          {d.followups.map(f => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
              <span>Day {f.day_offset} · {f.kind === 'referral' ? 'Referral ask' : 'Check-in'} · {fmtDate(f.due_date)}</span>
              <Badge status={f.status === 'scheduled' ? 'scheduled' : f.status === 'sent' ? 'open' : f.status === 'done' ? 'completed' : 'cancelled'} text={f.status} />
            </div>
          ))}
        </>
      )}

      {isAdmin && !['completed', 'cancelled'].includes(d.status) && (
        <button className="ai-remove-btn" style={{ marginTop: 16 }} disabled={busy}
          onClick={() => window.confirm('Cancel this engagement and void unpaid invoices?') && move('cancelled', 'Engagement cancelled')}>
          Cancel engagement
        </button>
      )}

      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `Record payment — ${payFor.invoice_no}` : 'Record payment'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="ai-thm-btn outline" onClick={() => setPayFor(null)}>Cancel</button>
            <button className="ai-thm-btn" disabled={busy} onClick={recordPayment}>{busy ? 'Saving…' : 'Record Payment'}</button>
          </div>
        }>
        {payFor && (
          <div className="row g-3">
            <p style={{ fontSize: 13, color: '#4A4949' }}>{money(payFor.amount, payFor.currency)} — {payFor.kind === 'deposit' ? 'recording the deposit starts the engagement (kickoff).' : 'recording the final payment completes the engagement.'}</p>
            <div className="col-md-6 form-group"><label className="form-label">Method</label>
              <select className="form-select" value={payFor.method} onChange={e => setPayFor(p => ({ ...p, method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select></div>
            <div className="col-md-6 form-group"><label className="form-label">Reference</label>
              <input className="form-input" placeholder="Transfer ref / receipt no." value={payFor.reference} onChange={e => setPayFor(p => ({ ...p, reference: e.target.value }))} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

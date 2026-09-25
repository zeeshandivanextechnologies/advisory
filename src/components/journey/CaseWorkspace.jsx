import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Spinner, EmptyState, Modal, showToast } from '../common/index';
import { caseWorkspaceAPI } from '../../services/api';
import { fmtDate, fmtDateTime } from '../../utils/services';
import { ChecklistSuggestions } from './AiPanels';
import { FiCheckSquare, FiSquare, FiPlus, FiFlag } from 'react-icons/fi';

const COLUMNS = [
  { key: 'pending',     label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked',     label: 'Blocked' },
  { key: 'done',        label: 'Done' },
];
const UPDATE_TYPES = [
  { value: 'weekly',   label: 'Weekly (Friday) update' },
  { value: 'kickoff',  label: 'Kickoff summary' },
  { value: 'delivery', label: 'Delivery update' },
  { value: 'general',  label: 'General update' },
];
const updateLabel = (v) => UPDATE_TYPES.find(t => t.value === v)?.label || 'Update';

const Footer = ({ onCancel, onSave, saving, label = 'Save' }) => (
  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
    <button className="ai-thm-btn outline" onClick={onCancel}>Cancel</button>
    <button className="ai-thm-btn" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : label}</button>
  </div>
);

/*
 * Shared case workspace (steps 7–8): delivery phases as a Kanban board,
 * kickoff checklist and status updates. Staff (admin / assigned advisor)
 * edit everything; the client ticks checklist items and reads updates.
 */
export default function CaseWorkspace({ caseId }) {
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [milestone, setMilestone] = useState(null);
  const [item, setItem]         = useState(null);
  const [update, setUpdate]     = useState(null);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    caseWorkspaceAPI.getDetail(caseId)
      .then(r => setDetail(r.data.data))
      .catch(err => showToast(err.response?.data?.message || 'Failed to load workspace', 'error'))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const staff = detail?.access === 'staff';
  const run = async (fn, okMsg) => {
    setSaving(true);
    try { await fn(); if (okMsg) showToast(okMsg); load(); return true; }
    catch (err) { showToast(err.response?.data?.message || 'Action failed', 'error'); return false; }
    finally { setSaving(false); }
  };

  const moveMilestone = (m, status) => run(() => caseWorkspaceAPI.saveMilestone(caseId, m.id, { status }));
  const saveMilestone = async () => {
    if (!milestone.title?.trim()) return showToast('Title is required', 'error');
    const { id, ...data } = milestone;
    if (await run(() => caseWorkspaceAPI.saveMilestone(caseId, id, data), id ? 'Phase updated' : 'Phase added')) setMilestone(null);
  };
  const toggleItem = (i) => run(() => caseWorkspaceAPI.saveChecklistItem(caseId, i.id, { is_done: !i.is_done }));
  const saveItem = async () => {
    if (!item.title?.trim()) return showToast('Title is required', 'error');
    if (await run(() => caseWorkspaceAPI.saveChecklistItem(caseId, null, item), 'Checklist item added')) setItem(null);
  };
  const saveUpdate = async () => {
    if (!update.summary?.trim()) return showToast('Summary is required', 'error');
    if (await run(() => caseWorkspaceAPI.addUpdate(caseId, update), 'Update posted — the client has been notified')) setUpdate(null);
  };

  if (loading) return <Spinner />;
  if (!detail) return <EmptyState icon={<FiFlag />} title="Workspace unavailable" text="This case could not be loaded" />;

  const milestones = detail.milestones || [];
  const nextStatus = { pending: 'in_progress', in_progress: 'done', blocked: 'in_progress' };

  return (
    <>
      {/* Header */}
      <div className="advisor-legal-cards mb-3 h-auto">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <h3 style={{ fontSize: 18, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 2 }}>{detail.title}</h3>
            <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
              {detail.case_number}{detail.advisor_name ? ` · Advisor: ${detail.advisor_name}` : ''} · Client: {detail.user_name}
            </p>
          </div>
          <Badge status={detail.status} />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4A4949', marginBottom: 4 }}>
            <span>Delivery progress</span><span><b>{detail.progress || 0}%</b></span>
          </div>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: `${detail.progress || 0}%`, height: '100%', background: 'var(--green)' }} />
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="advisor-legal-cards mb-3 h-auto">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 0 }}>Delivery Phases</h4>
          {staff && <button className="thm-btn" onClick={() => setMilestone({ title: '', phase: '', status: 'pending', due_date: '', description: '' })}><FiPlus /> Add Phase</button>}
        </div>
        {milestones.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0, textAlign : 'center' }}>No phases yet.</p>
        ) : (
          <div className="row g-2">
            {COLUMNS.map(col => {
              const cards = milestones.filter(m => m.status === col.key);
              return (
                <div key={col.key} className="col-lg-3 col-md-6 col-12">
                  <div style={{ background: '#F8F9FA', border: '1px solid var(--border-light)', borderRadius: 8, padding: 10, minHeight: 120 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4A4949', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      {col.label} ({cards.length})
                    </div>
                    {cards.map(m => (
                      <div key={m.id} style={{ background: '#fff', border: '1px solid var(--border-light)', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                        {m.phase && <div style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>{m.phase}</div>}
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{m.title}</div>
                        {m.due_date && <div style={{ fontSize: 11, color: '#4A4949', marginTop: 2 }}>Due {fmtDate(m.due_date)}</div>}
                        {staff && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {nextStatus[m.status] && (
                              <button className="thm-btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => moveMilestone(m, nextStatus[m.status])}>
                                {nextStatus[m.status] === 'done' ? 'Mark done' : 'Start'}
                              </button>
                            )}
                            {m.status !== 'blocked' && m.status !== 'done' && (
                              <button className="ai-thm-btn outline" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => moveMilestone(m, 'blocked')}>Blocked</button>
                            )}
                            <button className="ai-thm-btn outline" style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => setMilestone({ id: m.id, title: m.title, phase: m.phase || '', status: m.status, due_date: m.due_date || '', description: m.description || '' })}>
                              Edit
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="row">
        {/* Kickoff checklist */}
        <div className="col-lg-5 mb-3">
          <div className="advisor-legal-cards h-100">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 0 }}>Kickoff Checklist</h4>
              {staff && <button className="thm-btn" onClick={() => setItem({ title: '', description: '' })}><FiPlus /> Add</button>}
            </div>
            {detail.checklist?.length ? detail.checklist.map(i => (
              <div key={i.id} onClick={() => !saving && toggleItem(i)}
                style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                <span style={{ fontSize: 18, color: i.is_done ? 'var(--green)' : '#9CA3AF', flexShrink: 0 }}>{i.is_done ? <FiCheckSquare /> : <FiSquare />}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#000', textDecoration: i.is_done ? 'line-through' : 'none' }}>{i.title}</div>
                  {i.description && <div style={{ fontSize: 12, color: '#4A4949' }}>{i.description}</div>}
                </div>
              </div>
            )) : <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0,  textAlign : 'center' }}>No checklist items.</p>}
            {staff && (
              <ChecklistSuggestions caseId={caseId}
                onAdd={(i) => run(() => caseWorkspaceAPI.saveChecklistItem(caseId, null, { title: i.title, description: i.description }), 'Checklist item added')} />
            )}
          </div>
        </div>

        {/* Status updates */}
        <div className="col-lg-7 mb-3">
          <div className="advisor-legal-cards h-100">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontSize: 16, fontFamily: 'var(--font-h)', fontWeight: 600, color: '#000', marginBottom: 0 }}>Status Updates</h4>
              {staff && <button className="thm-btn" onClick={() => setUpdate({ update_type: 'weekly', summary: '', next_steps: '', blockers: '' })}><FiPlus /> Post Update</button>}
            </div>
            {detail.updates?.length ? detail.updates.map(u => (
              <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#000' }}>{updateLabel(u.update_type)}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dark-4)' }}>{fmtDateTime(u.created_at)}{u.author_name ? ` · ${u.author_name}` : ''}</span>
                </div>
                <p style={{ fontSize: 13, color: '#4A4949', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{u.summary}</p>
                {u.next_steps && <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 2 }}><b>Next steps:</b> {u.next_steps}</p>}
                {u.blockers && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 0 }}><b>Blockers:</b> {u.blockers}</p>}
              </div>
            )) : <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0,  textAlign : 'center' }}>No updates yet. Updates are posted every Friday.</p>}
          </div>
        </div>
      </div>

      <Modal open={!!milestone} onClose={() => setMilestone(null)} title={milestone?.id ? 'Edit Phase' : 'Add Phase'}
        footer={<Footer onCancel={() => setMilestone(null)} onSave={saveMilestone} saving={saving} />}>
        {milestone && (
          <div className="row g-3">
            <div className="col-md-4 form-group"><label className="form-label">Phase</label>
              <input className="form-input" placeholder="Phase 2" value={milestone.phase} onChange={e => setMilestone(p => ({ ...p, phase: e.target.value }))} /></div>
            <div className="col-md-8 form-group"><label className="form-label">Title *</label>
              <input className="form-input" value={milestone.title} onChange={e => setMilestone(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="col-md-6 form-group"><label className="form-label">Status</label>
              <select className="form-select" value={milestone.status} onChange={e => setMilestone(p => ({ ...p, status: e.target.value }))}>
                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select></div>
            <div className="col-md-6 form-group"><label className="form-label">Due date</label>
              <input type="date" className="form-input" value={milestone.due_date} onChange={e => setMilestone(p => ({ ...p, due_date: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">Description</label>
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={milestone.description} onChange={e => setMilestone(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
        )}
      </Modal>

      <Modal open={!!item} onClose={() => setItem(null)} title="Add Checklist Item"
        footer={<Footer onCancel={() => setItem(null)} onSave={saveItem} saving={saving} label="Add" />}>
        {item && (
          <div className="row g-3">
            <div className="col-12 form-group"><label className="form-label">Title *</label>
              <input className="form-input" value={item.title} onChange={e => setItem(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">Details</label>
              <textarea className="form-input" style={{ height: 70, resize: 'vertical' }} value={item.description} onChange={e => setItem(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
        )}
      </Modal>

      <Modal open={!!update} onClose={() => setUpdate(null)} title="Post Status Update"
        footer={<Footer onCancel={() => setUpdate(null)} onSave={saveUpdate} saving={saving} label="Post Update" />}>
        {update && (
          <div className="row g-3">
            <div className="col-12 form-group"><label className="form-label">Type</label>
              <select className="form-select" value={update.update_type} onChange={e => setUpdate(p => ({ ...p, update_type: e.target.value }))}>
                {UPDATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
            <div className="col-12 form-group"><label className="form-label">What happened this week *</label>
              <textarea className="form-input" style={{ height: 90, resize: 'vertical' }} value={update.summary} onChange={e => setUpdate(p => ({ ...p, summary: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">Next steps</label>
              <textarea className="form-input" style={{ height: 60, resize: 'vertical' }} value={update.next_steps} onChange={e => setUpdate(p => ({ ...p, next_steps: e.target.value }))} /></div>
            <div className="col-12 form-group"><label className="form-label">Blockers</label>
              <input className="form-input" value={update.blockers} onChange={e => setUpdate(p => ({ ...p, blockers: e.target.value }))} /></div>
          </div>
        )}
      </Modal>
    </>
  );
}

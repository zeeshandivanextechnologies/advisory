import React, { useState, useEffect } from 'react';
import { Modal, Spinner, showToast } from '../common/index';
import { serviceAPI } from '../../services/api';
import { RETAINER_CATEGORIES, retainerCategoryLabel, fmtDate, hours } from '../../utils/services';

const today = () => new Date().toISOString().slice(0, 10);

/* ── Log hours against a retainer (admin / assigned advisor) ── */
export function LogHoursModal({ open, retainer, onClose, onSaved }) {
  const [form, setForm]     = useState({ work_date: today(), hours: '', category: 'regulatory_guidance', description: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) setForm({ work_date: today(), hours: '', category: 'regulatory_guidance', description: '' });
  }, [open]);

  const save = async () => {
    if (!Number(form.hours)) return showToast('Enter the hours worked', 'error');
    setSaving(true);
    try {
      await serviceAPI.logHours(retainer.id, { ...form, hours: Number(form.hours) });
      showToast('Hours logged');
      onSaved?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not log hours', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={retainer ? `Log hours — ${retainer.client_name}` : 'Log hours'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="ai-thm-btn outline" onClick={onClose}>Cancel</button>
          <button className="ai-thm-btn" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Log Hours'}</button>
        </div>
      }
    >
      {retainer && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: '#4A4949', marginBottom: 0 }}>
            {retainer.month}: <b>{hours(retainer.month_used)}</b> used of {hours(retainer.monthly_hours)} ·{' '}
            <b>{hours(retainer.month_remaining)}</b> left. Unused hours do not roll over.
          </p>
          <div className="row g-2">
            <div className="col-6 form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" max={today()} value={form.work_date} onChange={e => set('work_date', e.target.value)} />
            </div>
            <div className="col-6 form-group">
              <label className="form-label">Hours *</label>
              <input type="number" className="form-input" min="0.25" step="0.25" placeholder="1.5" value={form.hours} onChange={e => set('hours', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Type of work</label>
            <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
              {RETAINER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">What was done</label>
            <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} placeholder="e.g. Reviewed QFC licence requirements"
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Month-by-month usage and the full log ── */
export function RetainerLogModal({ open, retainerId, onClose, currentUserId, isAdmin, onChanged }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!retainerId) return;
    setLoading(true);
    serviceAPI.getRetainer(retainerId)
      .then(r => setDetail(r.data.data))
      .catch(() => showToast('Failed to load retainer', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load(); else setDetail(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retainerId]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const canDelete = (l) => isAdmin || (l.logged_by === currentUserId && String(l.work_date).slice(0, 7) === thisMonth);

  const remove = async (l) => {
    try {
      await serviceAPI.deleteLog(l.id);
      showToast('Entry removed');
      load();
      onChanged?.();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not remove entry', 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={detail ? `${detail.offering_name} — ${detail.client_name}` : 'Retainer log'}>
      {loading || !detail ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h6 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 8 }}>Monthly usage</h6>
            {(detail.months || []).map(m => (
              <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4A4949', padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span>{m.month}</span>
                <span><b>{hours(m.used)}</b> / {hours(m.allotted)}</span>
              </div>
            ))}
          </div>
          <div>
            <h6 style={{ fontSize: 14, fontWeight: 600, color: '#000', marginBottom: 8 }}>Time entries</h6>
            {detail.logs?.length ? detail.logs.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <h5 style={{ fontSize: 13, fontWeight: 600, color: '#000', marginBottom: 2 }}>
                    {fmtDate(l.work_date)} · {hours(l.hours)} · {retainerCategoryLabel(l.category)}
                  </h5>
                  {l.description && <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 2 }}>{l.description}</p>}
                  {l.logged_by_name && <p style={{ fontSize: 11, color: 'var(--text-dark-4)', marginBottom: 0 }}>by {l.logged_by_name}</p>}
                </div>
                {canDelete(l) && (
                  <button className="ai-remove-btn" style={{ alignSelf: 'center' }} onClick={() => remove(l)}>Remove</button>
                )}
              </div>
            )) : <p style={{ fontSize: 13, color: 'var(--text-dark-4)', marginBottom: 0 }}>No time logged yet.</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

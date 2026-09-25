import React, { useState } from 'react';
import { showToast } from '../common/index';
import { aiAPI } from '../../services/api';
import { FiCpu, FiDownload, FiPlus } from 'react-icons/fi';

const errMsg = (err, fb) => err.response?.data?.message || fb;

// Shown on every AI output: the staffing model requires human review
export const AiReviewNote = () => (
  <p style={{ fontSize: 11, color: '#92400E', background: '#F59E0B1F', borderRadius: 6, padding: '6px 10px', margin: '8px 0' }}>
    <FiCpu style={{ verticalAlign: '-2px' }} /> AI draft — review, correct and approve before it is used or shared with a client.
  </p>
);

export const AiButton = ({ onClick, busy, children = 'Draft with AI' }) => (
  <button type="button" className="ai-thm-btn outline" disabled={busy} onClick={onClick}>
    <FiCpu /> {busy ? 'Drafting…' : children}
  </button>
);

/* Financial-model scaffolding for an engagement */
export function FinancialModelPanel({ engagementId }) {
  const [busy, setBusy]   = useState(false);
  const [model, setModel] = useState(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await aiAPI.financialModel(engagementId);
      setModel(r.data.data);
    } catch (err) {
      showToast(errMsg(err, 'Could not draft the model'), 'error');
    } finally { setBusy(false); }
  };

  const downloadCsv = () => {
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Assumptions'], ['Category', 'Name', 'Value', 'Basis'],
      ...(model.assumptions || []).map(a => [a.category, a.name, a.value, a.basis]),
      [], ['12-month projection', model.currency], ['Month', 'Revenue', 'Costs', 'Net', 'Notes'],
      ...(model.monthly || []).map(m => [m.month, m.revenue, m.costs, m.net, m.notes]),
    ];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url; a.download = `financial-model-scaffold-${engagementId}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AiButton onClick={run} busy={busy}>{model ? 'Redraft model scaffold' : 'Draft financial model scaffold'}</AiButton>
        {model && <button type="button" className="ai-thm-btn outline" onClick={downloadCsv}><FiDownload /> CSV</button>}
      </div>
      {model && (
        <div style={{ marginTop: 8 }}>
          <AiReviewNote />
          {model.summary && <p style={{ fontSize: 13, color: '#4A4949' }}>{model.summary}</p>}
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-2 ai-case-table">
              <thead><tr><th>Assumption</th><th>Value</th><th>Basis</th></tr></thead>
              <tbody>
                {(model.assumptions || []).map((a, i) => (
                  <tr key={i}><td><div className="plan-table-content"><h5>{a.name}</h5><p>{a.category}</p></div></td><td>{a.value}</td><td style={{ fontSize: 12 }}>{a.basis}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-responsive">
            <table className="table billing-table align-middle mb-2 ai-case-table">
              <thead><tr><th>Month</th><th>Revenue</th><th>Costs</th><th>Net ({model.currency})</th></tr></thead>
              <tbody>
                {(model.monthly || []).map(m => (
                  <tr key={m.month}><td>{m.month}</td><td>{fmt(m.revenue)}</td><td>{fmt(m.costs)}</td><td style={{ color: m.net < 0 ? 'var(--red)' : undefined }}>{fmt(m.net)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {model.risks?.length > 0 && <p style={{ fontSize: 12, color: '#4A4949', marginBottom: 4 }}><b style={{ color: '#000' }}>Risks:</b> {model.risks.join(' · ')}</p>}
          {model.next_steps?.length > 0 && <p style={{ fontSize: 12, color: '#4A4949' }}><b style={{ color: '#000' }}>Next steps:</b> {model.next_steps.join(' · ')}</p>}
        </div>
      )}
    </div>
  );
}

/* Checklist suggestions for a case workspace; `onAdd(item)` adds one */
export function ChecklistSuggestions({ caseId, onAdd }) {
  const [busy, setBusy]   = useState(false);
  const [items, setItems] = useState(null);

  const run = async () => {
    setBusy(true);
    try {
      const r = await aiAPI.checklist(caseId);
      setItems(r.data.data.items || []);
    } catch (err) {
      showToast(errMsg(err, 'Could not suggest items'), 'error');
    } finally { setBusy(false); }
  };

  const add = async (item) => {
    if (await onAdd(item)) setItems(list => list.filter(x => x !== item));
  };

  return (
    <div style={{ marginTop: 10 }}>
      <AiButton onClick={run} busy={busy}>Suggest checklist items</AiButton>
      {items && (
        <div style={{ marginTop: 8 }}>
          <AiReviewNote />
          {items.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-dark-4)' }}>No new suggestions.</p>}
          {items.map((i, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{i.title}</div>
                <div style={{ fontSize: 12, color: '#4A4949' }}>{i.description}</div>
              </div>
              <button type="button" className="ai-thm-btn outline" style={{ alignSelf: 'center' }} onClick={() => add(i)}><FiPlus /> Add</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

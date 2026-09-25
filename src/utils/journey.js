/* Labels and helpers for proposals, engagements, invoices and follow-ups */

export const ENGAGEMENT_STEPS = [
  { key: 'awaiting_deposit', label: 'Deposit' },
  { key: 'kickoff',          label: 'Kickoff' },
  { key: 'in_delivery',      label: 'Delivery' },
  { key: 'qa',               label: 'QA' },
  { key: 'delivered',        label: 'Delivered' },
  { key: 'completed',        label: 'Completed' },
];

export const ENGAGEMENT_LABELS = {
  awaiting_deposit: 'Awaiting deposit', kickoff: 'Kickoff', in_delivery: 'In delivery', qa: 'Quality check',
  delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled',
};

export const PROPOSAL_LABELS = {
  draft: 'Draft', sent: 'Awaiting response', accepted: 'Accepted', declined: 'Declined', expired: 'Expired', withdrawn: 'Withdrawn',
};

// Badge colour keys that already exist in the shared Badge component
export const engagementBadge = (s) => ({
  awaiting_deposit: 'pending', kickoff: 'open', in_delivery: 'in_progress', qa: 'review',
  delivered: 'approved', completed: 'completed', cancelled: 'cancelled',
}[s] || s);
export const proposalBadge = (p) => (p.is_expired ? 'expired' : ({
  draft: 'draft', sent: 'pending', accepted: 'approved', declined: 'declined', expired: 'expired', withdrawn: 'cancelled',
}[p.status] || p.status));
export const invoiceBadge = (i) => ({ unpaid: 'pending', paid: 'completed', void: 'cancelled' }[i.status] || i.status);

export const FIT_DECISIONS = [
  { value: 'go',      label: 'Go — send a proposal' },
  { value: 'nurture', label: 'Nurture — serious but not ready' },
  { value: 'refer',   label: 'Refer — better served elsewhere' },
  { value: 'no_go',   label: 'No-go — not a fit' },
];

export const LEAD_SOURCES = [
  { value: 'referral',      label: 'Referral' },
  { value: 'social',        label: 'Social media' },
  { value: 'event',         label: 'Event' },
  { value: 'webinar',       label: 'Webinar' },
  { value: 'diaspora',      label: 'Diaspora group' },
  { value: 'trade_mission', label: 'Trade mission' },
  { value: 'partner',       label: 'Partner introduction' },
  { value: 'website',       label: 'Website / search' },
];
export const leadSourceLabel = (v) => LEAD_SOURCES.find(s => s.value === v)?.label || v || '—';

export const LEAD_STATUSES = [
  { value: 'new',       label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal',  label: 'Proposal' },
  { value: 'won',       label: 'Won' },
  { value: 'lost',      label: 'Lost' },
  { value: 'nurture',   label: 'Nurture' },
];

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card',          label: 'Card' },
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
];

// Path to the case workspace for the viewer's role
export const workspacePath = (role, caseId) => `/${role === 'admin' ? 'admin' : role === 'advisor' ? 'advisor' : 'user'}/cases/${caseId}`;

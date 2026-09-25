/* Shared helpers for the services catalog, retainers and community pages */

export const money = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined || amount === '') return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
};

// "$1,000" · "$5,000+" · "$2,500 – $5,000" · "$2,500 / month" · "Membership" · "On request"
export const priceLabel = (o) => {
  const c = o.currency || 'USD';
  switch (o.pricing_model) {
    case 'fixed':       return money(o.price_min, c);
    case 'starting_at': return `${money(o.price_min, c)}+`;
    case 'range':       return `${money(o.price_min, c)} – ${money(o.price_max, c)}`;
    case 'monthly':     return `${money(o.price_min, c)} / month`;
    case 'membership':  return 'Membership';
    default:            return 'On request';
  }
};

export const PRICING_MODELS = [
  { value: 'fixed',       label: 'Fixed price' },
  { value: 'starting_at', label: 'Starting at' },
  { value: 'range',       label: 'Price range' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'membership',  label: 'Membership' },
  { value: 'on_request',  label: 'On request' },
];

export const CATEGORY_LABELS = {
  decision: 'Decision', preparation: 'Preparation', execution: 'Execution',
  relationships: 'Relationships', retention: 'Retention',
};

export const REQUEST_STATUSES = [
  { value: 'new',           label: 'New' },
  { value: 'in_review',     label: 'In review' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'won',           label: 'Won' },
  { value: 'declined',      label: 'Declined' },
  { value: 'cancelled',     label: 'Cancelled' },
  { value: 'nurture',       label: 'Nurture' },
  { value: 'referred',      label: 'Referred' },
];

// Sales rules: budget ranges (budget_min drives the $5,000 fit check)
export const BUDGET_RANGES = [
  { label: 'Under $5,000',        min: 0 },
  { label: '$5,000 – $15,000',    min: 5000 },
  { label: '$15,000 – $30,000',   min: 15000 },
  { label: 'Over $30,000',        min: 30000 },
  { label: 'Not sure yet',        min: null },
];
export const PROSPECT_TYPES = [
  { value: 'standard',       label: 'Standard' },
  { value: 'strategic',      label: 'Strategic prospect (+1 relationship call with a defined deal)' },
  { value: 'government',     label: 'Government (no meeting limits)' },
  { value: 'embassy',        label: 'Embassy (no meeting limits)' },
  { value: 'anchor_partner', label: 'Anchor-referral partner (no meeting limits)' },
];
// Project offerings are subject to the minimum-budget fit check
export const isProjectOffering = (o) => ['fixed', 'starting_at', 'range'].includes(o?.pricing_model) && o?.slug !== 'executive-discovery-sessions';

export const OPEN_REQUEST = ['new', 'in_review', 'proposal_sent'];

export const RETAINER_CATEGORIES = [
  { value: 'regulatory_guidance', label: 'Regulatory guidance' },
  { value: 'contract_review',     label: 'Contract-review coordination' },
  { value: 'strategic_checkin',   label: 'Strategic check-in' },
  { value: 'government_liaison',  label: 'Government liaison advice' },
  { value: 'introductions',       label: 'Introductions' },
  { value: 'other',               label: 'Other' },
];
export const retainerCategoryLabel = (v) => RETAINER_CATEGORIES.find(c => c.value === v)?.label || 'Other';

export const EVENT_TYPES = [
  { value: 'integra_night', label: 'Integra Night' },
  { value: 'webinar',       label: 'Webinar' },
  { value: 'product_demo',  label: 'Product demo' },
  { value: 'workshop',      label: 'Workshop' },
  { value: 'other',         label: 'Other' },
];
export const eventTypeLabel = (v) => EVENT_TYPES.find(t => t.value === v)?.label || 'Event';

export const AUDIENCE_LABELS = {
  all: 'Everyone', members: 'Members', gold: 'Gold members', retainer: 'Retainer clients',
};

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');
export const hours = (h) => `${Number(h || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;

// <input type="datetime-local"> ↔ ISO
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

// One item per line ↔ array
export const linesToList = (text) => String(text || '').split('\n').map(s => s.trim()).filter(Boolean);
export const listToLines = (list) => (Array.isArray(list) ? list.join('\n') : '');

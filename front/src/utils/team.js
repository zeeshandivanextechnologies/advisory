/* Staffing & delivery model (core-offerings document) */

export const STAFF_ROLES = [
  { value: 'founder', label: 'Founder / Principal Advisor',
    responsibility: 'Primary judgment, client meetings, regulatory navigation, relationship verification, final recommendations.',
    whenUsed: 'Every engagement (added automatically).', cost: 'Protect time; highest-value role.' },
  { value: 'advisor', label: 'Advisor / Consultant',
    responsibility: 'Delivery work on assigned engagements and retainers.',
    whenUsed: 'Assigned per engagement.', cost: 'Per engagement or hourly.' },
  { value: 'financial_specialist', label: 'Financial Specialist',
    responsibility: 'Model review, assumptions check, sector-specific modeling support.',
    whenUsed: 'Market Entry Blueprint and larger engagements.', cost: '$500–$1,500 per project estimate.' },
  { value: 'legal_professional', label: 'Legal / Regulatory Professional',
    responsibility: 'Licensed legal review, document drafting, legal opinion, formal representation.',
    whenUsed: 'When needed and clearly scoped.', cost: 'Paid separately or via referral / MOU.' },
  { value: 'virtual_assistant', label: 'Virtual Assistant',
    responsibility: 'Intake tracking, scheduling, CRM hygiene, follow-up cadence, event list management.',
    whenUsed: 'After a repeatable pipeline starts.', cost: 'Use SOPs and checklists.' },
  { value: 'content_contractor', label: 'Content / Social Contractor',
    responsibility: 'Editing, graphics, video captions, publishing calendar, analytics report.',
    whenUsed: 'Social media and campaign execution.', cost: 'Project or monthly retainer.' },
];
export const staffRoleLabel = (v) => STAFF_ROLES.find(r => r.value === v)?.label || v;

export const COST_MODELS = [
  { value: 'none',        label: 'No direct cost' },
  { value: 'per_project', label: 'Per project' },
  { value: 'monthly',     label: 'Monthly retainer' },
  { value: 'hourly',      label: 'Hourly' },
  { value: 'referral',    label: 'Referral / MOU' },
];

// Limited admin logins: which admin pages and tabs each scope can open
export const ADMIN_SCOPES = [
  { value: 'virtual_assistant',  label: 'Virtual Assistant — leads, requests & intake, follow-ups, events' },
  { value: 'content_contractor', label: 'Content Contractor — market briefs and events' },
];
export const SCOPE_PAGES = {
  virtual_assistant:  ['/admin/leads', '/admin/services', '/admin/engagements', '/admin/community'],
  content_contractor: ['/admin/community'],
};
export const SCOPE_TABS = {
  virtual_assistant:  { services: ['requests'], engagements: ['followups'], community: ['memberships', 'events'] },
  content_contractor: { community: ['events', 'briefs'] },
};
export const isFullAdmin = (user) => user?.role === 'admin' && (user.admin_scope || 'full') === 'full';
// Filter a page's tabs for the viewer's scope (full admins see everything)
export const tabsFor = (user, page, tabs) => {
  if (isFullAdmin(user) || user?.role !== 'admin') return tabs;
  const allowed = SCOPE_TABS[user.admin_scope]?.[page];
  return allowed ? tabs.filter(t => allowed.includes(t.id)) : tabs;
};

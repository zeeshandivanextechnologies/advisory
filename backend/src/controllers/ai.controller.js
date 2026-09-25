const { rpc } = require('../config/db');
const { send } = require('../utils/http');
const HttpError = require('../utils/HttpError');
const ai = require('../services/ai');

/*
 * Drafting endpoints. Context is always loaded through the api_* functions as
 * the calling user, so the database decides what they may see (admin scopes,
 * assigned advisors). Output is a draft: returned for review, never sent.
 */

const ctx = (label, value) => `<${label}>\n${JSON.stringify(value ?? null, null, 2)}\n</${label}>`;

const requireScope = async (userId, allowed) => {
  const me = await rpc('api_my_team_scope', {}, userId);
  if (me.role !== 'admin' || !allowed.includes(me.admin_scope)) throw new HttpError(403, 'You do not have permission to do this');
};

const done = async (res, req, kind, contextType, contextId, input, result) => {
  const draftId = await ai.logDraft({ kind, contextType, contextId, userId: req.userId, input, output: result.data || { text: result.text, sources: result.sources }, model: result.model });
  send(res, { draft_id: draftId, model: result.model, review_required: true, ...(result.data || {}), ...(result.data ? {} : { text: result.text }), sources: result.sources });
};

/* Step 5: first draft of a proposal / SOW */
exports.proposalDraft = async (req, res) => {
  const c = await rpc('api_admin_proposal_context', { p_id: req.body.proposal_id }, req.userId);
  const result = await ai.generate({
    prompt: [
      'Draft the proposal / statement of work for this engagement, using the service definition as the boundary of what we offer.',
      'Keep the scope to 2–3 short paragraphs. Deliverables must be concrete and checkable. List what is not included so the boundaries are unambiguous.',
      'Keep legal work (drafting, opinions, representation) out of scope and note it is handled by licensed counsel where relevant.',
      ctx('service', c.offering), ctx('client_request', c.request), ctx('client_intake', c.intake), ctx('current_draft', c.proposal),
    ].join('\n\n'),
    schema: ai.obj({
      title: ai.str, scope: ai.str, deliverables: ai.strList, out_of_scope: ai.strList, timeline: ai.str, payment_terms: ai.str,
    }),
  });
  await done(res, req, 'proposal', 'proposal', req.body.proposal_id, { proposal_id: req.body.proposal_id }, result);
};

/* CRM automation: triage a lead and draft the first reply */
exports.leadReply = async (req, res) => {
  const lead = await rpc('api_admin_lead_detail', { p_id: req.body.lead_id }, req.userId);
  if (!lead) throw new HttpError(404, 'Lead not found');
  const result = await ai.generate({
    prompt: [
      'Summarise this inbound inquiry in one or two sentences, suggest the lead status, and draft a warm, concise first reply email.',
      'The reply should acknowledge their question, propose a short discovery call, and ask them to complete the intake form (industry, country, stage, capital, documents, timeline, main question). Do not quote prices or promise outcomes. Sign off as the team without a personal name.',
      ctx('lead', { name: lead.name, company: lead.company, subject: lead.subject, message: lead.message, source: lead.source }),
    ].join('\n\n'),
    schema: ai.obj({
      summary: ai.str,
      suggested_status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'nurture'] },
      reply_subject: ai.str,
      reply_body: ai.str,
    }),
    effort: 'low',
  });
  await done(res, req, 'lead_reply', 'lead', req.body.lead_id, { lead_id: req.body.lead_id }, result);
};

/* Research synthesis: Monthly Market Brief draft with web sources */
exports.briefDraft = async (req, res) => {
  await requireScope(req.userId, ['full', 'content_contractor']);
  const { topic, audience, period } = req.body;
  if (!String(topic || '').trim()) throw new HttpError(400, 'Enter a topic or title for the brief');
  const result = await ai.generate({
    prompt: [
      `Research and draft a Monthly Market Brief for ${period || 'this month'} on: ${topic}.`,
      `Audience: ${audience === 'retainer' ? 'retainer clients' : audience === 'members' ? 'network members' : 'clients and prospects'} considering or operating in the GCC.`,
      'Use web search for recent, verifiable developments (regulation, free zones, banking/KYC, incentives, market activity). Prefer official and reputable sources. Keep it to about 400–600 words with short headings, and finish with 3 practical takeaways.',
      'Begin your answer with a single line starting "Summary:" followed by a one-sentence summary, then a blank line, then the brief.',
    ].join('\n\n'),
    webSearch: true,
  });
  const [first, ...rest] = result.text.split('\n');
  const summary = /^summary:/i.test(first) ? first.replace(/^summary:\s*/i, '').trim() : '';
  const body = (summary ? rest.join('\n') : result.text).trim();
  await done(res, req, 'market_brief', 'brief', null, { topic, audience, period }, { ...result, data: { summary, body } });
};

/* Financial-model scaffolding for an engagement (staff on that engagement) */
exports.financialModel = async (req, res) => {
  const e = await rpc('api_engagement_detail', { p_id: req.body.engagement_id }, req.userId);
  if (e.access !== 'staff') throw new HttpError(403, 'You do not have permission to do this');
  let intake = null;
  try { intake = await rpc('api_get_intake', { p_user_id: e.user_id }, req.userId); } catch { /* optional context */ }
  const result = await ai.generate({
    prompt: [
      'Build the scaffold of a 12-month market-entry financial model for this engagement: the key assumptions (with the basis for each), a month-by-month projection (month 1–12) of revenue, costs and net, the main risks, and next steps.',
      'Use conservative, clearly labelled placeholder figures in the engagement currency where data is missing, and say which inputs the client must confirm. This is a starting point for the financial specialist to review, not a finished model.',
      ctx('engagement', { title: e.title, offering: e.offering_name, amount: e.amount, currency: e.currency, scope: e.proposal?.scope }),
      ctx('client_intake', intake),
    ].join('\n\n'),
    schema: ai.obj({
      summary: ai.str,
      currency: ai.str,
      assumptions: { type: 'array', items: ai.obj({ category: ai.str, name: ai.str, value: ai.str, basis: ai.str }) },
      monthly: { type: 'array', items: ai.obj({ month: { type: 'integer' }, revenue: ai.num, costs: ai.num, net: ai.num, notes: ai.str }) },
      risks: ai.strList,
      next_steps: ai.strList,
    }),
    effort: 'high',
  });
  await done(res, req, 'financial_model', 'engagement', req.body.engagement_id, { engagement_id: req.body.engagement_id }, result);
};

/* Checklist suggestions for a case workspace (staff on that case) */
exports.checklist = async (req, res) => {
  const c = await rpc('api_case_detail', { p_id: req.body.case_id }, req.userId);
  if (c.access !== 'staff') throw new HttpError(403, 'You do not have permission to do this');
  let intake = null;
  try { intake = await rpc('api_get_intake', { p_user_id: c.user_id }, req.userId); } catch { /* optional context */ }
  const result = await ai.generate({
    prompt: [
      'Suggest the document and readiness checklist the client needs for this case, for Qatar / GCC incorporation, KYC and bank readiness as relevant.',
      'Return 5–10 items that are not already on the checklist. Each item: a short imperative title and one sentence on what exactly is needed.',
      ctx('case', { title: c.title, category: c.category, jurisdiction: c.jurisdiction, description: c.description }),
      ctx('existing_checklist', (c.checklist || []).map((i) => i.title)),
      ctx('client_intake', intake),
    ].join('\n\n'),
    schema: ai.obj({ items: { type: 'array', items: ai.obj({ title: ai.str, description: ai.str }) } }),
    effort: 'low',
  });
  await done(res, req, 'checklist', 'case', req.body.case_id, { case_id: req.body.case_id }, result);
};

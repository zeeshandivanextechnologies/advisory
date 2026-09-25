const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../config/db');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

/*
 * AI systems from the staffing model: first drafts, templates, research
 * synthesis, financial-model scaffolding, checklists, CRM automation.
 * Low marginal cost, but every output is a draft for human review — it is
 * returned to the staff member, logged in ai_drafts, and never sent to a
 * client automatically.
 */

const AnthropicClient = Anthropic.default || Anthropic;
let client = null;

const getClient = () => {
  if (!client) {
    try {
      // Resolves ANTHROPIC_API_KEY (or another configured credential) from the environment
      client = new AnthropicClient();
    } catch {
      throw new HttpError(503, 'AI drafting is not configured. Set ANTHROPIC_API_KEY on the server.');
    }
  }
  return client;
};

// Tests inject a stub client
const setClientForTests = (c) => { client = c; };

const systemPrompt = () => `You draft internal working documents for ${env.appName}, a business advisory firm that helps international operators enter GCC markets, with a focus on Qatar: market-entry decisions, regulatory and KYC readiness, incorporation coordination, bank readiness and relationships.

${env.appName} is not a law firm, bank or government authority. Never present anything as legal advice, a legal opinion or a guaranteed approval (bank, licence, visa). Where licensed counsel or a regulator must be involved, say so plainly.

Write clear, practical, professional English for founders and executives. State assumptions explicitly instead of presenting them as facts. Where you make a recommendation, give the next step, who owns it and roughly when. An advisor reviews every draft before it is used.`;

const mapError = (err) => {
  if (err instanceof HttpError) return err;
  if (err instanceof AnthropicClient.AuthenticationError || err instanceof AnthropicClient.PermissionDeniedError) {
    return new HttpError(503, 'AI drafting is not configured correctly. Check ANTHROPIC_API_KEY on the server.');
  }
  if (err instanceof AnthropicClient.RateLimitError) return new HttpError(429, 'The AI service is busy. Please try again in a minute.');
  if (err instanceof AnthropicClient.APIError) return new HttpError(502, 'The AI service returned an error. Please try again.');
  if (/api key|apiKey|credentials/i.test(err?.message || '')) {
    return new HttpError(503, 'AI drafting is not configured. Set ANTHROPIC_API_KEY on the server.');
  }
  return err;
};

/**
 * One drafting request. With `schema` the reply is JSON matching it; with
 * `webSearch` Claude may search the web and the reply carries its sources.
 */
const generate = async ({ prompt, schema, webSearch = false, effort = 'medium' }) => {
  const params = {
    model: env.aiModel,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort, ...(schema ? { format: { type: 'json_schema', schema } } : {}) },
    // If a safety classifier declines, retry server-side on Anthropic's recommended fallback model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: systemPrompt(),
    ...(webSearch ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }] } : {}),
  };

  let messages = [{ role: 'user', content: prompt }];
  let final;
  try {
    // Server tools (web search) may pause a long turn; resume it a few times
    for (let turn = 0; turn < 4; turn++) {
      final = await getClient().beta.messages.stream({ ...params, messages }).finalMessage();
      if (final.stop_reason !== 'pause_turn') break;
      messages = [...messages, { role: 'assistant', content: final.content }];
    }
  } catch (err) {
    throw mapError(err);
  }

  if (final.stop_reason === 'refusal') throw new HttpError(422, 'The AI declined this request. Please draft this one manually.');
  if (final.stop_reason === 'max_tokens') throw new HttpError(502, 'The AI draft was cut off. Please try again.');

  const textBlocks = final.content.filter((b) => b.type === 'text');
  const text = textBlocks.map((b) => b.text).join('').trim();

  // Web sources cited in the answer (deduplicated)
  const sources = [];
  for (const b of textBlocks) {
    for (const c of b.citations || []) {
      if (c.url && !sources.some((s) => s.url === c.url)) sources.push({ url: c.url, title: c.title || c.url });
    }
  }

  let data = null;
  if (schema) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new HttpError(502, 'The AI returned an unreadable draft. Please try again.');
    }
  }
  return { text, data, sources, model: final.model || env.aiModel };
};

// Keep every draft so it can be reviewed later
const logDraft = async ({ kind, contextType, contextId, userId, input, output, model }) => {
  const { rows } = await pool.query(
    `insert into public.ai_drafts (kind, context_type, context_id, created_by, model, input, output)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [kind, contextType, contextId == null ? null : String(contextId), userId, model, JSON.stringify(input || {}), JSON.stringify(output || {})]
  );
  return rows[0].id;
};

// JSON-schema helpers (structured outputs need required + additionalProperties: false)
const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const str = { type: 'string' };
const num = { type: 'number' };
const strList = { type: 'array', items: str };

module.exports = { generate, logDraft, setClientForTests, obj, str, num, strList };

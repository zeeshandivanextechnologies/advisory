-- ═══════════════════════════════════════════════════════════════════════
-- Sales rules (core-offerings document, "Meeting Limits and Sales Process"):
--   * Free calls: at most one free discovery call before a paid pathway;
--     strategic prospects may get one extra relationship call when it
--     advances a defined deal
--   * Pre-close meetings: at most three meetings before a proposal, except
--     government, embassy and anchor-referral partners
--   * Proposal shelf life 15–30 days (configurable); serious-but-not-ready
--     clients are nurtured for up to six months
--   * Fit discipline: a project needs a budget of at least $5,000 and a
--     commitment to provide documents — otherwise refer or nurture
--
-- All limits live in `settings` (Admin → Settings → Sales Rules).
-- api_book_consultation, api_admin_send_proposal and _request_json keep their
-- signatures; existing behaviour is unchanged apart from the new checks.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.settings (key, value, is_public) values
  ('sales_rules_enabled',      '1',    false),
  ('sales_free_calls',         '1',    false),
  ('sales_max_premeetings',    '3',    false),
  ('sales_min_project_budget', '5000', false),
  ('sales_nurture_months',     '6',    false),
  ('proposal_valid_min_days',  '15',   false),
  ('proposal_valid_max_days',  '30',   false)
on conflict (key) do nothing;

-- ── Prospect profile (set by admins) ───────────────────────────────────

alter table public.profiles
  add column prospect_type text not null default 'standard'
    check (prospect_type in ('standard','strategic','government','embassy','anchor_partner')),
  add column relationship_deal text;   -- the defined deal that justifies an extra relationship call

-- ── Requests: budget, document commitment, nurture, referral ───────────

alter table public.service_requests
  add column budget_min          numeric(12,2),
  add column documents_committed boolean,
  add column nurture_until       date,
  add column referral_note       text;

alter table public.service_requests drop constraint service_requests_status_check;
alter table public.service_requests add constraint service_requests_status_check
  check (status in ('new','in_review','proposal_sent','won','declined','cancelled','nurture','referred'));

alter table public.contact_messages add column nurture_until date;

-- ── Helpers ────────────────────────────────────────────────────────────

create function public._setting_num(k text, dflt numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select value from settings where key = k), '')::numeric, dflt)
$$;

-- Where a client stands against the meeting rules
create function public._sales_status(uid uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  p          profiles;
  enabled    boolean := coalesce(_setting('sales_rules_enabled'), '1') = '1';
  free_lim   int;
  max_pre    int := _setting_num('sales_max_premeetings', 3)::int;
  paid       boolean;
  proposed   boolean;
  exempt     boolean;
  meetings   int;
  reason     text;
begin
  select * into p from profiles where id = uid;
  exempt := p.prospect_type in ('government','embassy','anchor_partner');
  free_lim := _setting_num('sales_free_calls', 1)::int
              + case when p.prospect_type = 'strategic' and nullif(trim(p.relationship_deal), '') is not null then 1 else 0 end;

  -- A paid pathway: any paid engagement invoice, a retainer, or an accepted proposal
  paid := exists (select 1 from engagement_invoices where user_id = uid and status = 'paid')
       or exists (select 1 from retainers where user_id = uid and status in ('active','paused'))
       or exists (select 1 from proposals where user_id = uid and status = 'accepted');
  proposed := exists (select 1 from proposals where user_id = uid and status in ('sent','accepted'));
  meetings := (select count(*) from consultations where user_id = uid and status in ('scheduled','completed','no_show'));

  if enabled and not exempt then
    if not paid and meetings >= free_lim then
      reason := 'free_limit';
    elsif not proposed and meetings >= max_pre then
      reason := 'meeting_cap';
    end if;
  end if;

  return jsonb_build_object(
    'rules_enabled', enabled,
    'prospect_type', p.prospect_type,
    'relationship_deal', p.relationship_deal,
    'exempt', exempt,
    'paid_pathway', paid,
    'proposal_stage', proposed,
    'meetings', meetings,
    'free_calls_limit', free_lim,
    'free_calls_left', case when paid or exempt or not enabled then null else greatest(free_lim - meetings, 0) end,
    'max_premeetings', max_pre,
    'can_book', reason is null,
    'blocked_reason', reason,
    'message', case reason
      when 'free_limit'  then 'You have used your complimentary discovery call. Book Executive Discovery Sessions or request a service to continue.'
      when 'meeting_cap' then 'We will send you a proposal before scheduling further meetings.'
    end);
end $$;

create function public.api_my_sales_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return _sales_status(me.id);
end $$;

create function public.api_admin_sales_profile(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  if not exists (select 1 from profiles where id = p_user_id) then raise exception 'User not found'; end if;
  return _sales_status(p_user_id);
end $$;

create function public.api_admin_set_prospect(p_user_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  update profiles set
    prospect_type     = coalesce(nullif(p->>'prospect_type', ''), prospect_type),
    relationship_deal = case when p ? 'relationship_deal' then nullif(trim(p->>'relationship_deal'), '') else relationship_deal end
  where id = p_user_id;
  if not found then raise exception 'User not found'; end if;
  return _sales_status(p_user_id);
end $$;

-- Fit discipline for a request: project offerings need the minimum budget and
-- a documents commitment. Discovery sessions, retainers and memberships are
-- the paid "not ready yet" pathways, so they are not checked.
create function public._request_fit(r public.service_requests) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o       service_offerings;
  min_b   numeric := _setting_num('sales_min_project_budget', 5000);
  reasons text[] := '{}';
  project boolean;
begin
  select * into o from service_offerings where id = r.offering_id;
  project := o.pricing_model in ('fixed','starting_at','range') and o.slug <> 'executive-discovery-sessions';
  if project then
    if r.budget_min is not null and r.budget_min < min_b then
      reasons := reasons || ('Budget below $' || to_char(min_b, 'FM999,999,999'));
    end if;
    if r.documents_committed is false then
      reasons := reasons || 'Cannot commit to the required documents'::text;
    end if;
  end if;
  return jsonb_build_object(
    'fit_applies', project,
    'fit_ok', array_length(reasons, 1) is null,
    'fit_reasons', to_jsonb(reasons),
    'fit_advice', case when array_length(reasons, 1) is null then null
                       else 'Refer or nurture rather than starting unpaid work' end);
end $$;

create or replace function public._request_json(r public.service_requests) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) || jsonb_build_object(
    'offering_name', o.name, 'offering_slug', o.slug, 'category', o.category,
    'pricing_model', o.pricing_model, 'price_min', o.price_min, 'price_max', o.price_max, 'currency', o.currency,
    'client_name', u.full_name, 'client_email', u.email,
    'prospect_type', u.prospect_type) || _request_fit(r)
  from service_offerings o, profiles u
  where o.id = r.offering_id and u.id = r.user_id
$$;

-- ── Requests: capture budget + documents, nurture, refer ───────────────

-- Wraps the original function (unchanged) and stores the fit inputs
alter function public.api_request_service(jsonb) rename to _request_service_base;

create function public.api_request_service(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  res jsonb := _request_service_base(p);
  r   service_requests;
begin
  update service_requests set
    budget_min          = nullif(p->>'budget_min', '')::numeric,
    documents_committed = case when p ? 'documents_committed' then (p->>'documents_committed')::boolean end
  where id = (res->>'id')::bigint
  returning * into r;
  return _request_json(r);
end $$;

create function public.api_admin_request_action(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  r      service_requests;
  action text := p->>'action';
  months int  := _setting_num('sales_nurture_months', 6)::int;
  o      service_offerings;
begin
  select * into r from service_requests where id = p_id for update;
  if r.id is null then raise exception 'Request not found'; end if;
  select * into o from service_offerings where id = r.offering_id;

  if action = 'nurture' then
    update service_requests set status = 'nurture', updated_at = now(),
           nurture_until = _qatar_today() + make_interval(months => months),
           admin_notes = coalesce(nullif(p->>'note', ''), admin_notes)
     where id = r.id returning * into r;
    perform _notify(r.user_id, 'case', 'We will stay in touch',
      'When you are ready to move ahead with ' || o.name || ', reply any time — we will check in over the coming months.', '/user/services');
  elsif action = 'refer' then
    if nullif(trim(p->>'note'), '') is null then raise exception 'Add who you are referring the client to'; end if;
    update service_requests set status = 'referred', updated_at = now(), referral_note = trim(p->>'note')
     where id = r.id returning * into r;
    perform _notify(r.user_id, 'case', 'A better-suited partner',
      'For ' || o.name || ' we have suggested: ' || r.referral_note, '/user/services');
  else
    raise exception 'Unknown action';
  end if;
  return _request_json(r);
end $$;

-- ── Leads: nurture period ──────────────────────────────────────────────

create or replace function public.api_admin_update_lead(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  m  contact_messages;
  months int := _setting_num('sales_nurture_months', 6)::int;
begin
  update contact_messages set
    status        = coalesce(nullif(p->>'status', ''), status),
    notes         = case when p ? 'notes' then p->>'notes' else notes end,
    source        = coalesce(nullif(p->>'source', ''), source),
    assigned_to   = case when p ? 'assigned_to' then nullif(p->>'assigned_to', '')::uuid else assigned_to end,
    nurture_until = case
                      when coalesce(nullif(p->>'status', ''), status) = 'nurture'
                        then coalesce(nurture_until, _qatar_today() + make_interval(months => months))
                      else null end,
    updated_at    = now()
  where id = p_id returning * into m;
  if m.id is null then raise exception 'Lead not found'; end if;
  return to_jsonb(m);
end $$;

-- ── Booking enforces the meeting rules ─────────────────────────────────

create or replace function public.api_book_consultation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['user']);
  a      advisors;
  v_case bigint   := nullif(p->>'case_id', '')::bigint;
  v_doc  bigint   := nullif(p->>'document_id', '')::bigint;
  v_at   timestamptz := (p->>'scheduled_at')::timestamptz;
  v_dur  int := coalesce(nullif(p->>'duration_min', '')::int, 30);
  c      consultations;
  sales  jsonb := _sales_status(me.id);
begin
  -- Sales rules: free-call limit and pre-proposal meeting cap
  if not (sales->>'can_book')::boolean then
    raise exception '%', sales->>'message';
  end if;

  select * into a from advisors where id = nullif(p->>'advisor_id', '')::bigint;
  if a.id is null or a.status <> 'active' then raise exception 'Advisor not found'; end if;
  if not a.is_available then raise exception 'This advisor is not currently accepting bookings'; end if;
  if v_at is null or v_at < now() then raise exception 'Please choose a future date and time'; end if;
  if v_case is not null and not exists (select 1 from cases where id = v_case and user_id = me.id) then
    raise exception 'Case not found';
  end if;
  if v_doc is not null and not exists (select 1 from documents where id = v_doc and user_id = me.id) then
    raise exception 'Document not found';
  end if;
  if exists (
    select 1 from consultations
    where advisor_id = a.id and status = 'scheduled'
      and tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_min))
       && tstzrange(v_at, v_at + make_interval(mins => v_dur))
  ) then
    raise exception 'The advisor is already booked at that time. Please pick another slot.';
  end if;

  insert into consultations (user_id, advisor_id, case_id, document_id, scheduled_at, duration_min, medium, user_notes, fee)
  values (me.id, a.id, v_case, v_doc, v_at, v_dur, coalesce(nullif(p->>'medium', ''), 'video'),
          nullif(p->>'user_notes', ''), round(a.hourly_rate * v_dur / 60.0, 2))
  returning * into c;

  if v_case is not null then
    update cases set advisor_id = a.id where id = v_case and advisor_id is null;
  end if;

  perform _notify(a.profile_id, 'consultation', 'New consultation booked',
    me.full_name || ' booked a ' || v_dur || '-minute ' || replace(c.medium, '_', ' ') || ' session on '
    || to_char(v_at at time zone 'Asia/Qatar', 'DD Mon YYYY HH24:MI') || ' (AST).', '/advisor/schedule');
  perform _notify(me.id, 'consultation', 'Consultation confirmed',
    'Your session is booked for ' || to_char(v_at at time zone 'Asia/Qatar', 'DD Mon YYYY HH24:MI') || ' (AST).',
    '/user/consultations');
  return to_jsonb(c);
end $$;

-- ── Proposal shelf life from settings ──────────────────────────────────

create or replace function public.api_admin_send_proposal(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me   profiles := _require(array['admin']);
  pr   proposals;
  days int;
  lo   int := _setting_num('proposal_valid_min_days', 15)::int;
  hi   int := _setting_num('proposal_valid_max_days', 30)::int;
begin
  select * into pr from proposals where id = p_id for update;
  if pr.id is null then raise exception 'Proposal not found'; end if;
  if pr.status <> 'draft' then raise exception 'This proposal has already been sent'; end if;
  days := pr.valid_until - _qatar_today();
  if days < lo or days > hi then
    raise exception 'Proposal validity must be %–% days (currently % days)', lo, hi, days;
  end if;
  if nullif(trim(pr.scope), '') is null then raise exception 'Add the scope before sending'; end if;

  update proposals set status = 'sent', sent_at = now() where id = p_id returning * into pr;
  if pr.request_id is not null then
    update service_requests set status = 'proposal_sent', quoted_amount = pr.amount, updated_at = now() where id = pr.request_id;
  end if;
  perform _notify(pr.user_id, 'case', 'Your proposal is ready',
    pr.title || ' — please review and respond by ' || to_char(pr.valid_until, 'DD Mon YYYY') || '.', '/user/engagements');
  return _proposal_json(pr);
end $$;

-- ── Scheduled: nurture periods (called hourly with the journey jobs) ───

create function public._run_sales_jobs() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today   date := _qatar_today();
  months  int  := _setting_num('sales_nurture_months', 6)::int;
  to_nurt int;
  ended   int;
  leads   int;
  a       record;
begin
  -- Serious but not ready: an expired proposal moves its request to nurture
  update service_requests r set status = 'nurture', nurture_until = today + make_interval(months => months), updated_at = now()
   where r.status = 'proposal_sent'
     and exists (select 1 from proposals pr where pr.request_id = r.id and pr.status = 'expired')
     and not exists (select 1 from proposals pr where pr.request_id = r.id and pr.status in ('sent','accepted'));
  get diagnostics to_nurt = row_count;

  -- Nurture lasts up to the configured months, then the request is closed
  update service_requests set status = 'declined', updated_at = now(),
         admin_notes = concat_ws(E'\n', admin_notes, 'Nurture period ended ' || to_char(today, 'DD Mon YYYY'))
   where status = 'nurture' and nurture_until < today;
  get diagnostics ended = row_count;

  update contact_messages set status = 'lost', updated_at = now()
   where status = 'nurture' and nurture_until < today;
  get diagnostics leads = row_count;

  if to_nurt + ended + leads > 0 then
    for a in select id from profiles where role = 'admin' and is_active loop
      perform _notify(a.id, 'case', 'Nurture pipeline updated',
        to_nurt || ' moved to nurture, ' || ended || ' requests and ' || leads || ' leads closed after the nurture period.',
        '/admin/services');
    end loop;
  end if;
  return jsonb_build_object('moved_to_nurture', to_nurt, 'nurture_ended', ended, 'leads_closed', leads);
end $$;

-- ── Privileges ─────────────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'api\_%'
  loop
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

grant execute on function public._can_read_document_object(text) to authenticated;
grant execute on function public.api_public_settings()  to anon;
grant execute on function public.api_plans()            to anon;
grant execute on function public.api_contact(jsonb)     to anon;
grant execute on function public.api_service_catalog()  to anon;
grant execute on function public._qatar_today()                to authenticated;
grant execute on function public._add_business_days(date, int) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- Services & pricing (Scope and Workflows for Core Offerings):
--   * Service architecture: 5 categories and their offerings, each with a
--     defined problem, scope, deliverables, boundaries, best fit and price (USD)
--   * Service requests: a client asks for an offering, admin moves it along
--   * Executive Advisory Retainer: monthly hour allotment (4 h), minimum term
--     (3 months), hours log, no rollover of unused hours
--   * Relationships & retention: memberships (Integra Innovators / Gold),
--     events (Integra Nights, demos…), Monthly Market Briefs
--
-- Additive only. Existing tables, plans and functions are untouched.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Catalog ────────────────────────────────────────────────────────────

create table public.service_categories (
  key        text primary key,
  name       text not null,
  purpose    text not null,
  sort_order int not null default 0
);

create table public.service_offerings (
  id              bigint generated always as identity primary key,
  slug            text not null unique,
  category        text not null references public.service_categories (key),
  name            text not null,
  summary         text,
  pricing_model   text not null default 'on_request'
                  check (pricing_model in ('fixed','starting_at','range','monthly','membership','on_request')),
  price_min       numeric(12,2),
  price_max       numeric(12,2),
  price_note      text,
  currency        text not null default 'USD',
  min_term_months int,
  included_hours  numeric(6,2),
  in_scope        jsonb not null default '[]'::jsonb,
  deliverables    jsonb not null default '[]'::jsonb,
  out_of_scope    jsonb not null default '[]'::jsonb,
  best_fit        text,
  timeline        text,
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

insert into public.service_categories (key, name, purpose, sort_order) values
  ('decision',      'Decision',      'Help the client decide whether to enter and which GCC pathway makes sense.', 1),
  ('preparation',   'Preparation',   'Prepare the client before formal filing, bank-facing, or partner-facing processes begin.', 2),
  ('execution',     'Execution',     'Coordinate milestones, reduce friction, and support the move from plan to market activity.', 3),
  ('relationships', 'Relationships', 'Build credibility, referrals, introductions, and ongoing ecosystem access.', 4),
  ('retention',     'Retention',     'Create recurring access, continuity, and upsell opportunities.', 5);

insert into public.service_offerings
  (slug, category, name, summary, pricing_model, price_min, price_max, price_note, min_term_months, included_hours,
   in_scope, deliverables, out_of_scope, best_fit, timeline, sort_order)
values
  ('executive-discovery-sessions', 'decision', 'Executive Discovery Sessions',
   'Three structured calls to get clarity on market entry before committing to a project.',
   'fixed', 1000, null, 'for 3 structured calls', null, null,
   '["Three 60-minute structured sessions","Focus on market-entry questions, document readiness and entry options","Each call has a defined theme"]',
   '["A 2–3 page output or action memo after each call"]',
   '["Legal advice","Document drafting","Formal filing","Financial modeling"]',
   'Prospect needs clarity but is not ready for a project.', '3 sessions × 60 minutes', 1),

  ('market-entry-blueprint', 'decision', 'Market Entry Blueprint',
   'Feasibility study, business plan and financial model for a go/no-go decision.',
   'starting_at', 5000, null, null, null, null,
   '["Feasibility study","Business plan","Financial model","Master templates with AI-supported research","Specialist review where needed","Integra founder judgment"]',
   '["Go/no-go recommendation","Practical 12-month entry view","Feasibility study, business plan and financial model"]',
   '["Market introductions","Incorporation execution","Implementation management unless separately scoped"]',
   'Client needs a go/no-go decision and a practical 12-month entry view.', null, 2),

  ('regulatory-kyc-readiness-review', 'preparation', 'Regulatory & KYC Readiness Review',
   'Document review and readiness memo before incorporation and bank KYC.',
   'range', 2500, 5000, 'or bundled with another offering', null, null,
   '["Review client documents","Flag missing items","Map likely incorporation / KYC friction","Readiness memo with next steps"]',
   '["Readiness memo with next steps"]',
   '["Guaranteed bank approval","Legal opinions","Government representations"]',
   'Client is serious but not yet filing-ready.', null, 1),

  ('document-checklist', 'preparation', 'Document Checklist',
   'A tailored list of the documents needed before formal filing or bank-facing steps.',
   'on_request', null, null, null, null, null, '[]', '[]', '[]', null, null, 2),

  ('partner-legal-referral-planning', 'preparation', 'Partner / Legal Referral Planning',
   'Plan which licensed professionals and partners to involve, and when.',
   'on_request', null, null, null, null, null, '[]', '[]',
   '["Legal advice — provided only by licensed counsel"]', null, null, 3),

  ('qatar-incorporation-bank-readiness', 'execution', 'Qatar Incorporation & Bank Readiness Pathway',
   'Coordinated setup milestones from documents to bank readiness.',
   'starting_at', 15000, null, null, null, null,
   '["Coordinate incorporation-readiness milestones","Visa / Iqama navigation","Document collection","Licensed professional referrals","Bank-readiness tracking"]',
   '["Milestone plan and tracking through setup"]',
   '["Bank approval guarantees","Legal representation","Unapproved use of Integra as legal counsel"]',
   'Client has budget, documents, and timing to start formal setup coordination.', null, 1),

  ('operational-readiness-program', 'execution', 'Operational Readiness Program',
   'Setup pathway plus everything needed to start operating.',
   'starting_at', 30000, null, null, null, null,
   '["Everything in the Qatar Incorporation & Bank Readiness Pathway","Operating model","Implementation plan","Process map","KPI dashboard","One month of post-feasibility support"]',
   '["Operating model","Implementation plan","Process map","KPI dashboard"]',
   '["Long-term management","Payroll operations","Legal drafting","Full accounting"]',
   'Client wants to operate after setup, not just register.', 'Includes 1 month of post-feasibility support', 2),

  ('integra-innovators', 'relationships', 'Integra Innovators',
   'A selective network for founders and partners.',
   'membership', null, null, 'Tiered membership or invite-only', null, null,
   '["Selective network","Resources","Referrals","Events","Product demonstrations","Member spotlights"]',
   '[]',
   '["Guaranteed sales","Investment","Government approvals"]',
   'Founders and partners who benefit from ecosystem access.', null, 1),

  ('integra-nights', 'relationships', 'Integra Nights',
   'Curated networking evenings for founders, partners and the ecosystem.',
   'on_request', null, null, null, null, null, '[]', '[]', '[]', null, null, 2),

  ('integra-gold', 'relationships', 'Integra Gold',
   'Top membership tier with the closest ecosystem access.',
   'membership', null, null, 'Invite-only', null, null, '[]', '[]', '[]', null, null, 3),

  ('executive-advisory-retainer', 'retention', 'Executive Advisory Retainer',
   'Trusted monthly access for ongoing guidance and judgment.',
   'monthly', 2500, null, 'minimum 3 months', 3, 4,
   '["4 hours every month","Regulatory guidance","Contract-review coordination","Strategic check-ins","Government liaison advice","Introductions","WhatsApp / email access during business hours"]',
   '["Monthly hours report"]',
   '["Deliverables","Legal drafting","Out-of-scope implementation","Rollover of unused hours"]',
   'Ongoing clients who need trusted access and periodic judgment.', 'Minimum 3 months', 1),

  ('monthly-market-brief', 'retention', 'Monthly Market Brief',
   'A monthly briefing on GCC market, regulatory and ecosystem developments.',
   'on_request', null, null, null, null, null, '[]', '[]', '[]', null, null, 2),

  ('quarterly-discovery-visits', 'retention', 'Quarterly Discovery Visits',
   'Quarterly check-in visits to review progress and plan the next quarter.',
   'on_request', null, null, null, null, null, '[]', '[]', '[]', null, null, 3);

-- ── Service requests ───────────────────────────────────────────────────

create table public.service_requests (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles on delete cascade,
  offering_id   bigint not null references public.service_offerings,
  status        text not null default 'new'
                check (status in ('new','in_review','proposal_sent','won','declined','cancelled')),
  message       text,
  budget        text,
  quoted_amount numeric(12,2),
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.service_requests (user_id);
create index on public.service_requests (status);

-- ── Retainers ──────────────────────────────────────────────────────────

create table public.retainers (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles on delete cascade,
  offering_id     bigint references public.service_offerings,
  advisor_id      bigint references public.advisors on delete set null,
  request_id      bigint references public.service_requests on delete set null,
  monthly_hours   numeric(6,2) not null default 4 check (monthly_hours > 0),
  monthly_fee     numeric(12,2) not null default 0,
  currency        text not null default 'USD',
  start_date      date not null default current_date,
  min_term_months int not null default 3 check (min_term_months >= 0),
  end_date        date,
  status          text not null default 'active' check (status in ('active','paused','ended')),
  notes           text,
  created_at      timestamptz not null default now()
);
create index on public.retainers (user_id);
create index on public.retainers (advisor_id);

create table public.retainer_logs (
  id          bigint generated always as identity primary key,
  retainer_id bigint not null references public.retainers on delete cascade,
  logged_by   uuid references public.profiles on delete set null,
  work_date   date not null default current_date,
  hours       numeric(5,2) not null check (hours > 0 and hours <= 24),
  category    text not null default 'other',
  description text,
  created_at  timestamptz not null default now()
);
create index on public.retainer_logs (retainer_id, work_date);

-- ── Memberships, events, market briefs ─────────────────────────────────

create table public.memberships (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  tier       text not null check (tier in ('innovators','gold')),
  status     text not null default 'invited' check (status in ('invited','active','expired','cancelled')),
  started_at timestamptz,
  expires_at timestamptz,
  notes      text,
  created_at timestamptz not null default now(),
  unique (user_id, tier)
);

create table public.community_events (
  id           bigint generated always as identity primary key,
  title        text not null,
  description  text,
  event_type   text not null default 'integra_night'
               check (event_type in ('integra_night','webinar','product_demo','workshop','other')),
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  capacity     int check (capacity is null or capacity > 0),
  audience     text not null default 'all' check (audience in ('all','members','gold')),
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.event_rsvps (
  event_id   bigint not null references public.community_events on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  status     text not null default 'going' check (status in ('going','cancelled')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.market_briefs (
  id           bigint generated always as identity primary key,
  title        text not null,
  period       date not null default date_trunc('month', now())::date,
  summary      text,
  body         text,
  audience     text not null default 'all' check (audience in ('all','retainer','members')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by   uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now()
);

-- RPC-only access, like every other table
alter table public.service_categories enable row level security;
alter table public.service_offerings  enable row level security;
alter table public.service_requests   enable row level security;
alter table public.retainers          enable row level security;
alter table public.retainer_logs      enable row level security;
alter table public.memberships        enable row level security;
alter table public.community_events   enable row level security;
alter table public.event_rsvps        enable row level security;
alter table public.market_briefs      enable row level security;
revoke all on public.service_categories, public.service_offerings, public.service_requests, public.retainers,
              public.retainer_logs, public.memberships, public.community_events, public.event_rsvps,
              public.market_briefs from anon, authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────

create function public._user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from profiles where lower(email) = lower(trim(p_email)) limit 1
$$;

create function public._has_membership(uid uuid, p_tier text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships
                 where user_id = uid and status = 'active' and (p_tier is null or tier = p_tier)
                   and (expires_at is null or expires_at > now()))
$$;

create function public._has_active_retainer(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from retainers where user_id = uid and status = 'active')
$$;

create function public._text_array(v jsonb) returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(v) = 'array' then v else null end
$$;

-- ── Catalog API ────────────────────────────────────────────────────────

-- Public: categories with their active offerings
create function public.api_service_catalog() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'key', c.key, 'name', c.name, 'purpose', c.purpose,
           'offerings', coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order, o.id)
                                  from service_offerings o where o.category = c.key and o.is_active), '[]'::jsonb))
         order by c.sort_order), '[]'::jsonb)
  from service_categories c
$$;

create function public.api_admin_offerings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(o) || jsonb_build_object(
             'category_name', c.name,
             'open_requests', (select count(*) from service_requests r
                               where r.offering_id = o.id and r.status in ('new','in_review','proposal_sent')))
           order by c.sort_order, o.sort_order, o.id)
    from service_offerings o join service_categories c on c.key = o.category), '[]'::jsonb);
end $$;

-- Create (p_id null) or update an offering. Offerings are never deleted; deactivate instead.
create function public.api_admin_save_offering(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  o  service_offerings;
begin
  if p_id is null then
    if nullif(trim(p->>'name'), '') is null then raise exception 'Name is required'; end if;
    if not exists (select 1 from service_categories where key = p->>'category') then raise exception 'Choose a valid category'; end if;
    insert into service_offerings (slug, category, name)
    values (coalesce(nullif(p->>'slug', ''),
                     trim(both '-' from regexp_replace(lower(p->>'name'), '[^a-z0-9]+', '-', 'g')) || '-' || floor(extract(epoch from now()))::bigint),
            p->>'category', trim(p->>'name'))
    returning * into o;
    p_id := o.id;
  end if;

  update service_offerings set
    category        = coalesce(nullif(p->>'category', ''), category),
    name            = coalesce(nullif(trim(p->>'name'), ''), name),
    summary         = case when p ? 'summary' then p->>'summary' else summary end,
    pricing_model   = coalesce(nullif(p->>'pricing_model', ''), pricing_model),
    price_min       = case when p ? 'price_min' then nullif(p->>'price_min', '')::numeric else price_min end,
    price_max       = case when p ? 'price_max' then nullif(p->>'price_max', '')::numeric else price_max end,
    price_note      = case when p ? 'price_note' then nullif(p->>'price_note', '') else price_note end,
    currency        = coalesce(nullif(p->>'currency', ''), currency),
    min_term_months = case when p ? 'min_term_months' then nullif(p->>'min_term_months', '')::int else min_term_months end,
    included_hours  = case when p ? 'included_hours' then nullif(p->>'included_hours', '')::numeric else included_hours end,
    in_scope        = coalesce(_text_array(p->'in_scope'), in_scope),
    deliverables    = coalesce(_text_array(p->'deliverables'), deliverables),
    out_of_scope    = coalesce(_text_array(p->'out_of_scope'), out_of_scope),
    best_fit        = case when p ? 'best_fit' then nullif(p->>'best_fit', '') else best_fit end,
    timeline        = case when p ? 'timeline' then nullif(p->>'timeline', '') else timeline end,
    sort_order      = coalesce(nullif(p->>'sort_order', '')::int, sort_order),
    is_active       = case when p ? 'is_active' then (p->>'is_active') in ('1','true') else is_active end,
    updated_at      = now()
  where id = p_id returning * into o;
  if o.id is null then raise exception 'Offering not found'; end if;
  if o.price_min is not null and o.price_max is not null and o.price_max < o.price_min then
    raise exception 'Maximum price must be greater than the minimum price';
  end if;
  return to_jsonb(o);
end $$;

-- ── Service requests API ───────────────────────────────────────────────

create function public._request_json(r public.service_requests) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) || jsonb_build_object(
    'offering_name', o.name, 'offering_slug', o.slug, 'category', o.category,
    'pricing_model', o.pricing_model, 'price_min', o.price_min, 'price_max', o.price_max, 'currency', o.currency,
    'client_name', u.full_name, 'client_email', u.email)
  from service_offerings o, profiles u
  where o.id = r.offering_id and u.id = r.user_id
$$;

create function public.api_request_service(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['user']);
  o  service_offerings;
  r  service_requests;
  a  record;
begin
  select * into o from service_offerings where id = nullif(p->>'offering_id', '')::bigint and is_active;
  if o.id is null then raise exception 'Service not found'; end if;
  if exists (select 1 from service_requests where user_id = me.id and offering_id = o.id
             and status in ('new','in_review','proposal_sent')) then
    raise exception 'You already have an open request for this service';
  end if;

  insert into service_requests (user_id, offering_id, message, budget)
  values (me.id, o.id, left(nullif(trim(p->>'message'), ''), 4000), left(nullif(trim(p->>'budget'), ''), 200))
  returning * into r;

  perform _notify(me.id, 'case', 'Service request received',
    'We received your request for ' || o.name || '. We will reply within 4–6 working hours.', '/user/services');
  for a in select id from profiles where role = 'admin' and is_active loop
    perform _notify(a.id, 'case', 'New service request', me.full_name || ' requested ' || o.name || '.', '/admin/services');
  end loop;
  return _request_json(r);
end $$;

create function public.api_my_service_requests() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((select jsonb_agg(_request_json(r) order by r.created_at desc)
                   from service_requests r where r.user_id = me.id), '[]'::jsonb);
end $$;

create function public.api_cancel_service_request(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  r  service_requests;
begin
  update service_requests set status = 'cancelled', updated_at = now()
   where id = p_id and user_id = me.id and status in ('new','in_review','proposal_sent')
  returning * into r;
  if r.id is null then raise exception 'Request not found or can no longer be cancelled'; end if;
  return _request_json(r);
end $$;

create function public.api_admin_service_requests(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  lim int      := _limit(p);
  pg  int      := _page(p);
  st  text     := nullif(p->>'status', '');
  off bigint   := nullif(p->>'offering_id', '')::bigint;
  q   text     := nullif(trim(p->>'search'), '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select r.* from service_requests r
    join profiles u on u.id = r.user_id
    join service_offerings o on o.id = r.offering_id
    where (st is null or r.status = st) and (off is null or r.offering_id = off)
      and (q is null or u.full_name ilike '%' || q || '%' or u.email ilike '%' || q || '%' or o.name ilike '%' || q || '%')
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(_request_json(x::service_requests) order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object(
    'total', total, 'page', pg, 'limit', lim,
    'open', (select count(*) from service_requests where status in ('new','in_review','proposal_sent'))));
end $$;

create function public.api_admin_update_service_request(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  r   service_requests;
  old text;
  o   service_offerings;
begin
  select status into old from service_requests where id = p_id;
  if old is null then raise exception 'Request not found'; end if;
  update service_requests set
    status        = coalesce(nullif(p->>'status', ''), status),
    admin_notes   = case when p ? 'admin_notes' then p->>'admin_notes' else admin_notes end,
    quoted_amount = case when p ? 'quoted_amount' then nullif(p->>'quoted_amount', '')::numeric else quoted_amount end,
    updated_at    = now()
  where id = p_id returning * into r;

  if r.status <> old then
    select * into o from service_offerings where id = r.offering_id;
    perform _notify(r.user_id, 'case', 'Service request update',
      o.name || ': ' || case r.status
        when 'in_review'     then 'we are reviewing your request.'
        when 'proposal_sent' then 'a proposal has been sent to you.'
        when 'won'           then 'your engagement is confirmed.'
        when 'declined'      then 'we are unable to take this on right now.'
        when 'cancelled'     then 'the request was cancelled.'
        else replace(r.status, '_', ' ') end,
      '/user/services');
  end if;
  return _request_json(r);
end $$;

-- ── Retainer API ───────────────────────────────────────────────────────

create function public._retainer_month_used(rid bigint, month date default current_date) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(hours), 0) from retainer_logs
  where retainer_id = rid and date_trunc('month', work_date) = date_trunc('month', month)
$$;

create function public._retainer_json(r public.retainers) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) || jsonb_build_object(
    'client_name', u.full_name, 'client_email', u.email,
    'advisor_name', ap.full_name,
    'offering_name', coalesce(o.name, 'Executive Advisory Retainer'),
    'month', to_char(current_date, 'Mon YYYY'),
    'month_used', _retainer_month_used(r.id),
    'month_remaining', greatest(r.monthly_hours - _retainer_month_used(r.id), 0),
    'min_term_end', (r.start_date + make_interval(months => r.min_term_months))::date,
    'total_hours', (select coalesce(sum(hours), 0) from retainer_logs where retainer_id = r.id))
  from profiles u
  left join advisors a  on a.id = r.advisor_id
  left join profiles ap on ap.id = a.profile_id
  left join service_offerings o on o.id = r.offering_id
  where u.id = r.user_id
$$;

create function public._retainer_access(r public.retainers) returns text
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  if me.role = 'admin' then return 'admin'; end if;
  if r.advisor_id is not null and r.advisor_id = _my_advisor_id() then return 'advisor'; end if;
  if r.user_id = me.id then return 'client'; end if;
  return null;
end $$;

-- Admin: all; advisor: assigned to them; client: their own
create function public.api_retainers(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  st  text     := nullif(p->>'status', '');
begin
  return coalesce((
    select jsonb_agg(_retainer_json(r) order by r.status, r.created_at desc)
    from retainers r
    where (st is null or r.status = st)
      and case me.role
            when 'admin'   then true
            when 'advisor' then r.advisor_id = adv
            else r.user_id = me.id
          end), '[]'::jsonb);
end $$;

create function public.api_retainer_detail(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r   retainers;
  acc text;
begin
  select * into r from retainers where id = p_id;
  if r.id is null then raise exception 'Retainer not found'; end if;
  acc := _retainer_access(r);
  if acc is null then raise exception 'Retainer not found'; end if;
  return _retainer_json(r) || jsonb_build_object(
    'access', acc,
    'months', (
      select jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon YYYY'), 'used', _retainer_month_used(r.id, m::date),
                                          'allotted', r.monthly_hours) order by m desc)
      from generate_series(date_trunc('month', r.start_date::timestamptz),
                           date_trunc('month', least(coalesce(r.end_date, current_date), current_date)::timestamptz),
                           interval '1 month') m),
    'logs', coalesce((
      select jsonb_agg(to_jsonb(l) || jsonb_build_object('logged_by_name', pl.full_name) order by l.work_date desc, l.id desc)
      from (select * from retainer_logs where retainer_id = r.id order by work_date desc, id desc limit 200) l
      left join profiles pl on pl.id = l.logged_by), '[]'::jsonb));
end $$;

-- Create (p_id null) or update a retainer. Admin only.
create function public.api_admin_save_retainer(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me      profiles := _require(array['admin']);
  o       service_offerings;
  r       retainers;
  v_user  uuid;
  v_req   bigint := nullif(p->>'request_id', '')::bigint;
  min_end date;
begin
  if p_id is null then
    if v_req is not null then
      select user_id into v_user from service_requests where id = v_req;
      if v_user is null then raise exception 'Request not found'; end if;
    else
      v_user := _user_id_by_email(p->>'client_email');
      if v_user is null then raise exception 'No client found with that email'; end if;
    end if;
    if not exists (select 1 from profiles where id = v_user and role = 'user') then
      raise exception 'Retainers can only be created for client accounts';
    end if;
    if exists (select 1 from retainers where user_id = v_user and status in ('active','paused')) then
      raise exception 'This client already has a retainer';
    end if;
    select * into o from service_offerings where slug = 'executive-advisory-retainer';

    insert into retainers (user_id, offering_id, request_id, monthly_hours, monthly_fee, currency, start_date, min_term_months)
    values (v_user, o.id, v_req,
            coalesce(nullif(p->>'monthly_hours', '')::numeric, o.included_hours, 4),
            coalesce(nullif(p->>'monthly_fee', '')::numeric, o.price_min, 0),
            coalesce(nullif(p->>'currency', ''), o.currency, 'USD'),
            coalesce(nullif(p->>'start_date', '')::date, current_date),
            coalesce(nullif(p->>'min_term_months', '')::int, o.min_term_months, 3))
    returning * into r;
    p_id := r.id;
    if v_req is not null then
      update service_requests set status = 'won', updated_at = now() where id = v_req;
    end if;
    perform _notify(v_user, 'case', 'Your advisory retainer is active',
      'You have ' || r.monthly_hours || ' hours of advisory time each month.', '/user/services');
  end if;

  update retainers set
    advisor_id      = case when p ? 'advisor_id' then nullif(p->>'advisor_id', '')::bigint else advisor_id end,
    monthly_hours   = coalesce(nullif(p->>'monthly_hours', '')::numeric, monthly_hours),
    monthly_fee     = coalesce(nullif(p->>'monthly_fee', '')::numeric, monthly_fee),
    currency        = coalesce(nullif(p->>'currency', ''), currency),
    start_date      = coalesce(nullif(p->>'start_date', '')::date, start_date),
    min_term_months = coalesce(nullif(p->>'min_term_months', '')::int, min_term_months),
    end_date        = case when p ? 'end_date' then nullif(p->>'end_date', '')::date else end_date end,
    status          = coalesce(nullif(p->>'status', ''), status),
    notes           = case when p ? 'notes' then p->>'notes' else notes end
  where id = p_id returning * into r;
  if r.id is null then raise exception 'Retainer not found'; end if;

  -- Minimum term: the retainer cannot end before start + min_term_months
  min_end := (r.start_date + make_interval(months => r.min_term_months))::date;
  if r.status = 'ended' and r.end_date is null then
    update retainers set end_date = greatest(current_date, min_end) where id = r.id returning * into r;
  end if;
  if r.end_date is not null and r.end_date < min_end then
    raise exception 'Minimum term is % months — the earliest end date is %', r.min_term_months, to_char(min_end, 'DD Mon YYYY');
  end if;
  if r.advisor_id is not null and not exists (select 1 from advisors where id = r.advisor_id and status = 'active') then
    raise exception 'Choose an active advisor';
  end if;
  return _retainer_json(r);
end $$;

-- Log time against the current allotment. Unused hours never roll over, so
-- each calendar month is checked against its own allotment.
create function public.api_log_retainer_hours(p_retainer_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin','advisor']);
  r      retainers;
  acc    text;
  v_date date := coalesce(nullif(p->>'work_date', '')::date, current_date);
  v_hrs  numeric := nullif(p->>'hours', '')::numeric;
  used   numeric;
  l      retainer_logs;
begin
  select * into r from retainers where id = p_retainer_id for update;
  if r.id is null then raise exception 'Retainer not found'; end if;
  acc := _retainer_access(r);
  if acc is null or acc not in ('admin','advisor') then raise exception 'Retainer not found'; end if;
  if r.status <> 'active' then raise exception 'This retainer is not active'; end if;
  if v_hrs is null or v_hrs <= 0 then raise exception 'Enter the hours worked'; end if;
  if v_date > current_date then raise exception 'You cannot log time in the future'; end if;
  if v_date < r.start_date or (r.end_date is not null and v_date > r.end_date) then
    raise exception 'The date is outside the retainer term';
  end if;

  used := _retainer_month_used(r.id, v_date);
  if used + v_hrs > r.monthly_hours then
    raise exception 'Only % of % hours left for %. Extra work needs a separate scope (unused hours do not roll over).',
      greatest(r.monthly_hours - used, 0), r.monthly_hours, to_char(v_date, 'Mon YYYY');
  end if;

  insert into retainer_logs (retainer_id, logged_by, work_date, hours, category, description)
  values (r.id, me.id, v_date, v_hrs, coalesce(nullif(p->>'category', ''), 'other'), left(p->>'description', 2000))
  returning * into l;

  perform _notify(r.user_id, 'case', 'Advisory time logged',
    v_hrs || ' h' || coalesce(' — ' || nullif(l.description, ''), '') || '. ' ||
    (r.monthly_hours - used - v_hrs) || ' h left this month.', '/user/services');
  return _retainer_json(r);
end $$;

create function public.api_delete_retainer_log(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  l  retainer_logs;
begin
  select * into l from retainer_logs where id = p_id;
  if l.id is null then raise exception 'Entry not found'; end if;
  if not (me.role = 'admin'
          or (l.logged_by = me.id and date_trunc('month', l.work_date) = date_trunc('month', current_date))) then
    raise exception 'You can only remove your own entries from the current month';
  end if;
  delete from retainer_logs where id = p_id;
end $$;

-- ── Memberships API ────────────────────────────────────────────────────

create function public._membership_json(m public.memberships) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(m) || jsonb_build_object(
    'tier_name', case m.tier when 'gold' then 'Integra Gold' else 'Integra Innovators' end,
    'client_name', u.full_name, 'client_email', u.email,
    'is_current', m.status = 'active' and (m.expires_at is null or m.expires_at > now()))
  from profiles u where u.id = m.user_id
$$;

create function public.api_my_memberships() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((select jsonb_agg(_membership_json(m) order by m.tier) from memberships m where m.user_id = me.id), '[]'::jsonb);
end $$;

-- Invite-only: the member accepts or declines an invitation
create function public.api_respond_membership(p_id bigint, p_accept boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  m  memberships;
begin
  update memberships set
    status     = case when p_accept then 'active' else 'cancelled' end,
    started_at = case when p_accept then now() else started_at end
  where id = p_id and user_id = me.id and status = 'invited'
  returning * into m;
  if m.id is null then raise exception 'Invitation not found'; end if;
  return _membership_json(m);
end $$;

create function public.api_admin_memberships(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  t  text := nullif(p->>'tier', '');
  st text := nullif(p->>'status', '');
begin
  return coalesce((select jsonb_agg(_membership_json(m) order by m.created_at desc)
                   from memberships m where (t is null or m.tier = t) and (st is null or m.status = st)), '[]'::jsonb);
end $$;

-- Create (invite by email) or update a membership
create function public.api_admin_save_membership(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  m      memberships;
  v_user uuid;
  v_tier text := coalesce(nullif(p->>'tier', ''), 'innovators');
begin
  if p_id is null then
    v_user := _user_id_by_email(p->>'client_email');
    if v_user is null then raise exception 'No account found with that email'; end if;
    insert into memberships (user_id, tier, status, started_at, expires_at, notes)
    values (v_user, v_tier, coalesce(nullif(p->>'status', ''), 'invited'),
            case when p->>'status' = 'active' then now() end,
            nullif(p->>'expires_at', '')::timestamptz, p->>'notes')
    on conflict (user_id, tier) do update set
      status = excluded.status, expires_at = excluded.expires_at, notes = coalesce(excluded.notes, memberships.notes),
      started_at = coalesce(excluded.started_at, memberships.started_at)
    returning * into m;
    perform _notify(v_user, 'account',
      case when m.status = 'active' then 'Welcome to ' else 'You are invited to ' end
        || case v_tier when 'gold' then 'Integra Gold' else 'Integra Innovators' end,
      case when m.status = 'active' then 'Your membership is active.' else 'Open Community to accept your invitation.' end,
      '/user/community');
    return _membership_json(m);
  end if;

  update memberships set
    status     = coalesce(nullif(p->>'status', ''), status),
    started_at = case when p->>'status' = 'active' then coalesce(started_at, now()) else started_at end,
    expires_at = case when p ? 'expires_at' then nullif(p->>'expires_at', '')::timestamptz else expires_at end,
    notes      = case when p ? 'notes' then p->>'notes' else notes end
  where id = p_id returning * into m;
  if m.id is null then raise exception 'Membership not found'; end if;
  return _membership_json(m);
end $$;

-- ── Events API ─────────────────────────────────────────────────────────

create function public._event_visible(e public.community_events, uid uuid, role text) returns boolean
language sql stable security definer set search_path = public as $$
  select role = 'admin' or (e.is_published and case e.audience
           when 'all'     then true
           when 'members' then _has_membership(uid)
           when 'gold'    then _has_membership(uid, 'gold')
         end)
$$;

create function public._event_json(e public.community_events, uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(e) || jsonb_build_object(
    'going_count', (select count(*) from event_rsvps where event_id = e.id and status = 'going'),
    'spots_left', case when e.capacity is null then null
                       else greatest(e.capacity - (select count(*) from event_rsvps where event_id = e.id and status = 'going'), 0) end,
    'my_rsvp', (select status from event_rsvps where event_id = e.id and user_id = uid))
$$;

create function public.api_events() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((select jsonb_agg(_event_json(e, me.id) order by e.starts_at)
                   from community_events e
                   where coalesce(e.ends_at, e.starts_at) > now() - interval '1 day'
                     and _event_visible(e, me.id, me.role)), '[]'::jsonb);
end $$;

create function public.api_rsvp_event(p_event_id bigint, p_going boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  e  community_events;
begin
  select * into e from community_events where id = p_event_id for update;
  if e.id is null or not _event_visible(e, me.id, me.role) then raise exception 'Event not found'; end if;
  if e.starts_at < now() then raise exception 'This event has already started'; end if;
  if p_going and e.capacity is not null
     and (select count(*) from event_rsvps where event_id = e.id and status = 'going' and user_id <> me.id) >= e.capacity then
    raise exception 'This event is full';
  end if;
  insert into event_rsvps (event_id, user_id, status) values (e.id, me.id, case when p_going then 'going' else 'cancelled' end)
  on conflict (event_id, user_id) do update set status = excluded.status;
  return _event_json(e, me.id);
end $$;

create function public.api_admin_events() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return coalesce((select jsonb_agg(_event_json(e, me.id) order by e.starts_at desc) from community_events e), '[]'::jsonb);
end $$;

create function public.api_admin_save_event(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  e  community_events;
begin
  if p_id is null then
    if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
    if nullif(p->>'starts_at', '') is null then raise exception 'Start date and time are required'; end if;
    insert into community_events (title, starts_at) values (trim(p->>'title'), (p->>'starts_at')::timestamptz)
    returning * into e;
    p_id := e.id;
  end if;
  update community_events set
    title        = coalesce(nullif(trim(p->>'title'), ''), title),
    description  = case when p ? 'description' then p->>'description' else description end,
    event_type   = coalesce(nullif(p->>'event_type', ''), event_type),
    starts_at    = coalesce(nullif(p->>'starts_at', '')::timestamptz, starts_at),
    ends_at      = case when p ? 'ends_at' then nullif(p->>'ends_at', '')::timestamptz else ends_at end,
    location     = case when p ? 'location' then nullif(p->>'location', '') else location end,
    capacity     = case when p ? 'capacity' then nullif(p->>'capacity', '')::int else capacity end,
    audience     = coalesce(nullif(p->>'audience', ''), audience),
    is_published = case when p ? 'is_published' then (p->>'is_published') in ('1','true') else is_published end
  where id = p_id returning * into e;
  if e.id is null then raise exception 'Event not found'; end if;
  if e.ends_at is not null and e.ends_at < e.starts_at then raise exception 'End time must be after the start time'; end if;
  return _event_json(e, me.id);
end $$;

create function public.api_admin_delete_event(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  delete from community_events where id = p_id;
end $$;

-- ── Market briefs API ──────────────────────────────────────────────────

create function public._brief_visible(b public.market_briefs, uid uuid, role text) returns boolean
language sql stable security definer set search_path = public as $$
  select role = 'admin' or (b.is_published and case b.audience
           when 'all'      then true
           when 'retainer' then _has_active_retainer(uid) or role = 'advisor'
           when 'members'  then _has_membership(uid) or role = 'advisor'
         end)
$$;

create function public.api_market_briefs() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((select jsonb_agg(to_jsonb(b) order by b.period desc, b.id desc)
                   from market_briefs b where _brief_visible(b, me.id, me.role)), '[]'::jsonb);
end $$;

create function public.api_admin_save_brief(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me        profiles := _require(array['admin']);
  b         market_briefs;
  was_live  boolean := false;
  u         record;
begin
  if p_id is null then
    if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
    insert into market_briefs (title, created_by) values (trim(p->>'title'), me.id) returning * into b;
    p_id := b.id;
  else
    select published_at is not null into was_live from market_briefs where id = p_id;
  end if;

  update market_briefs set
    title        = coalesce(nullif(trim(p->>'title'), ''), title),
    period       = coalesce(date_trunc('month', nullif(p->>'period', '')::date)::date, period),
    summary      = case when p ? 'summary' then p->>'summary' else summary end,
    body         = case when p ? 'body' then p->>'body' else body end,
    audience     = coalesce(nullif(p->>'audience', ''), audience),
    is_published = case when p ? 'is_published' then (p->>'is_published') in ('1','true') else is_published end
  where id = p_id returning * into b;
  if b.id is null then raise exception 'Brief not found'; end if;

  -- First publish: stamp it and let the audience know
  if b.is_published and not coalesce(was_live, false) then
    update market_briefs set published_at = now() where id = b.id returning * into b;
    for u in select id, role from profiles where is_active and role in ('user','advisor') loop
      if _brief_visible(b, u.id, u.role) then
        perform _notify(u.id, 'general', 'New market brief', b.title,
                        case u.role when 'advisor' then '/advisor/retainers' else '/user/community' end);
      end if;
    end loop;
  end if;
  return to_jsonb(b);
end $$;

create function public.api_admin_delete_brief(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  delete from market_briefs where id = p_id;
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

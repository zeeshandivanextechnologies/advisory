-- ═══════════════════════════════════════════════════════════════════════
-- Law firm / partner MOU workflow (core-offerings document):
--   1. Priority partners: law firms / licensed professionals with Qatar/GCC
--      business-setup experience (target: six)
--   2. Partner profile: specialties, jurisdictions, response time, languages,
--      pricing, referral policy, conflicts
--   3. Written MOU before any client is sent: referral fees, confidentiality,
--      client ownership, service boundaries, response expectations
--   4. Referral handoff form: every introduction has client consent and a
--      documented purpose
--   5. Quarterly partner review; remove partners that create reputational risk
--
-- Additive. Full admins only (limited team logins are denied by _require);
-- clients see and consent to their own referrals.
-- ═══════════════════════════════════════════════════════════════════════

create table public.partners (
  id                     bigint generated always as identity primary key,
  name                   text not null,
  partner_type           text not null default 'law_firm' check (partner_type in ('law_firm','licensed_professional')),
  is_priority            boolean not null default false,
  contact_name           text,
  email                  text,
  phone                  text,
  website                text,
  specialties            jsonb not null default '[]'::jsonb,
  jurisdictions          jsonb not null default '[]'::jsonb,
  languages              jsonb not null default '[]'::jsonb,
  response_time_hours    int check (response_time_hours is null or response_time_hours > 0),
  pricing                text,
  referral_policy        text,
  conflicts              text,
  status                 text not null default 'prospect'
                         check (status in ('prospect','mou_negotiation','active','paused','removed')),
  removed_reason         text,
  notes                  text,
  review_reminded_quarter text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.partner_mous (
  id                         bigint generated always as identity primary key,
  partner_id                 bigint not null references public.partners on delete cascade,
  referral_fee               text,
  confidentiality            text,
  client_ownership           text,
  service_boundaries         text,
  response_expectation_hours int check (response_expectation_hours is null or response_expectation_hours > 0),
  document_url               text,
  status                     text not null default 'draft' check (status in ('draft','signed','expired','terminated')),
  signed_on                  date,
  expires_on                 date,
  created_by                 uuid references public.profiles on delete set null,
  created_at                 timestamptz not null default now()
);
create index on public.partner_mous (partner_id);

create table public.partner_referrals (
  id                   bigint generated always as identity primary key,
  partner_id           bigint not null references public.partners,
  user_id              uuid not null references public.profiles on delete cascade,
  request_id           bigint references public.service_requests on delete set null,
  purpose              text not null,
  scope_note           text,
  status               text not null default 'awaiting_consent'
                       check (status in ('awaiting_consent','consented','client_declined','introduced','partner_responded','completed','closed')),
  consent_method       text check (consent_method in ('in_app','email','written','verbal_recorded')),
  consent_note         text,
  consented_at         timestamptz,
  consent_recorded_by  uuid references public.profiles on delete set null,
  introduced_at        timestamptz,
  partner_responded_at timestamptz,
  completed_at         timestamptz,
  outcome              text,
  client_rating        int check (client_rating between 1 and 5),
  fee_due              numeric(12,2),
  fee_status           text not null default 'none' check (fee_status in ('none','due','received')),
  created_by           uuid references public.profiles on delete set null,
  created_at           timestamptz not null default now()
);
create index on public.partner_referrals (partner_id);
create index on public.partner_referrals (user_id);

create table public.partner_reviews (
  id                bigint generated always as identity primary key,
  partner_id        bigint not null references public.partners on delete cascade,
  quarter           text not null,
  responsiveness    int check (responsiveness between 1 and 5),
  quality           int check (quality between 1 and 5),
  client_feedback   int check (client_feedback between 1 and 5),
  reputational_risk text not null default 'none' check (reputational_risk in ('none','low','medium','high')),
  decision          text not null default 'keep' check (decision in ('keep','watch','remove')),
  notes             text,
  metrics           jsonb,
  reviewed_by       uuid references public.profiles on delete set null,
  created_at        timestamptz not null default now(),
  unique (partner_id, quarter)
);

alter table public.partners          enable row level security;
alter table public.partner_mous      enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_reviews   enable row level security;
revoke all on public.partners, public.partner_mous, public.partner_referrals, public.partner_reviews from anon, authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────

create function public._quarter_of(d date) returns text
language sql immutable as $$ select to_char(d, 'YYYY') || '-Q' || extract(quarter from d)::int $$;

create function public._quarter_bounds(q text) returns daterange
language sql immutable as $$
  select daterange(make_date(split_part(q, '-Q', 1)::int, (split_part(q, '-Q', 2)::int - 1) * 3 + 1, 1),
                   (make_date(split_part(q, '-Q', 1)::int, (split_part(q, '-Q', 2)::int - 1) * 3 + 1, 1) + interval '3 months')::date)
$$;

create function public._active_mou(pid bigint) returns public.partner_mous
language sql stable security definer set search_path = public as $$
  select * from partner_mous
  where partner_id = pid and status = 'signed' and (expires_on is null or expires_on >= _qatar_today())
  order by signed_on desc nulls last, id desc limit 1
$$;

-- Referral performance for a partner, optionally within a quarter
create function public._partner_metrics(pid bigint, q text default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'referrals', count(*),
    'introduced', count(*) filter (where r.introduced_at is not null),
    'completed', count(*) filter (where r.status = 'completed'),
    'avg_response_hours', round(avg(extract(epoch from (r.partner_responded_at - r.introduced_at)) / 3600)
                                filter (where r.partner_responded_at is not null and r.introduced_at is not null)::numeric, 1),
    'late_responses', count(*) filter (where r.partner_responded_at is not null and r.introduced_at is not null
                                        and coalesce(m.response_expectation_hours, p.response_time_hours) is not null
                                        and r.partner_responded_at - r.introduced_at
                                            > make_interval(hours => coalesce(m.response_expectation_hours, p.response_time_hours))),
    'avg_client_rating', round(avg(r.client_rating)::numeric, 1),
    'fees_received', coalesce(sum(r.fee_due) filter (where r.fee_status = 'received'), 0))
  from partners p
  left join partner_referrals r on r.partner_id = p.id
       and (q is null or (r.created_at at time zone 'Asia/Qatar')::date <@ _quarter_bounds(q))
  left join lateral (select * from _active_mou(p.id)) m on true
  where p.id = pid
  group by p.id
$$;

create function public._partner_json(p public.partners) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) || jsonb_build_object(
    'mou', (select to_jsonb(m) from _active_mou(p.id) m where m.id is not null),
    'mou_expiring', exists (select 1 from _active_mou(p.id) m where m.expires_on is not null and m.expires_on < _qatar_today() + 30),
    'can_receive_referrals', p.status = 'active' and exists (select 1 from _active_mou(p.id) m where m.id is not null),
    'metrics', _partner_metrics(p.id),
    'last_review', (select to_jsonb(v) from partner_reviews v where v.partner_id = p.id order by v.quarter desc limit 1))
$$;

create function public._referral_json(r public.partner_referrals) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(r) || jsonb_build_object(
    'partner_name', p.name, 'partner_type', p.partner_type,
    'client_name', u.full_name, 'client_email', u.email,
    'offering_name', (select o.name from service_requests sr join service_offerings o on o.id = sr.offering_id where sr.id = r.request_id),
    'response_hours', case when r.partner_responded_at is not null and r.introduced_at is not null
                           then round((extract(epoch from (r.partner_responded_at - r.introduced_at)) / 3600)::numeric, 1) end)
  from partners p, profiles u where p.id = r.partner_id and u.id = r.user_id
$$;

-- ── Partners & MOUs ────────────────────────────────────────────────────

create function public.api_admin_partners(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  st text := nullif(p->>'status', '');
begin
  return jsonb_build_object(
    'data', coalesce((select jsonb_agg(_partner_json(x) order by x.is_priority desc, x.status, x.name)
                      from partners x where (st is null or x.status = st)), '[]'::jsonb),
    'meta', jsonb_build_object(
      'priority_target', 6,
      'priority_active', (select count(*) from partners x where x.is_priority and x.status = 'active'
                          and exists (select 1 from _active_mou(x.id) m where m.id is not null)),
      'priority_total', (select count(*) from partners x where x.is_priority and x.status <> 'removed')));
end $$;

create function public.api_admin_partner_detail(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  x  partners;
begin
  select * into x from partners where id = p_id;
  if x.id is null then raise exception 'Partner not found'; end if;
  return _partner_json(x) || jsonb_build_object(
    'mous', coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from partner_mous m where m.partner_id = x.id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(to_jsonb(v) || jsonb_build_object('reviewed_by_name', pr.full_name) order by v.quarter desc)
                         from partner_reviews v left join profiles pr on pr.id = v.reviewed_by where v.partner_id = x.id), '[]'::jsonb),
    'referrals', coalesce((select jsonb_agg(_referral_json(r) order by r.created_at desc)
                           from partner_referrals r where r.partner_id = x.id), '[]'::jsonb));
end $$;

create function public.api_admin_save_partner(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  x  partners;
  prev text;
begin
  select status into prev from partners where id = p_id;
  if p_id is null then
    if nullif(trim(p->>'name'), '') is null then raise exception 'Name is required'; end if;
    insert into partners (name) values (trim(p->>'name')) returning * into x;
    p_id := x.id;
  end if;
  update partners set
    name                = coalesce(nullif(trim(p->>'name'), ''), name),
    partner_type        = coalesce(nullif(p->>'partner_type', ''), partner_type),
    is_priority         = case when p ? 'is_priority' then (p->>'is_priority') in ('1','true') else is_priority end,
    contact_name        = case when p ? 'contact_name' then nullif(trim(p->>'contact_name'), '') else contact_name end,
    email               = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    phone               = case when p ? 'phone' then nullif(trim(p->>'phone'), '') else phone end,
    website             = case when p ? 'website' then nullif(trim(p->>'website'), '') else website end,
    specialties         = coalesce(_text_array(p->'specialties'), specialties),
    jurisdictions       = coalesce(_text_array(p->'jurisdictions'), jurisdictions),
    languages           = coalesce(_text_array(p->'languages'), languages),
    response_time_hours = case when p ? 'response_time_hours' then nullif(p->>'response_time_hours', '')::int else response_time_hours end,
    pricing             = case when p ? 'pricing' then p->>'pricing' else pricing end,
    referral_policy     = case when p ? 'referral_policy' then p->>'referral_policy' else referral_policy end,
    conflicts           = case when p ? 'conflicts' then p->>'conflicts' else conflicts end,
    notes               = case when p ? 'notes' then p->>'notes' else notes end,
    status              = coalesce(nullif(p->>'status', ''), status),
    removed_reason      = case when coalesce(nullif(p->>'status', ''), status) = 'removed'
                               then coalesce(nullif(p->>'removed_reason', ''), removed_reason) else null end,
    updated_at          = now()
  where id = p_id returning * into x;
  if x.id is null then raise exception 'Partner not found'; end if;
  if x.status = 'active' and x.status is distinct from prev
     and not exists (select 1 from _active_mou(x.id) m where m.id is not null) then
    raise exception 'Sign an MOU before making this partner active';
  end if;
  if x.status = 'removed' and nullif(trim(x.removed_reason), '') is null then
    raise exception 'Give a reason for removing this partner';
  end if;
  return _partner_json(x);
end $$;

-- Create (p_id null) or update an MOU. Signing one activates a prospective partner.
create function public.api_admin_save_mou(p_partner_id bigint, p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  m  partner_mous;
  x  partners;
begin
  select * into x from partners where id = p_partner_id;
  if x.id is null then raise exception 'Partner not found'; end if;
  if p_id is null then
    insert into partner_mous (partner_id, created_by) values (x.id, me.id) returning * into m;
    p_id := m.id;
  end if;
  update partner_mous set
    referral_fee               = case when p ? 'referral_fee' then p->>'referral_fee' else referral_fee end,
    confidentiality            = case when p ? 'confidentiality' then p->>'confidentiality' else confidentiality end,
    client_ownership           = case when p ? 'client_ownership' then p->>'client_ownership' else client_ownership end,
    service_boundaries         = case when p ? 'service_boundaries' then p->>'service_boundaries' else service_boundaries end,
    response_expectation_hours = case when p ? 'response_expectation_hours' then nullif(p->>'response_expectation_hours', '')::int else response_expectation_hours end,
    document_url               = case when p ? 'document_url' then nullif(trim(p->>'document_url'), '') else document_url end,
    status                     = coalesce(nullif(p->>'status', ''), status),
    signed_on                  = case when p ? 'signed_on' then nullif(p->>'signed_on', '')::date else signed_on end,
    expires_on                 = case when p ? 'expires_on' then nullif(p->>'expires_on', '')::date else expires_on end
  where id = p_id and partner_id = x.id returning * into m;
  if m.id is null then raise exception 'MOU not found'; end if;

  -- A signed MOU must cover every term the document requires
  if m.status = 'signed' then
    if nullif(trim(m.referral_fee), '') is null or nullif(trim(m.confidentiality), '') is null
       or nullif(trim(m.client_ownership), '') is null or nullif(trim(m.service_boundaries), '') is null
       or m.response_expectation_hours is null then
      raise exception 'A signed MOU needs referral fees, confidentiality, client ownership, service boundaries and response expectations';
    end if;
    if m.signed_on is null then
      update partner_mous set signed_on = _qatar_today() where id = m.id returning * into m;
    end if;
    if m.expires_on is not null and m.expires_on < m.signed_on then raise exception 'The expiry date must be after the signing date'; end if;
    if x.status in ('prospect','mou_negotiation') then
      update partners set status = 'active', updated_at = now() where id = x.id;
    end if;
  elsif m.status = 'draft' and x.status = 'prospect' then
    update partners set status = 'mou_negotiation', updated_at = now() where id = x.id;
  end if;
  return to_jsonb(m);
end $$;

-- ── Referral handoff (consent + purpose) ───────────────────────────────

create function public.api_admin_referrals(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  st text := nullif(p->>'status', '');
  pt bigint := nullif(p->>'partner_id', '')::bigint;
begin
  return coalesce((select jsonb_agg(_referral_json(r) order by r.created_at desc)
                   from partner_referrals r where (st is null or r.status = st) and (pt is null or r.partner_id = pt)), '[]'::jsonb);
end $$;

create function public.api_admin_create_referral(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  x      partners;
  v_user uuid;
  v_req  bigint := nullif(p->>'request_id', '')::bigint;
  method text := coalesce(nullif(p->>'consent_method', ''), 'in_app');
  r      partner_referrals;
begin
  select * into x from partners where id = nullif(p->>'partner_id', '')::bigint;
  if x.id is null then raise exception 'Choose a partner'; end if;
  -- Written MOU before sending clients
  if x.status <> 'active' or not exists (select 1 from _active_mou(x.id) m where m.id is not null) then
    raise exception 'This partner has no active, signed MOU — clients cannot be referred yet';
  end if;
  if nullif(trim(p->>'purpose'), '') is null then raise exception 'Document the purpose of the introduction'; end if;

  if v_req is not null then
    select user_id into v_user from service_requests where id = v_req;
    if v_user is null then raise exception 'Request not found'; end if;
  else
    v_user := _user_id_by_email(p->>'client_email');
    if v_user is null then raise exception 'No client found with that email'; end if;
  end if;

  if method = 'in_app' then
    insert into partner_referrals (partner_id, user_id, request_id, purpose, scope_note, status, created_by)
    values (x.id, v_user, v_req, trim(p->>'purpose'), nullif(p->>'scope_note', ''), 'awaiting_consent', me.id)
    returning * into r;
    perform _notify(v_user, 'case', 'Your consent is needed for an introduction',
      'We would like to introduce you to ' || x.name || '. Please review and give or decline consent.', '/user/services');
  else
    -- Consent obtained outside the app must be confirmed and described
    if not coalesce((p->>'consent_confirmed')::boolean, false) or nullif(trim(p->>'consent_note'), '') is null then
      raise exception 'Confirm the client consented and note how (e.g. email of 12 Oct)';
    end if;
    insert into partner_referrals (partner_id, user_id, request_id, purpose, scope_note, status, consent_method,
                                   consent_note, consented_at, consent_recorded_by, created_by)
    values (x.id, v_user, v_req, trim(p->>'purpose'), nullif(p->>'scope_note', ''), 'consented', method,
            trim(p->>'consent_note'), now(), me.id, me.id)
    returning * into r;
  end if;

  if v_req is not null then
    update service_requests set status = 'referred', referral_note = x.name, updated_at = now()
     where id = v_req and status in ('new','in_review','proposal_sent','nurture');
  end if;
  return _referral_json(r);
end $$;

create function public.api_admin_update_referral(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  r  partner_referrals;
  s  text := nullif(p->>'status', '');
begin
  select * into r from partner_referrals where id = p_id for update;
  if r.id is null then raise exception 'Referral not found'; end if;

  if s is not null and s <> r.status then
    if s = 'introduced' and r.status <> 'consented' then
      raise exception 'The client must consent before the introduction is made';
    elsif s = 'partner_responded' and r.status <> 'introduced' then
      raise exception 'Mark the introduction as made first';
    elsif s = 'completed' and r.status not in ('introduced','partner_responded') then
      raise exception 'Only introduced referrals can be completed';
    elsif s not in ('introduced','partner_responded','completed','closed') then
      raise exception 'Invalid status';
    end if;
    update partner_referrals set
      status               = s,
      introduced_at        = case when s = 'introduced' then now() else introduced_at end,
      partner_responded_at = case when s = 'partner_responded' then now() else partner_responded_at end,
      completed_at         = case when s = 'completed' then now() else completed_at end
    where id = r.id returning * into r;
    if s = 'introduced' then
      perform _notify(r.user_id, 'case', 'Introduction made',
        'We have introduced you to ' || (select name from partners where id = r.partner_id) || '.', '/user/services');
    end if;
  end if;

  update partner_referrals set
    outcome       = case when p ? 'outcome' then p->>'outcome' else outcome end,
    client_rating = case when p ? 'client_rating' then nullif(p->>'client_rating', '')::int else client_rating end,
    fee_due       = case when p ? 'fee_due' then nullif(p->>'fee_due', '')::numeric else fee_due end,
    fee_status    = coalesce(nullif(p->>'fee_status', ''), fee_status)
  where id = r.id returning * into r;
  return _referral_json(r);
end $$;

-- Client side: their introductions, and consent in the app
create function public.api_my_referrals() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id, 'partner_name', p.name, 'partner_type', p.partner_type,
             'specialties', p.specialties, 'jurisdictions', p.jurisdictions, 'languages', p.languages,
             'purpose', r.purpose, 'scope_note', r.scope_note, 'status', r.status,
             'consented_at', r.consented_at, 'introduced_at', r.introduced_at, 'created_at', r.created_at)
           order by r.created_at desc)
    from partner_referrals r join partners p on p.id = r.partner_id where r.user_id = me.id), '[]'::jsonb);
end $$;

create function public.api_respond_referral(p_id bigint, p_consent boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  r  partner_referrals;
  a  record;
begin
  update partner_referrals set
    status         = case when p_consent then 'consented' else 'client_declined' end,
    consent_method = case when p_consent then 'in_app' else consent_method end,
    consented_at   = case when p_consent then now() else consented_at end
  where id = p_id and user_id = me.id and status = 'awaiting_consent'
  returning * into r;
  if r.id is null then raise exception 'Nothing to respond to'; end if;
  for a in select id from profiles where role = 'admin' and admin_scope = 'full' and is_active loop
    perform _notify(a.id, 'case', case when p_consent then 'Client consented to introduction' else 'Client declined introduction' end,
      me.full_name || ' — ' || (select name from partners where id = r.partner_id) || '.', '/admin/partners');
  end loop;
  return (select jsonb_build_object('id', r.id, 'status', r.status));
end $$;

-- ── Quarterly partner review ───────────────────────────────────────────

create function public.api_admin_partner_reviews(p_quarter text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  q  text := coalesce(nullif(p_quarter, ''), _quarter_of(_qatar_today()));
begin
  if q !~ '^\d{4}-Q[1-4]$' then raise exception 'Quarter must look like 2026-Q3'; end if;
  return jsonb_build_object(
    'quarter', q,
    'data', coalesce((
      select jsonb_agg(jsonb_build_object(
               'partner_id', x.id, 'partner_name', x.name, 'status', x.status, 'is_priority', x.is_priority,
               'metrics', _partner_metrics(x.id, q),
               'review', (select to_jsonb(v) || jsonb_build_object('reviewed_by_name', pr.full_name)
                          from partner_reviews v left join profiles pr on pr.id = v.reviewed_by
                          where v.partner_id = x.id and v.quarter = q))
             order by x.is_priority desc, x.name)
      from partners x where x.status in ('active','paused')
         or exists (select 1 from partner_reviews v where v.partner_id = x.id and v.quarter = q)), '[]'::jsonb));
end $$;

create function public.api_admin_save_partner_review(p_partner_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  q  text := coalesce(nullif(p->>'quarter', ''), _quarter_of(_qatar_today()));
  v  partner_reviews;
begin
  if q !~ '^\d{4}-Q[1-4]$' then raise exception 'Quarter must look like 2026-Q3'; end if;
  if not exists (select 1 from partners where id = p_partner_id) then raise exception 'Partner not found'; end if;
  if p->>'decision' = 'remove' and nullif(trim(p->>'notes'), '') is null then
    raise exception 'Note the reason for removing this partner';
  end if;
  insert into partner_reviews (partner_id, quarter, responsiveness, quality, client_feedback, reputational_risk, decision, notes, metrics, reviewed_by)
  values (p_partner_id, q, nullif(p->>'responsiveness', '')::int, nullif(p->>'quality', '')::int, nullif(p->>'client_feedback', '')::int,
          coalesce(nullif(p->>'reputational_risk', ''), 'none'), coalesce(nullif(p->>'decision', ''), 'keep'),
          p->>'notes', _partner_metrics(p_partner_id, q), me.id)
  on conflict (partner_id, quarter) do update set
    responsiveness = excluded.responsiveness, quality = excluded.quality, client_feedback = excluded.client_feedback,
    reputational_risk = excluded.reputational_risk, decision = excluded.decision, notes = excluded.notes,
    metrics = excluded.metrics, reviewed_by = excluded.reviewed_by, created_at = now()
  returning * into v;

  -- Remove partners that create reputational risk
  if v.decision = 'remove' then
    update partners set status = 'removed', removed_reason = 'Quarterly review ' || q || ': ' || v.notes, updated_at = now()
     where id = p_partner_id;
  elsif v.decision = 'watch' then
    update partners set status = 'paused', updated_at = now() where id = p_partner_id and status = 'active';
  end if;
  return to_jsonb(v);
end $$;

-- ── Scheduled (hourly, with the journey jobs) ──────────────────────────

create function public._run_partner_jobs() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today   date := _qatar_today();
  q       text := _quarter_of(today);
  expired int;
  due     int;
  a       record;
begin
  update partner_mous set status = 'expired' where status = 'signed' and expires_on is not null and expires_on < today;
  get diagnostics expired = row_count;

  -- Once per quarter: remind admins which partners need their quarterly review
  select count(*) into due from partners x
   where x.status in ('active','paused') and coalesce(x.review_reminded_quarter, '') <> q
     and not exists (select 1 from partner_reviews v where v.partner_id = x.id and v.quarter = q);
  if due > 0 then
    update partners set review_reminded_quarter = q where status in ('active','paused') and coalesce(review_reminded_quarter, '') <> q;
    for a in select id from profiles where role = 'admin' and admin_scope = 'full' and is_active loop
      perform _notify(a.id, 'case', 'Quarterly partner review due (' || q || ')',
        due || ' partner(s) need their ' || q || ' performance review.', '/admin/partners');
    end loop;
  end if;
  return jsonb_build_object('mous_expired', expired, 'review_reminders', due);
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

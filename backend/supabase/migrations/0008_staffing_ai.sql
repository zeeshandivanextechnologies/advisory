-- ═══════════════════════════════════════════════════════════════════════
-- Staffing & delivery model (core-offerings document) + AI drafts:
--   * Team directory: Founder / Principal, advisors, Financial specialist,
--     Legal / regulatory professional, Virtual assistant, Content contractor
--     — each with a cost model (per project / monthly / hourly / referral)
--   * Engagement team: who works on each engagement, responsibility and cost;
--     founders join every engagement automatically; staff cost → margin
--   * Team logins: admin accounts can be limited to a scope
--     (virtual_assistant, content_contractor). Enforced centrally in _require
--     from the calling api_* function, so it holds for both backends.
--   * AI drafts log (first drafts, research, model scaffolds, checklists,
--     CRM replies) — every draft is kept for human review
--
-- Additive. _require and _engagement_json keep their signatures; full admins
-- (the default) behave exactly as before.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Team directory ─────────────────────────────────────────────────────

create table public.staff_members (
  id               bigint generated always as identity primary key,
  profile_id       uuid unique references public.profiles on delete set null,
  full_name        text not null,
  email            text,
  staff_role       text not null check (staff_role in
                     ('founder','advisor','financial_specialist','legal_professional','virtual_assistant','content_contractor')),
  cost_model       text not null default 'none' check (cost_model in ('none','per_project','monthly','hourly','referral')),
  rate             numeric(12,2),
  rate_max         numeric(12,2),
  currency         text not null default 'USD',
  responsibilities text,
  notes            text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table public.engagement_team (
  id              bigint generated always as identity primary key,
  engagement_id   bigint not null references public.engagements on delete cascade,
  staff_member_id bigint not null references public.staff_members on delete cascade,
  responsibility  text,
  cost            numeric(12,2) not null default 0 check (cost >= 0),
  status          text not null default 'assigned' check (status in ('assigned','done')),
  created_at      timestamptz not null default now(),
  unique (engagement_id, staff_member_id)
);
create index on public.engagement_team (engagement_id);

-- Admin login scope: full admin (default) or a limited team role
alter table public.profiles
  add column admin_scope text not null default 'full'
    check (admin_scope in ('full','virtual_assistant','content_contractor'));

create table public.ai_drafts (
  id           bigint generated always as identity primary key,
  kind         text not null,
  context_type text,
  context_id   text,
  created_by   uuid references public.profiles on delete set null,
  model        text,
  input        jsonb,
  output       jsonb,
  created_at   timestamptz not null default now()
);

alter table public.staff_members   enable row level security;
alter table public.engagement_team enable row level security;
alter table public.ai_drafts       enable row level security;
revoke all on public.staff_members, public.engagement_team, public.ai_drafts from anon, authenticated;

-- ── Scoped admin access ────────────────────────────────────────────────

-- api_* functions a limited admin scope may call (everything else is denied)
create function public._admin_scope_allows(scope text, fn text) returns boolean
language sql immutable as $$
  select fn = any(array[
      -- everyone: own account and notifications
      'api_me','api_login','api_update_profile','api_notifications','api_mark_notifications_read',
      'api_notification_prefs','api_update_notification_prefs','api_my_team_scope'
    ])
    or (scope = 'virtual_assistant' and fn = any(array[
      -- intake tracking, scheduling, CRM hygiene, follow-up cadence, event lists
      'api_admin_leads','api_admin_update_lead','api_admin_lead_detail',
      'api_admin_service_requests','api_admin_update_service_request','api_get_intake','api_admin_sales_profile',
      'api_consultations','api_admin_followups','api_admin_update_followup',
      'api_admin_events','api_admin_save_event','api_admin_delete_event','api_events',
      'api_admin_memberships','api_market_briefs'
    ]))
    or (scope = 'content_contractor' and fn = any(array[
      -- editing, publishing calendar: market briefs and events
      'api_market_briefs','api_admin_save_brief','api_admin_delete_brief',
      'api_admin_events','api_admin_save_event','api_events'
    ]))
$$;

-- Outermost api_* function on the call stack (the one the client called)
create function public._calling_api_function() returns text
language plpgsql stable as $$
declare
  ctx text;
  fn  text;
  m   text[];
begin
  get diagnostics ctx = pg_context;
  for m in select regexp_matches(ctx, 'function (?:[a-z_]+\.)?"?(api_[a-z0-9_]+)"?\(', 'g') loop
    fn := m[1];   -- keep the last match: the outermost frame
  end loop;
  return fn;
end $$;

create or replace function public._require(roles text[] default null) returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare
  p  profiles;
  fn text;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null then raise exception 'Not authenticated'; end if;
  if not p.is_active then raise exception 'Your account has been suspended. Please contact support.'; end if;
  if p.role <> 'admin' and coalesce((select value from settings where key = 'maintenance_mode'), '0') = '1' then
    raise exception 'The platform is under maintenance. Please try again later.';
  end if;
  if roles is not null and not (p.role = any(roles)) then raise exception 'You do not have permission to do this'; end if;

  -- Team logins with a limited scope only reach their own part of the admin panel
  if p.role = 'admin' and p.admin_scope <> 'full' then
    fn := _calling_api_function();
    if fn is not null and not _admin_scope_allows(p.admin_scope, fn) then
      raise exception 'Your team role does not have access to this';
    end if;
  end if;
  return p;
end $$;

create function public.api_my_team_scope() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return jsonb_build_object('role', me.role, 'admin_scope', me.admin_scope,
    'staff', (select to_jsonb(s) from staff_members s where s.profile_id = me.id));
end $$;

-- ── Team directory API (full admins) ───────────────────────────────────

create function public.api_admin_staff() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(s) || jsonb_build_object(
             'login_email', pr.email, 'login_scope', pr.admin_scope, 'login_role', pr.role,
             'active_engagements', (select count(*) from engagement_team t join engagements e on e.id = t.engagement_id
                                    where t.staff_member_id = s.id and e.status not in ('completed','cancelled')))
           order by s.is_active desc, s.staff_role, s.full_name)
    from staff_members s left join profiles pr on pr.id = s.profile_id), '[]'::jsonb);
end $$;

create function public.api_admin_save_staff(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  s      staff_members;
  v_prof uuid;
begin
  if p ? 'login_email' then
    v_prof := case when nullif(trim(p->>'login_email'), '') is null then null else _user_id_by_email(p->>'login_email') end;
    if nullif(trim(p->>'login_email'), '') is not null and v_prof is null then raise exception 'No account found with that login email'; end if;
  end if;

  if p_id is null then
    if nullif(trim(p->>'full_name'), '') is null then raise exception 'Name is required'; end if;
    insert into staff_members (full_name, staff_role) values (trim(p->>'full_name'), coalesce(nullif(p->>'staff_role', ''), 'advisor'))
    returning * into s;
    p_id := s.id;
  end if;

  update staff_members set
    full_name        = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    email            = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    staff_role       = coalesce(nullif(p->>'staff_role', ''), staff_role),
    cost_model       = coalesce(nullif(p->>'cost_model', ''), cost_model),
    rate             = case when p ? 'rate' then nullif(p->>'rate', '')::numeric else rate end,
    rate_max         = case when p ? 'rate_max' then nullif(p->>'rate_max', '')::numeric else rate_max end,
    currency         = coalesce(nullif(p->>'currency', ''), currency),
    responsibilities = case when p ? 'responsibilities' then p->>'responsibilities' else responsibilities end,
    notes            = case when p ? 'notes' then p->>'notes' else notes end,
    is_active        = case when p ? 'is_active' then (p->>'is_active') in ('1','true') else is_active end,
    profile_id       = case when p ? 'login_email' then v_prof else profile_id end
  where id = p_id returning * into s;
  if s.id is null then raise exception 'Team member not found'; end if;
  return to_jsonb(s);
end $$;

-- ── Team logins (full admins) ──────────────────────────────────────────

create function public.api_admin_team_logins() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'email', email,
                                                       'admin_scope', admin_scope, 'is_active', is_active,
                                                       'is_me', id = me.id) order by admin_scope, full_name)
                   from profiles where role = 'admin'), '[]'::jsonb);
end $$;

-- Give an existing client account a limited admin login (VA / content contractor)
create function public.api_admin_grant_team_login(p_email text, p_scope text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  uid uuid := _user_id_by_email(p_email);
  u   profiles;
begin
  if me.admin_scope <> 'full' then raise exception 'Only a full admin can manage team logins'; end if;
  if p_scope not in ('virtual_assistant','content_contractor') then raise exception 'Choose a team role'; end if;
  select * into u from profiles where id = uid;
  if u.id is null then raise exception 'No account found with that email — ask them to register first'; end if;
  if u.role = 'advisor' then raise exception 'Advisor accounts cannot be team logins'; end if;
  if u.role = 'admin' and u.admin_scope = 'full' then raise exception 'This account is already a full admin'; end if;
  update profiles set role = 'admin', admin_scope = p_scope where id = uid returning * into u;
  perform _notify(uid, 'account', 'Team access granted',
    'You now have ' || replace(p_scope, '_', ' ') || ' access. Sign out and in again to see it.', '/admin/leads');
  return jsonb_build_object('id', u.id, 'email', u.email, 'admin_scope', u.admin_scope);
end $$;

create function public.api_admin_revoke_team_login(p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  u  profiles;
begin
  if me.admin_scope <> 'full' then raise exception 'Only a full admin can manage team logins'; end if;
  select * into u from profiles where id = p_user_id;
  if u.id is null or u.role <> 'admin' or u.admin_scope = 'full' then raise exception 'Only limited team logins can be revoked here'; end if;
  update profiles set role = 'user', admin_scope = 'full' where id = p_user_id returning * into u;
  return jsonb_build_object('id', u.id, 'email', u.email, 'role', u.role);
end $$;

-- ── Engagement team ────────────────────────────────────────────────────

-- Founders take part in every engagement
create function public._assign_founders() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into engagement_team (engagement_id, staff_member_id, responsibility, cost)
  select new.id, s.id, 'Primary judgment, client meetings, regulatory navigation, final recommendations', 0
  from staff_members s where s.staff_role = 'founder' and s.is_active
  on conflict do nothing;
  return new;
end $$;
create trigger engagements_assign_founders after insert on public.engagements
  for each row execute function public._assign_founders();

create function public._team_json(t public.engagement_team) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(t) || jsonb_build_object('full_name', s.full_name, 'staff_role', s.staff_role,
                                          'cost_model', s.cost_model, 'rate', s.rate, 'rate_max', s.rate_max, 'currency', s.currency)
  from staff_members s where s.id = t.staff_member_id
$$;

create or replace function public._engagement_json(e public.engagements) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(e) || jsonb_build_object(
    'client_name', u.full_name, 'client_email', u.email,
    'advisor_name', ap.full_name,
    'offering_name', o.name,
    'offering_slug', o.slug,
    'case_number', c.case_number,
    'paid_amount', (select coalesce(sum(amount), 0) from engagement_invoices where engagement_id = e.id and status = 'paid'),
    'outstanding', (select coalesce(sum(amount), 0) from engagement_invoices where engagement_id = e.id and status = 'unpaid'),
    'qa_total', (select count(*) from engagement_qa_items where engagement_id = e.id),
    'qa_done', (select count(*) from engagement_qa_items where engagement_id = e.id and is_checked),
    'staff_cost', (select coalesce(sum(cost), 0) from engagement_team where engagement_id = e.id),
    'margin', e.amount - (select coalesce(sum(cost), 0) from engagement_team where engagement_id = e.id),
    'team_count', (select count(*) from engagement_team where engagement_id = e.id),
    -- Staffing model: financial specialist for the Market Entry Blueprint and larger engagements
    'needs_financial_specialist',
      (o.slug = 'market-entry-blueprint' or e.amount >= _setting_num('sales_min_project_budget', 5000))
      and not exists (select 1 from engagement_team t join staff_members s on s.id = t.staff_member_id
                      where t.engagement_id = e.id and s.staff_role = 'financial_specialist'))
  from profiles u
  left join advisors a on a.id = e.advisor_id
  left join profiles ap on ap.id = a.profile_id
  left join service_offerings o on o.id = e.offering_id
  left join cases c on c.id = e.case_id
  where u.id = e.user_id
$$;

create function public.api_engagement_team(p_engagement_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e engagements;
begin
  select * into e from engagements where id = p_engagement_id;
  if e.id is null or _engagement_access(e) is distinct from 'staff' then raise exception 'Engagement not found'; end if;
  return coalesce((select jsonb_agg(_team_json(t) order by t.created_at) from engagement_team t where t.engagement_id = e.id), '[]'::jsonb);
end $$;

create function public.api_admin_save_team_member(p_engagement_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  t  engagement_team;
  v_id bigint := nullif(p->>'id', '')::bigint;
begin
  if not exists (select 1 from engagements where id = p_engagement_id) then raise exception 'Engagement not found'; end if;
  if v_id is null then
    if not exists (select 1 from staff_members where id = nullif(p->>'staff_member_id', '')::bigint and is_active) then
      raise exception 'Choose an active team member';
    end if;
    insert into engagement_team (engagement_id, staff_member_id, responsibility, cost)
    values (p_engagement_id, (p->>'staff_member_id')::bigint, nullif(p->>'responsibility', ''), coalesce(nullif(p->>'cost', '')::numeric, 0))
    on conflict (engagement_id, staff_member_id) do update set responsibility = excluded.responsibility, cost = excluded.cost
    returning * into t;
  else
    update engagement_team set
      responsibility = case when p ? 'responsibility' then nullif(p->>'responsibility', '') else responsibility end,
      cost           = coalesce(nullif(p->>'cost', '')::numeric, cost),
      status         = coalesce(nullif(p->>'status', ''), status)
    where id = v_id and engagement_id = p_engagement_id returning * into t;
    if t.id is null then raise exception 'Assignment not found'; end if;
  end if;
  return api_engagement_team(p_engagement_id);
end $$;

create function public.api_admin_remove_team_member(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  delete from engagement_team where id = p_id;
end $$;

-- ── Context lookups used by the AI drafting endpoints ──────────────────

create function public.api_admin_lead_detail(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return (select to_jsonb(m) from contact_messages m where m.id = p_id);
end $$;

create function public.api_admin_proposal_context(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  pr proposals;
begin
  select * into pr from proposals where id = p_id;
  if pr.id is null then raise exception 'Proposal not found'; end if;
  return jsonb_build_object(
    'proposal', _proposal_json(pr),
    'request', (select _request_json(r) from service_requests r where r.id = pr.request_id),
    'offering', (select to_jsonb(o) from service_offerings o where o.id = pr.offering_id),
    'intake', (select to_jsonb(i) from client_intakes i where i.user_id = pr.user_id));
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

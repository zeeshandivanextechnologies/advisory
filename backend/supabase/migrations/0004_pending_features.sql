-- ═══════════════════════════════════════════════════════════════════════
-- Pending features:
--   1. Notification preferences (user Settings → Notifications tab)
--   2. Admin dashboard period filter (7d / 30d / all)
--   3. Maintenance mode enforcement
--   4. Online payments (Stripe Checkout via the Express API)
--   5. Session reminders (sent by the Express API 30 minutes before)
--
-- Additive: new columns/functions. api_admin_dashboard gains an optional
-- parameter (calls without it behave exactly as before). _require keeps its
-- signature and only adds the maintenance check.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. Notification preferences ────────────────────────────────────────

alter table public.profiles
  add column notification_prefs jsonb not null default '{}'::jsonb;

-- Missing key = enabled
create function public._pref_enabled(uid uuid, pref text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (notification_prefs->>pref)::boolean from profiles where id = uid), true)
$$;

create function public.api_notification_prefs() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return me.notification_prefs;
end $$;

-- Merges { key: boolean } pairs; only known keys are accepted
create function public.api_update_notification_prefs(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me    profiles := _require();
  known text[] := array['session_reminders','compliance_reminders','document_updates','billing_notifs','consultant_messages'];
  k     text;
  v     jsonb;
  prefs jsonb := me.notification_prefs;
begin
  for k, v in select key, value from jsonb_each(p) loop
    if k = any(known) and jsonb_typeof(v) = 'boolean' then
      prefs := prefs || jsonb_build_object(k, v);
    end if;
  end loop;
  update profiles set notification_prefs = prefs where id = me.id;
  return prefs;
end $$;

-- ── 2. Admin dashboard with period ─────────────────────────────────────

drop function public.api_admin_dashboard();

-- p_period: '7d' | '30d' | 'all'; null keeps the original behaviour
-- (this calendar month, 6-month chart).
create function public.api_admin_dashboard(p_period text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  since  timestamptz := case p_period
                          when '7d'  then now() - interval '7 days'
                          when '30d' then now() - interval '30 days'
                          when 'all' then '-infinity'::timestamptz
                          else date_trunc('month', now())
                        end;
  chart  jsonb;
begin
  if p_period in ('7d', '30d') then
    select jsonb_agg(jsonb_build_object('month', to_char(d, 'DD Mon'), 'total', coalesce(t.total, 0)) order by d)
      into chart
      from generate_series(date_trunc('day', now()) - make_interval(days => case p_period when '7d' then 6 else 29 end),
                           date_trunc('day', now()), interval '1 day') d
      left join lateral (select sum(amount) as total from payments
                         where status = 'completed' and date_trunc('day', paid_at) = d) t on true;
  else
    select jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon'), 'total', coalesce(t.total, 0)) order by m)
      into chart
      from generate_series(date_trunc('month', now()) - make_interval(months => case when p_period = 'all' then 11 else 5 end),
                           date_trunc('month', now()), interval '1 month') m
      left join lateral (select sum(amount) as total from payments
                         where status = 'completed' and date_trunc('month', paid_at) = m) t on true;
  end if;

  return jsonb_build_object(
    'period', coalesce(p_period, 'month'),
    'stats', jsonb_build_object(
      'total_users',     (select count(*) from profiles where role = 'user'),
      'total_advisors',  (select count(*) from advisors where status = 'active'),
      'active_cases',    (select count(*) from cases where status not in ('closed','cancelled')),
      'monthly_revenue', (select coalesce(sum(amount), 0) from payments where status = 'completed' and paid_at >= since)
    ),
    'deltas', jsonb_build_object(
      'new_users_month',    (select count(*) from profiles where role = 'user' and created_at >= since),
      'new_advisors_month', (select count(*) from advisors where created_at >= since)
    ),
    'recent_users', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select id, full_name, email, role, plan, created_at, is_active
        from profiles order by created_at desc limit 5
      ) x), '[]'::jsonb),
    'recent_cases', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select c.id, c.title, c.case_number, c.category, c.status, c.created_at, u.full_name as user_name
        from cases c join profiles u on u.id = c.user_id order by c.created_at desc limit 5
      ) x), '[]'::jsonb),
    'revenue_chart', coalesce(chart, '[]'::jsonb)
  );
end $$;

-- ── 3. Maintenance mode ────────────────────────────────────────────────
-- Every authenticated api_* function goes through _require, so blocking here
-- blocks the whole app for non-admins. Public endpoints (settings, plans,
-- contact) stay available.

create or replace function public._require(roles text[] default null) returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null then raise exception 'Not authenticated'; end if;
  if not p.is_active then raise exception 'Your account has been suspended. Please contact support.'; end if;
  if p.role <> 'admin' and coalesce((select value from settings where key = 'maintenance_mode'), '0') = '1' then
    raise exception 'The platform is under maintenance. Please try again later.';
  end if;
  if roles is not null and not (p.role = any(roles)) then raise exception 'You do not have permission to do this'; end if;
  return p;
end $$;

-- ── 4. Online payments (Stripe Checkout) ───────────────────────────────

alter table public.payments
  add column plan_id     bigint references public.subscription_plans on delete set null,
  add column gateway_ref text;

create index on public.payments (gateway_ref);

-- Creates a pending payment for the chosen plan. The Express API then opens a
-- Stripe Checkout session for it; the plan is activated only when Stripe
-- confirms payment (_complete_payment).
create function public.api_start_checkout(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me  profiles := _require(array['user']);
  gw  text := coalesce(_setting('payment_gateway'), 'manual');
  sp  subscription_plans;
  pay payments;
begin
  if gw = 'manual' then raise exception 'Online payments are not enabled'; end if;
  select * into sp from subscription_plans where id = nullif(p->>'plan_id', '')::bigint and is_active;
  if sp.id is null then raise exception 'Plan not found'; end if;
  if sp.price <= 0 then raise exception 'This plan is free and does not need payment'; end if;

  -- Abandon earlier unpaid attempts for the same plan
  update payments set status = 'failed'
   where user_id = me.id and plan_id = sp.id and status = 'pending';

  insert into payments (user_id, plan_id, amount, currency, payment_method, description, status)
  values (me.id, sp.id, sp.price, sp.currency, gw, sp.name || ' plan — ' || sp.duration_days || ' days', 'pending')
  returning * into pay;

  return jsonb_build_object('payment', to_jsonb(pay), 'plan', to_jsonb(sp), 'gateway', gw,
                            'email', me.email, 'full_name', me.full_name);
end $$;

-- Server-only (called by the API with the gateway's confirmation). Idempotent.
create function public._complete_payment(p_payment_id bigint, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  pay payments;
  sp  subscription_plans;
  sub subscriptions;
begin
  select * into pay from payments where id = p_payment_id for update;
  if pay.id is null then raise exception 'Payment not found'; end if;
  if pay.status = 'completed' then
    return jsonb_build_object('payment', to_jsonb(pay), 'already_completed', true);
  end if;
  select * into sp from subscription_plans where id = pay.plan_id;
  if sp.id is null then raise exception 'Plan for payment % not found', p_payment_id; end if;

  update subscriptions set status = 'cancelled' where user_id = pay.user_id and status = 'active';
  insert into subscriptions (user_id, plan_id, expires_at)
  values (pay.user_id, sp.id, now() + make_interval(days => sp.duration_days))
  returning * into sub;
  update profiles set plan = lower(sp.name) where id = pay.user_id;

  update payments set status = 'completed', paid_at = now(), subscription_id = sub.id,
                      gateway_ref = coalesce(p_ref, gateway_ref)
   where id = pay.id returning * into pay;

  perform _notify(pay.user_id, 'billing', 'Payment received',
    'Your ' || sp.name || ' plan is active. Invoice ' || pay.invoice_no || '.', '/user/settings');
  return jsonb_build_object('payment', to_jsonb(pay), 'subscription', to_jsonb(sub), 'plan_name', sp.name);
end $$;

create function public._fail_payment(p_payment_id bigint, p_ref text) returns void
language sql security definer set search_path = public as $$
  update payments set status = 'failed', gateway_ref = coalesce(p_ref, gateway_ref)
   where id = p_payment_id and status = 'pending'
$$;

-- ── 5. Session reminders ───────────────────────────────────────────────

alter table public.consultations
  add column reminder_sent_at timestamptz;

-- Server-only. Atomically claims sessions starting within 30 minutes that have
-- not been reminded yet, adds in-app notifications, and returns the details
-- for the reminder emails. Safe to run from several servers at once.
create function public._claim_session_reminders() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  rows jsonb;
  r    record;
begin
  with claimed as (
    update consultations set reminder_sent_at = now()
     where status = 'scheduled' and reminder_sent_at is null
       and scheduled_at > now() and scheduled_at <= now() + interval '30 minutes'
    returning *
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'scheduled_at', c.scheduled_at, 'duration_min', c.duration_min, 'medium', c.medium,
           'client_id', u.id, 'client_name', u.full_name, 'client_email', u.email,
           'client_wants_email', _pref_enabled(u.id, 'session_reminders'),
           'advisor_id', ap.id, 'advisor_name', ap.full_name, 'advisor_email', ap.email,
           'advisor_wants_email', _pref_enabled(ap.id, 'session_reminders'))), '[]'::jsonb)
    into rows
    from claimed c
    join profiles u  on u.id = c.user_id
    join advisors a  on a.id = c.advisor_id
    join profiles ap on ap.id = a.profile_id;

  for r in select * from jsonb_array_elements(rows) as e(v) loop
    perform _notify((r.v->>'client_id')::uuid, 'consultation', 'Session starting soon',
      'Your session with ' || (r.v->>'advisor_name') || ' starts in 30 minutes.', '/user/consultations');
    perform _notify((r.v->>'advisor_id')::uuid, 'consultation', 'Session starting soon',
      'Your session with ' || (r.v->>'client_name') || ' starts in 30 minutes.', '/advisor/schedule');
  end loop;
  return rows;
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

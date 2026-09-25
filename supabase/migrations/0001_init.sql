-- ═══════════════════════════════════════════════════════════════════════
-- AunAdvisory — serverless backend on Supabase
--
-- Security model:
--   * Every table has RLS enabled with NO policies and no grants for
--     anon/authenticated, so the browser can never touch tables directly.
--   * The frontend talks only to the `api_*` RPC functions below. They are
--     SECURITY DEFINER and enforce auth, role and ownership themselves.
--   * `_*` functions are internal helpers and are not callable by clients.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────────────────

create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  full_name   text not null default '',
  phone       text,
  country     text,
  role        text not null default 'user' check (role in ('user','advisor','admin')),
  plan        text not null default 'free',
  avatar_url  text,
  is_active   boolean not null default true,
  last_login  timestamptz,
  created_at  timestamptz not null default now()
);

create table public.advisors (
  id              bigint generated always as identity primary key,
  profile_id      uuid not null unique references public.profiles on delete cascade,
  bio             text,
  hourly_rate     numeric(10,2) not null default 0,
  experience_yrs  int not null default 0,
  specializations jsonb not null default '[]'::jsonb,
  is_available    boolean not null default true,
  status          text not null default 'pending' check (status in ('active','pending','suspended')),
  created_at      timestamptz not null default now()
);

create table public.cases (
  id           bigint generated always as identity primary key,
  case_number  text unique,
  user_id      uuid not null references public.profiles on delete cascade,
  advisor_id   bigint references public.advisors on delete set null,
  title        text not null,
  category     text not null default 'other',
  jurisdiction text,
  description  text,
  priority     text not null default 'medium' check (priority in ('urgent','high','medium','low')),
  status       text not null default 'open'
               check (status in ('open','in_progress','pending_docs','review','closed','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.documents (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles on delete cascade,
  case_id       bigint references public.cases on delete set null,
  original_name text not null,
  file_path     text not null unique,
  file_type     text not null default 'application/octet-stream',
  file_size     bigint not null default 0,
  category      text not null default 'other',
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_notes  text,
  reviewed_by   uuid references public.profiles on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table public.consultations (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles on delete cascade,
  advisor_id    bigint not null references public.advisors on delete cascade,
  case_id       bigint references public.cases on delete set null,
  scheduled_at  timestamptz not null,
  duration_min  int not null default 30 check (duration_min between 15 and 240),
  medium        text not null default 'video' check (medium in ('video','phone','in_person')),
  status        text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  user_notes    text,
  advisor_notes text,
  rating        int check (rating between 1 and 5),
  review        text,
  fee           numeric(10,2) not null default 0,
  room_name     text not null default ('aun-' || replace(gen_random_uuid()::text, '-', '')),
  created_at    timestamptz not null default now()
);

create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  type       text not null default 'general',
  title      text not null,
  body       text,
  link       text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.settings (
  key       text primary key,
  value     text,
  is_public boolean not null default false
);

create table public.subscription_plans (
  id            bigint generated always as identity primary key,
  name          text not null,
  description   text,
  price         numeric(10,2) not null default 0 check (price >= 0),
  currency      text not null default 'QAR',
  duration_days int not null default 30 check (duration_days > 0),
  features      jsonb not null default '[]'::jsonb,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles on delete cascade,
  plan_id    bigint not null references public.subscription_plans,
  status     text not null default 'active' check (status in ('active','expired','cancelled')),
  starts_at  timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payments (
  id              bigint generated always as identity primary key,
  invoice_no      text unique,
  user_id         uuid not null references public.profiles on delete cascade,
  subscription_id bigint references public.subscriptions on delete set null,
  amount          numeric(10,2) not null,
  currency        text not null default 'QAR',
  payment_method  text,
  description     text,
  status          text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

create table public.contact_messages (
  id         bigint generated always as identity primary key,
  name       text not null,
  email      text not null,
  company    text,
  subject    text,
  message    text not null,
  created_at timestamptz not null default now()
);

create index on public.cases (user_id);
create index on public.cases (advisor_id);
create index on public.documents (user_id);
create index on public.consultations (user_id);
create index on public.consultations (advisor_id);
create index on public.notifications (user_id, is_read);
create index on public.subscriptions (user_id);
create index on public.payments (user_id);

-- Lock tables down: RPC-only access
alter table public.profiles           enable row level security;
alter table public.advisors           enable row level security;
alter table public.cases              enable row level security;
alter table public.documents          enable row level security;
alter table public.consultations      enable row level security;
alter table public.notifications      enable row level security;
alter table public.settings           enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.payments           enable row level security;
alter table public.contact_messages   enable row level security;
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ── Seed data ───────────────────────────────────────────────────────────

insert into public.settings (key, value, is_public) values
  ('platform_name',          'AunAdvisory',                          true),
  ('platform_email',         'hello@aunadvisory.com',                true),
  ('legal_email',            'legal@aunadvisory.com',                true),
  ('privacy_email',          'privacy@aunadvisory.com',              true),
  ('contact_phone',          '+974 4400 0000',                       true),
  ('contact_address',        'Qatar Financial Centre, Doha, Qatar',  true),
  ('office_hours',           'Sun–Thu: 8:00 AM – 6:00 PM AST',       true),
  ('default_currency',       'QAR',                                  true),
  ('consultation_fee',       '0',                                    true),
  ('jitsi_domain',           'meet.jit.si',                          true),
  ('allow_registration',     '1',                                    true),
  ('maintenance_mode',       '0',                                    true),
  ('app_version',            '2.0.0',                                false),
  ('payment_gateway',        'manual',                               false),
  ('gateway_test_mode',      '1',                                    false),
  ('stripe_publishable_key', '',                                     false),
  ('tap_publishable_key',    '',                                     false);

insert into public.subscription_plans (name, description, price, duration_days, features) values
  ('Free',       'Get started with the essentials', 0,   30, '["1 active case","Document uploads","Email support"]'),
  ('Pro',        'For growing businesses',          199, 30, '["Unlimited cases","Priority advisor matching","Video consultations","Priority support"]'),
  ('Enterprise', 'For established companies',       499, 30, '["Everything in Pro","Dedicated advisor","Compliance monitoring","24/7 support"]');

-- ── Triggers ────────────────────────────────────────────────────────────

create function public._set_case_number() returns trigger
language plpgsql set search_path = public as $$
begin
  new.case_number := 'CASE-' || lpad(new.id::text, 5, '0');
  return new;
end $$;
create trigger cases_number before insert on public.cases
  for each row execute function public._set_case_number();

create function public._set_invoice_no() returns trigger
language plpgsql set search_path = public as $$
begin
  new.invoice_no := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(new.id::text, 5, '0');
  return new;
end $$;
create trigger payments_invoice before insert on public.payments
  for each row execute function public._set_invoice_no();

create function public._touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger cases_touch before update on public.cases
  for each row execute function public._touch_updated_at();

-- New auth user → profile (+ advisor row). Role comes from signup metadata
-- but can only ever be 'user' or 'advisor'; admins are promoted by SQL.
create function public._handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role', 'user');
begin
  if coalesce((select value from settings where key = 'allow_registration'), '1') = '0' then
    raise exception 'Registration is currently disabled';
  end if;
  if r not in ('user', 'advisor') then r := 'user'; end if;
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), r);
  if r = 'advisor' then
    insert into advisors (profile_id) values (new.id);
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public._handle_new_user();

-- ── Internal helpers ────────────────────────────────────────────────────

create function public._require(roles text[] default null) returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null then raise exception 'Not authenticated'; end if;
  if not p.is_active then raise exception 'Your account has been suspended. Please contact support.'; end if;
  if roles is not null and not (p.role = any(roles)) then raise exception 'You do not have permission to do this'; end if;
  return p;
end $$;

create function public._my_advisor_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from advisors where profile_id = auth.uid()
$$;

create function public._setting(k text) returns text
language sql stable security definer set search_path = public as $$
  select value from settings where key = k
$$;

create function public._notify(uid uuid, ntype text, ntitle text, nbody text, nlink text default null) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link) values (uid, ntype, ntitle, nbody, nlink)
$$;

-- An advisor may see a user's data once they are linked by a consultation or case.
create function public._advisor_linked_to(adv bigint, uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select adv is not null and (
    exists (select 1 from consultations where advisor_id = adv and user_id = uid)
    or exists (select 1 from cases where advisor_id = adv and user_id = uid)
  )
$$;

create function public._can_view_document(d public.documents) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  select * into p from profiles where id = auth.uid();
  if p.id is null or not p.is_active then return false; end if;
  return p.role = 'admin'
      or d.user_id = p.id
      or (p.role = 'advisor' and _advisor_linked_to(_my_advisor_id(), d.user_id));
end $$;

-- Used by the storage policy on the private `documents` bucket
create function public._can_read_document_object(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from documents d where d.file_path = object_name and _can_view_document(d))
$$;

-- Page size/offset helpers for list endpoints
create function public._limit(p jsonb, dflt int default 20) returns int
language sql immutable as $$
  select least(greatest(coalesce(nullif(p->>'limit', '')::int, dflt), 1), 200)
$$;
create function public._page(p jsonb) returns int
language sql immutable as $$
  select greatest(coalesce(nullif(p->>'page', '')::int, 1), 1)
$$;

-- ── Auth / profile ──────────────────────────────────────────────────────

create function public.api_me() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p profiles := _require();
begin
  -- Downgrade to free once the paid subscription has run out
  if p.plan <> 'free' and not exists (
    select 1 from subscriptions
    where user_id = p.id and status = 'active' and (expires_at is null or expires_at > now())
  ) then
    update subscriptions set status = 'expired'
      where user_id = p.id and status = 'active' and expires_at <= now();
    update profiles set plan = 'free' where id = p.id returning * into p;
  end if;
  return to_jsonb(p);
end $$;

create function public.api_login() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p profiles := _require();
begin
  update profiles set last_login = now() where id = p.id;
  return api_me();
end $$;

create function public.api_update_profile(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := _require();
begin
  update profiles set
    full_name = coalesce(nullif(trim(p->>'full_name'), ''), full_name),
    phone     = case when p ? 'phone'   then nullif(trim(p->>'phone'), '')   else phone   end,
    country   = case when p ? 'country' then nullif(trim(p->>'country'), '') else country end
  where id = me.id;
  return api_me();
end $$;

-- ── Settings ────────────────────────────────────────────────────────────

create function public.api_public_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from settings where is_public
$$;

create function public.api_admin_settings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from settings);
end $$;

create function public.api_admin_update_settings(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']); k text; v text;
begin
  for k, v in select key, value from jsonb_each_text(p) loop
    if k = 'app_version' then continue; end if;
    insert into settings (key, value) values (k, v)
      on conflict (key) do update set value = excluded.value;
  end loop;
  return api_admin_settings();
end $$;

-- ── Advisors ────────────────────────────────────────────────────────────

-- Shape used by user-facing lists. Flags as 0/1 and specializations as a JSON
-- string, because that is what the existing pages parse.
create function public._advisor_card(a public.advisors) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', a.id,
    'profile_id', a.profile_id,
    'full_name', pr.full_name,
    'email', pr.email,
    'bio', a.bio,
    'hourly_rate', a.hourly_rate,
    'experience_yrs', a.experience_yrs,
    'specializations', a.specializations::text,
    'is_available', case when a.is_available then 1 else 0 end,
    'status', a.status,
    'rating', (select round(avg(rating), 1) from consultations where advisor_id = a.id and rating is not null),
    'total_clients', (select count(distinct user_id) from consultations where advisor_id = a.id),
    'created_at', a.created_at
  )
  from profiles pr where pr.id = a.profile_id
$$;

create function public.api_advisors(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  q   text := nullif(trim(p->>'search'), '');
  lim int  := _limit(p);
begin
  return coalesce((
    select jsonb_agg(_advisor_card(a) order by pr.full_name)
    from (
      select a.* from advisors a join profiles pr on pr.id = a.profile_id
      where a.status = 'active' and pr.is_active
        and (q is null or pr.full_name ilike '%' || q || '%' or a.specializations::text ilike '%' || q || '%')
      order by pr.full_name limit lim
    ) a join profiles pr on pr.id = a.profile_id
  ), '[]'::jsonb);
end $$;

create function public.api_advisor_profile() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['advisor']);
begin
  return (select jsonb_build_object(
      'id', id, 'bio', bio, 'hourly_rate', hourly_rate, 'experience_yrs', experience_yrs,
      'specializations', specializations, 'is_available', is_available, 'status', status)
    from advisors where profile_id = me.id);
end $$;

create function public.api_update_advisor_profile(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['advisor']);
begin
  update advisors set
    bio             = case when p ? 'bio' then p->>'bio' else bio end,
    hourly_rate     = coalesce(nullif(p->>'hourly_rate', '')::numeric, hourly_rate),
    experience_yrs  = coalesce(nullif(p->>'experience_yrs', '')::int, experience_yrs),
    specializations = case when jsonb_typeof(p->'specializations') = 'array' then p->'specializations' else specializations end,
    is_available    = coalesce((p->>'is_available')::boolean, is_available)
  where profile_id = me.id;
  return api_advisor_profile();
end $$;

create function public.api_advisor_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['advisor']);
  adv bigint   := _my_advisor_id();
begin
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'active_clients',    (select count(distinct user_id) from consultations where advisor_id = adv and status <> 'cancelled'),
      'upcoming_sessions', (select count(*) from consultations where advisor_id = adv and status = 'scheduled' and scheduled_at > now()),
      'active_cases',      (select count(*) from cases where advisor_id = adv and status not in ('closed','cancelled'))
    ),
    'recent_docs', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select d.id, d.original_name, d.category, d.status, d.created_at, u.full_name as client_name
        from documents d join profiles u on u.id = d.user_id
        where _advisor_linked_to(adv, d.user_id)
        order by d.created_at desc limit 5
      ) x), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(x order by x.scheduled_at) from (
        select c.id, c.scheduled_at, c.medium, c.status, c.duration_min, u.full_name as client_name
        from consultations c join profiles u on u.id = c.user_id
        where c.advisor_id = adv and c.status = 'scheduled' and c.scheduled_at > now() - interval '1 hour'
        order by c.scheduled_at limit 5
      ) x), '[]'::jsonb)
  );
end $$;

-- ── User dashboard ──────────────────────────────────────────────────────

create function public.api_user_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'total_cases',       (select count(*) from cases where user_id = me.id),
      'open_cases',        (select count(*) from cases where user_id = me.id and status in ('open','in_progress','pending_docs','review')),
      'total_docs',        (select count(*) from documents where user_id = me.id),
      'upcoming_sessions', (select count(*) from consultations where user_id = me.id and status = 'scheduled' and scheduled_at > now())
    ),
    'recent_cases', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select id, title, case_number, category, status, created_at
        from cases where user_id = me.id order by created_at desc limit 5
      ) x), '[]'::jsonb),
    'recent_docs', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select id, original_name, category, status, created_at
        from documents where user_id = me.id order by created_at desc limit 5
      ) x), '[]'::jsonb)
  );
end $$;

-- ── Consultations ───────────────────────────────────────────────────────

create function public.api_consultations(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  lim int      := _limit(p, 50);
begin
  return coalesce((
    select jsonb_agg(x order by x.scheduled_at desc) from (
      select c.*, ap.full_name as advisor_name, u.full_name as client_name, u.email as client_email
      from consultations c
      join advisors a  on a.id  = c.advisor_id
      join profiles ap on ap.id = a.profile_id
      join profiles u  on u.id  = c.user_id
      where case me.role
              when 'admin'   then true
              when 'advisor' then c.advisor_id = adv
              else c.user_id = me.id
            end
      order by c.scheduled_at desc limit lim
    ) x), '[]'::jsonb);
end $$;

create function public.api_book_consultation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['user']);
  a      advisors;
  v_case bigint   := nullif(p->>'case_id', '')::bigint;
  v_at   timestamptz := (p->>'scheduled_at')::timestamptz;
  v_dur  int := coalesce(nullif(p->>'duration_min', '')::int, 30);
  c      consultations;
begin
  select * into a from advisors where id = nullif(p->>'advisor_id', '')::bigint;
  if a.id is null or a.status <> 'active' then raise exception 'Advisor not found'; end if;
  if not a.is_available then raise exception 'This advisor is not currently accepting bookings'; end if;
  if v_at is null or v_at < now() then raise exception 'Please choose a future date and time'; end if;
  if v_case is not null and not exists (select 1 from cases where id = v_case and user_id = me.id) then
    raise exception 'Case not found';
  end if;
  if exists (
    select 1 from consultations
    where advisor_id = a.id and status = 'scheduled'
      and tstzrange(scheduled_at, scheduled_at + make_interval(mins => duration_min))
       && tstzrange(v_at, v_at + make_interval(mins => v_dur))
  ) then
    raise exception 'The advisor is already booked at that time. Please pick another slot.';
  end if;

  insert into consultations (user_id, advisor_id, case_id, scheduled_at, duration_min, medium, user_notes, fee)
  values (me.id, a.id, v_case, v_at, v_dur, coalesce(nullif(p->>'medium', ''), 'video'),
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

create function public.api_update_consultation(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me       profiles := _require();
  c        consultations;
  a        advisors;
  is_user  boolean;
  is_adv   boolean;
  is_admin boolean := me.role = 'admin';
  s        text := nullif(p->>'status', '');
begin
  select * into c from consultations where id = p_id for update;
  if c.id is null then raise exception 'Consultation not found'; end if;
  select * into a from advisors where id = c.advisor_id;
  is_user := c.user_id = me.id;
  is_adv  := a.profile_id = me.id;
  if not (is_user or is_adv or is_admin) then raise exception 'Consultation not found'; end if;

  if s is not null and s <> c.status then
    if not (is_admin
         or (is_user and s in ('cancelled','completed') and c.status = 'scheduled')
         or (is_adv  and s in ('cancelled','completed','no_show') and c.status = 'scheduled')) then
      raise exception 'You cannot change this consultation to %', s;
    end if;
    update consultations set status = s where id = p_id;
    if s = 'cancelled' then
      perform _notify(case when is_user then a.profile_id else c.user_id end, 'consultation',
        'Consultation cancelled',
        'The session on ' || to_char(c.scheduled_at at time zone 'Asia/Qatar', 'DD Mon YYYY HH24:MI') || ' (AST) was cancelled.',
        case when is_user then '/advisor/schedule' else '/user/consultations' end);
    end if;
  end if;

  if p ? 'rating' or p ? 'review' then
    if not is_user then raise exception 'Only the client can rate a consultation'; end if;
    if coalesce(s, c.status) <> 'completed' then raise exception 'You can only rate completed consultations'; end if;
    update consultations set
      rating = coalesce(nullif(p->>'rating', '')::int, rating),
      review = case when p ? 'review' then p->>'review' else review end
    where id = p_id;
  end if;

  if p ? 'advisor_notes' then
    if not (is_adv or is_admin) then raise exception 'Only the advisor can add session notes'; end if;
    update consultations set advisor_notes = p->>'advisor_notes' where id = p_id;
  end if;

  if p ? 'user_notes' and is_user then
    update consultations set user_notes = p->>'user_notes' where id = p_id;
  end if;

  select * into c from consultations where id = p_id;
  return to_jsonb(c);
end $$;

create function public.api_consultation_join(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require();
  c  consultations;
begin
  select * into c from consultations where id = p_id;
  if c.id is null
     or not (me.role = 'admin' or c.user_id = me.id or c.advisor_id = _my_advisor_id()) then
    raise exception 'Consultation not found';
  end if;
  if c.status <> 'scheduled' then raise exception 'This consultation is no longer active'; end if;
  return jsonb_build_object(
    'id', c.id,
    'room_name', c.room_name,
    'jitsi_domain', coalesce(nullif(_setting('jitsi_domain'), ''), 'meet.jit.si'),
    'scheduled_at', c.scheduled_at,
    'duration_min', c.duration_min,
    'display_name', me.full_name
  );
end $$;

-- ── Cases ───────────────────────────────────────────────────────────────

create function public.api_cases(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  lim int      := _limit(p);
  pg  int      := _page(p);
  q   text     := nullif(trim(p->>'search'), '');
  st  text     := nullif(p->>'status', '');
  cat text     := nullif(p->>'category', '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select c.*, u.full_name as user_name, ap.full_name as advisor_name
    from cases c
    join profiles u       on u.id  = c.user_id
    left join advisors a  on a.id  = c.advisor_id
    left join profiles ap on ap.id = a.profile_id
    where case me.role
            when 'admin'   then true
            when 'advisor' then c.advisor_id = adv
            else c.user_id = me.id
          end
      and (st  is null or c.status = st)
      and (cat is null or c.category = cat)
      and (q   is null or c.title ilike '%' || q || '%' or c.case_number ilike '%' || q || '%' or u.full_name ilike '%' || q || '%')
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(x order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object('total', total, 'page', pg, 'limit', lim));
end $$;

create function public.api_create_case(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['user']);
  c  cases;
begin
  if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
  insert into cases (user_id, title, category, jurisdiction, description, priority)
  values (me.id, trim(p->>'title'), coalesce(nullif(p->>'category', ''), 'other'),
          nullif(p->>'jurisdiction', ''), p->>'description', coalesce(nullif(p->>'priority', ''), 'medium'))
  returning * into c;
  perform _notify(me.id, 'case', 'Case submitted',
    'Your case ' || c.case_number || ' has been submitted and is awaiting review.', '/user/dashboard');
  return to_jsonb(c);
end $$;

create function public.api_update_case(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  c  cases;
  s  text := nullif(p->>'status', '');
begin
  select * into c from cases where id = p_id for update;
  if c.id is null or (me.role = 'advisor' and c.advisor_id is distinct from _my_advisor_id()) then
    raise exception 'Case not found';
  end if;
  update cases set
    status     = coalesce(s, status),
    priority   = coalesce(nullif(p->>'priority', ''), priority),
    advisor_id = case when me.role = 'admin' and p ? 'advisor_id' then nullif(p->>'advisor_id', '')::bigint else advisor_id end
  where id = p_id returning * into c;
  if s is not null then
    perform _notify(c.user_id, 'case', 'Case status updated',
      'Case ' || c.case_number || ' is now ' || replace(s, '_', ' ') || '.', '/user/dashboard');
  end if;
  return to_jsonb(c);
end $$;

-- ── Documents ───────────────────────────────────────────────────────────

create function public.api_documents(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  lim int      := _limit(p, 50);
  pg  int      := _page(p);
  st  text     := nullif(p->>'status', '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select d.id, d.user_id, d.case_id, d.original_name, d.file_type, d.file_size, d.category,
           d.status, d.review_notes, d.reviewed_at, d.created_at, u.full_name as uploader_name
    from documents d join profiles u on u.id = d.user_id
    where case me.role
            when 'admin'   then true
            when 'advisor' then _advisor_linked_to(adv, d.user_id)
            else d.user_id = me.id
          end
      and (st is null or d.status = st)
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(x order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object('total', total, 'page', pg, 'limit', lim));
end $$;

-- Called after the browser has uploaded the file to storage under <uid>/...
create function public.api_create_document(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require();
  v_path text := p->>'file_path';
  v_case bigint := nullif(p->>'case_id', '')::bigint;
  d      documents;
begin
  if v_path is null or split_part(v_path, '/', 1) <> me.id::text then raise exception 'Invalid file path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'documents' and name = v_path) then
    raise exception 'Upload not found';
  end if;
  if v_case is not null and not exists (select 1 from cases where id = v_case and user_id = me.id) then
    raise exception 'Case not found';
  end if;
  insert into documents (user_id, case_id, original_name, file_path, file_type, file_size, category)
  values (me.id, v_case, coalesce(nullif(p->>'original_name', ''), 'document'), v_path,
          coalesce(nullif(p->>'file_type', ''), 'application/octet-stream'),
          coalesce(nullif(p->>'file_size', '')::bigint, 0), coalesce(nullif(p->>'category', ''), 'other'))
  returning * into d;
  return to_jsonb(d);
end $$;

create function public.api_document_path(p_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require();
  d  documents;
begin
  select * into d from documents where id = p_id;
  if d.id is null or not _can_view_document(d) then raise exception 'Document not found'; end if;
  return d.file_path;
end $$;

create function public.api_review_document(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  d  documents;
  s  text := p->>'status';
begin
  if s not in ('approved','rejected','pending') then raise exception 'Invalid status'; end if;
  select * into d from documents where id = p_id for update;
  if d.id is null or not _can_view_document(d) then raise exception 'Document not found'; end if;
  update documents set status = s, review_notes = coalesce(p->>'notes', review_notes),
                       reviewed_by = me.id, reviewed_at = now()
  where id = p_id returning * into d;
  if s <> 'pending' then
    perform _notify(d.user_id, 'document', 'Document ' || s,
      '"' || d.original_name || '" was ' || s || coalesce(': ' || nullif(p->>'notes', ''), '.'), '/user/documents');
  end if;
  return to_jsonb(d);
end $$;

create function public.api_delete_document(p_id bigint) returns text
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  d  documents;
begin
  select * into d from documents where id = p_id;
  if d.id is null or not (d.user_id = me.id or me.role = 'admin') then raise exception 'Document not found'; end if;
  delete from documents where id = p_id;
  return d.file_path;  -- caller removes the storage object
end $$;

-- ── Notifications ───────────────────────────────────────────────────────

create function public.api_notifications(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  lim int      := _limit(p, 50);
begin
  return jsonb_build_object(
    'data', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select id, type, title, body, link, is_read, created_at
        from notifications where user_id = me.id order by created_at desc limit lim
      ) x), '[]'::jsonb),
    'meta', jsonb_build_object(
      'unread', (select count(*) from notifications where user_id = me.id and not is_read)));
end $$;

create function public.api_mark_notifications_read(p jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _require();
begin
  update notifications set is_read = true
  where user_id = me.id and not is_read
    and (not (p ? 'ids') or id in (select jsonb_array_elements_text(p->'ids')::bigint));
end $$;

-- ── Plans, subscriptions, payments ──────────────────────────────────────

create function public._plan_json(sp public.subscription_plans) returns jsonb
language sql immutable as $$
  select to_jsonb(sp) || jsonb_build_object('is_active', case when sp.is_active then 1 else 0 end)
$$;

create function public.api_plans() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(_plan_json(sp) order by sp.price), '[]'::jsonb)
  from subscription_plans sp where sp.is_active
$$;

create function public.api_my_subscription() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return (
    select jsonb_build_object('id', s.id, 'plan_id', s.plan_id, 'plan_name', sp.name, 'status', s.status,
                              'starts_at', s.starts_at, 'expires_at', s.expires_at)
    from subscriptions s join subscription_plans sp on sp.id = s.plan_id
    where s.user_id = me.id and s.status = 'active' and (s.expires_at is null or s.expires_at > now())
    order by s.created_at desc limit 1);
end $$;

-- NOTE: the `manual` gateway activates the plan immediately. Hook a real
-- gateway (Stripe/Tap) in via an Edge Function before charging customers.
create function public.api_purchase_plan(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me  profiles := _require(array['user']);
  sp  subscription_plans;
  sub subscriptions;
  pay payments;
begin
  if coalesce(_setting('payment_gateway'), 'manual') <> 'manual' then
    raise exception 'Online payments are not configured yet. Please contact support.';
  end if;
  select * into sp from subscription_plans where id = nullif(p->>'plan_id', '')::bigint and is_active;
  if sp.id is null then raise exception 'Plan not found'; end if;

  update subscriptions set status = 'cancelled' where user_id = me.id and status = 'active';
  insert into subscriptions (user_id, plan_id, expires_at)
  values (me.id, sp.id, case when sp.price > 0 then now() + make_interval(days => sp.duration_days) end)
  returning * into sub;
  update profiles set plan = lower(sp.name) where id = me.id;

  if sp.price > 0 then
    insert into payments (user_id, subscription_id, amount, currency, payment_method, description, status, paid_at)
    values (me.id, sub.id, sp.price, sp.currency, coalesce(nullif(p->>'payment_method', ''), 'manual'),
            sp.name || ' plan — ' || sp.duration_days || ' days', 'completed', now())
    returning * into pay;
    perform _notify(me.id, 'billing', 'Payment received',
      'Your ' || sp.name || ' plan is active. Invoice ' || pay.invoice_no || '.', '/user/settings');
  end if;
  return jsonb_build_object('subscription', to_jsonb(sub), 'payment', to_jsonb(pay));
end $$;

create function public.api_payments() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (select * from payments where user_id = me.id order by created_at desc limit 100) x
  ), '[]'::jsonb);
end $$;

create function public.api_admin_plans() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return coalesce((select jsonb_agg(_plan_json(sp) order by sp.price) from subscription_plans sp), '[]'::jsonb);
end $$;

create function public.api_admin_save_plan(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  sp subscription_plans;
  feats jsonb := case jsonb_typeof(p->'features') when 'array' then p->'features' end;
begin
  if p_id is null then
    if nullif(trim(p->>'name'), '') is null then raise exception 'Plan name is required'; end if;
    insert into subscription_plans (name, description, price, currency, duration_days, features)
    values (trim(p->>'name'), p->>'description', coalesce(nullif(p->>'price', '')::numeric, 0),
            coalesce(nullif(p->>'currency', ''), 'QAR'), coalesce(nullif(p->>'duration_days', '')::int, 30),
            coalesce(feats, '[]'::jsonb))
    returning * into sp;
  else
    update subscription_plans set
      name          = coalesce(nullif(trim(p->>'name'), ''), name),
      description   = case when p ? 'description' then p->>'description' else description end,
      price         = coalesce(nullif(p->>'price', '')::numeric, price),
      currency      = coalesce(nullif(p->>'currency', ''), currency),
      duration_days = coalesce(nullif(p->>'duration_days', '')::int, duration_days),
      features      = coalesce(feats, features),
      is_active     = case when p ? 'is_active'
                           then (p->>'is_active') in ('1', 'true') else is_active end
    where id = p_id returning * into sp;
    if sp.id is null then raise exception 'Plan not found'; end if;
  end if;
  return _plan_json(sp);
end $$;

create function public.api_admin_delete_plan(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  if exists (select 1 from subscriptions where plan_id = p_id) then
    update subscription_plans set is_active = false where id = p_id;  -- keep history intact
  else
    delete from subscription_plans where id = p_id;
  end if;
end $$;

-- ── Contact form (public) ───────────────────────────────────────────────

create function public.api_contact(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(p->>'name'), '') is null or nullif(trim(p->>'email'), '') is null
     or nullif(trim(p->>'message'), '') is null then
    raise exception 'Name, email and message are required';
  end if;
  if length(p->>'message') > 5000 then raise exception 'Message is too long'; end if;
  insert into contact_messages (name, email, company, subject, message)
  values (left(trim(p->>'name'), 200), left(trim(p->>'email'), 200), left(p->>'company', 200),
          left(p->>'subject', 300), p->>'message');
end $$;

-- ── Admin ───────────────────────────────────────────────────────────────

create function public.api_admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'total_users',     (select count(*) from profiles where role = 'user'),
      'total_advisors',  (select count(*) from advisors where status = 'active'),
      'active_cases',    (select count(*) from cases where status not in ('closed','cancelled')),
      'monthly_revenue', (select coalesce(sum(amount), 0) from payments
                          where status = 'completed' and paid_at >= date_trunc('month', now()))
    ),
    'deltas', jsonb_build_object(
      'new_users_month',    (select count(*) from profiles where role = 'user' and created_at >= date_trunc('month', now())),
      'new_advisors_month', (select count(*) from advisors where created_at >= date_trunc('month', now()))
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
    'revenue_chart', (
      select jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon'), 'total', coalesce(t.total, 0)) order by m)
      from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m
      left join lateral (
        select sum(amount) as total from payments
        where status = 'completed' and date_trunc('month', paid_at) = m
      ) t on true)
  );
end $$;

create function public.api_admin_users(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  lim int      := _limit(p);
  pg  int      := _page(p);
  q   text     := nullif(trim(p->>'search'), '');
  r   text     := nullif(p->>'role', '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select id, full_name, email, phone, role, plan, created_at, last_login, is_active
    from profiles
    where (r is null or role = r)
      and (q is null or full_name ilike '%' || q || '%' or email ilike '%' || q || '%')
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(x order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object('total', total, 'page', pg, 'limit', lim));
end $$;

create function public.api_admin_toggle_user(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  u  profiles;
begin
  if p_id = me.id then raise exception 'You cannot deactivate your own account'; end if;
  update profiles set is_active = not is_active where id = p_id returning * into u;
  if u.id is null then raise exception 'User not found'; end if;
  return to_jsonb(u);
end $$;

create function public.api_admin_advisors(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  lim int      := _limit(p);
  pg  int      := _page(p);
  q   text     := nullif(trim(p->>'search'), '');
  st  text     := nullif(p->>'status', '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select a.*, pr.full_name, pr.email from advisors a join profiles pr on pr.id = a.profile_id
    where (st is null or a.status = st)
      and (q is null or pr.full_name ilike '%' || q || '%' or pr.email ilike '%' || q || '%')
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(_advisor_card(x::advisors) order by x.created_at desc)
                   from (select id, profile_id, bio, hourly_rate, experience_yrs, specializations,
                                is_available, status, created_at
                         from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object('total', total, 'page', pg, 'limit', lim));
end $$;

create function public.api_admin_update_advisor_status(p_id bigint, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  a  advisors;
begin
  if p_status not in ('active','pending','suspended') then raise exception 'Invalid status'; end if;
  update advisors set status = p_status where id = p_id returning * into a;
  if a.id is null then raise exception 'Advisor not found'; end if;
  perform _notify(a.profile_id, 'account',
    case p_status when 'active' then 'Advisor profile approved' when 'suspended' then 'Advisor profile suspended'
                  else 'Advisor profile under review' end,
    case p_status when 'active' then 'Your profile is now visible to clients.'
                  when 'suspended' then 'Your profile is hidden from clients. Contact support for details.'
                  else 'Your profile is pending review.' end,
    '/advisor/settings');
  return _advisor_card(a);
end $$;

create function public.api_admin_revenue() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'total_revenue',  (select coalesce(sum(amount), 0) from payments where status = 'completed'),
      'pending_amount', (select coalesce(sum(amount), 0) from payments where status = 'pending')
    ),
    'summary', (
      select jsonb_agg(jsonb_build_object('period', to_char(m, 'Mon YYYY'),
                                          'total', coalesce(t.total, 0),
                                          'transactions', coalesce(t.n, 0)) order by m desc)
      from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
      left join lateral (
        select sum(amount) as total, count(*) as n from payments
        where status = 'completed' and date_trunc('month', paid_at) = m
      ) t on true),
    'recent_payments', coalesce((
      select jsonb_agg(x order by x.created_at desc) from (
        select py.id, py.invoice_no, py.amount, py.currency, py.payment_method, py.status,
               py.paid_at, py.created_at, py.description, u.full_name as user_name
        from payments py join profiles u on u.id = py.user_id
        order by py.created_at desc limit 50
      ) x), '[]'::jsonb)
  );
end $$;

-- ── Storage: private bucket for uploaded documents ─────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 20971520)
on conflict (id) do nothing;

create policy "documents: upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents: read permitted files" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public._can_read_document_object(name)));

create policy "documents: delete own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Function privileges ────────────────────────────────────────────────

revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

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

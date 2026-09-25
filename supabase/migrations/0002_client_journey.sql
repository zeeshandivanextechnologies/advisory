-- ═══════════════════════════════════════════════════════════════════════
-- Client-journey backend for the partly-built flows:
--   * Lead capture / CRM on top of the contact form
--   * Pre-call intake (onboarding "needs" + discovery questions)
--   * Discovery-call outcome, delivery recording and action items
--   * Case workspace: milestones (phases), kickoff checklist, status updates
--   * Document jurisdiction and booking-linked document
--
-- Additive only: new tables, new nullable/defaulted columns, new functions.
-- Existing functions are replaced with the same signatures and keep their
-- previous behaviour; they only accept extra optional fields.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Leads (contact form → CRM) ──────────────────────────────────────────

alter table public.contact_messages
  add column source      text not null default 'website',
  add column status      text not null default 'new'
             check (status in ('new','contacted','qualified','proposal','won','lost','nurture')),
  add column notes       text,
  add column assigned_to uuid references public.profiles on delete set null,
  add column updated_at  timestamptz not null default now();

create or replace function public.api_contact(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if nullif(trim(p->>'name'), '') is null or nullif(trim(p->>'email'), '') is null
     or nullif(trim(p->>'message'), '') is null then
    raise exception 'Name, email and message are required';
  end if;
  if length(p->>'message') > 5000 then raise exception 'Message is too long'; end if;
  insert into contact_messages (name, email, company, subject, message, source)
  values (left(trim(p->>'name'), 200), left(trim(p->>'email'), 200), left(p->>'company', 200),
          left(p->>'subject', 300), p->>'message',
          coalesce(left(nullif(trim(p->>'source'), ''), 50), 'website'));
end $$;

create function public.api_admin_leads(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['admin']);
  lim int      := _limit(p);
  pg  int      := _page(p);
  q   text     := nullif(trim(p->>'search'), '');
  st  text     := nullif(p->>'status', '');
  src text     := nullif(p->>'source', '');
  total bigint;
  rows  jsonb;
begin
  with f as (
    select m.*, a.full_name as assigned_name
    from contact_messages m left join profiles a on a.id = m.assigned_to
    where (st  is null or m.status = st)
      and (src is null or m.source = src)
      and (q   is null or m.name ilike '%' || q || '%' or m.email ilike '%' || q || '%'
                       or m.company ilike '%' || q || '%' or m.subject ilike '%' || q || '%')
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(x order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object(
    'total', total, 'page', pg, 'limit', lim,
    'new', (select count(*) from contact_messages where status = 'new')));
end $$;

create function public.api_admin_update_lead(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  m  contact_messages;
begin
  update contact_messages set
    status      = coalesce(nullif(p->>'status', ''), status),
    notes       = case when p ? 'notes' then p->>'notes' else notes end,
    source      = coalesce(nullif(p->>'source', ''), source),
    assigned_to = case when p ? 'assigned_to' then nullif(p->>'assigned_to', '')::uuid else assigned_to end,
    updated_at  = now()
  where id = p_id returning * into m;
  if m.id is null then raise exception 'Lead not found'; end if;
  return to_jsonb(m);
end $$;

-- ── Pre-call intake ─────────────────────────────────────────────────────

create table public.client_intakes (
  user_id           uuid primary key references public.profiles on delete cascade,
  needs             jsonb not null default '[]'::jsonb,
  industry          text,
  country_of_origin text,
  business_stage    text,
  capital_range     text,
  documents_ready   text,
  timeline          text,
  main_question     text,
  target_market     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.client_intakes enable row level security;
revoke all on public.client_intakes from anon, authenticated;

-- Upsert; only keys present in `p` are changed
create function public.api_save_intake(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require();
  i  client_intakes;
  f  text;
begin
  insert into client_intakes (user_id) values (me.id) on conflict (user_id) do nothing;
  if jsonb_typeof(p->'needs') = 'array' then
    update client_intakes set needs = p->'needs' where user_id = me.id;
  end if;
  foreach f in array array['industry','country_of_origin','business_stage','capital_range',
                           'documents_ready','timeline','main_question','target_market'] loop
    if p ? f then
      execute format('update client_intakes set %I = $1 where user_id = $2', f)
        using left(nullif(trim(p->>f), ''), 2000), me.id;
    end if;
  end loop;
  update client_intakes set updated_at = now() where user_id = me.id returning * into i;
  return to_jsonb(i);
end $$;

-- Own intake, or a client's intake for admins / linked advisors
create function public.api_get_intake(p_user_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  uid uuid     := coalesce(p_user_id, me.id);
begin
  if uid <> me.id and not (me.role = 'admin' or _advisor_linked_to(_my_advisor_id(), uid)) then
    raise exception 'Intake not found';
  end if;
  return (select to_jsonb(i) from client_intakes i where i.user_id = uid);
end $$;

-- ── Consultations: discovery outcome, delivery handover ────────────────

alter table public.consultations
  add column fit_decision  text check (fit_decision in ('go','no_go','nurture','refer')),
  add column next_step     text,
  add column recording_url text,
  add column action_items  jsonb not null default '[]'::jsonb,
  add column document_id   bigint references public.documents on delete set null;

alter table public.documents
  add column jurisdiction text;

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
begin
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

create or replace function public.api_update_consultation(p_id bigint, p jsonb) returns jsonb
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

  -- Discovery outcome and delivery handover (advisor/admin only)
  if p ?| array['fit_decision','next_step','recording_url','action_items'] then
    if not (is_adv or is_admin) then raise exception 'Only the advisor can update the session outcome'; end if;
    update consultations set
      fit_decision  = case when p ? 'fit_decision'  then nullif(p->>'fit_decision', '')  else fit_decision end,
      next_step     = case when p ? 'next_step'     then p->>'next_step'                 else next_step end,
      recording_url = case when p ? 'recording_url' then nullif(p->>'recording_url', '') else recording_url end,
      action_items  = case when jsonb_typeof(p->'action_items') = 'array' then p->'action_items' else action_items end
    where id = p_id;
    if p ? 'recording_url' or jsonb_typeof(p->'action_items') = 'array' then
      perform _notify(c.user_id, 'consultation', 'Session handover ready',
        'Notes and action items from your session are available.', '/user/consultations');
    end if;
  end if;

  select * into c from consultations where id = p_id;
  return to_jsonb(c);
end $$;

-- ── Documents: jurisdiction ────────────────────────────────────────────

create or replace function public.api_create_document(p jsonb) returns jsonb
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
  insert into documents (user_id, case_id, original_name, file_path, file_type, file_size, category, jurisdiction)
  values (me.id, v_case, coalesce(nullif(p->>'original_name', ''), 'document'), v_path,
          coalesce(nullif(p->>'file_type', ''), 'application/octet-stream'),
          coalesce(nullif(p->>'file_size', '')::bigint, 0), coalesce(nullif(p->>'category', ''), 'other'),
          nullif(p->>'jurisdiction', ''))
  returning * into d;
  return to_jsonb(d);
end $$;

create or replace function public.api_documents(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  lim int      := _limit(p, 50);
  pg  int      := _page(p);
  st  text     := nullif(p->>'status', '');
  cs  bigint   := nullif(p->>'case_id', '')::bigint;
  total bigint;
  rows  jsonb;
begin
  with f as (
    select d.id, d.user_id, d.case_id, d.original_name, d.file_type, d.file_size, d.category,
           d.jurisdiction, d.status, d.review_notes, d.reviewed_at, d.created_at, u.full_name as uploader_name
    from documents d join profiles u on u.id = d.user_id
    where case me.role
            when 'admin'   then true
            when 'advisor' then _advisor_linked_to(adv, d.user_id)
            else d.user_id = me.id
          end
      and (st is null or d.status = st)
      and (cs is null or d.case_id = cs)
  )
  select (select count(*) from f),
         coalesce((select jsonb_agg(x order by x.created_at desc)
                   from (select * from f order by created_at desc limit lim offset (pg - 1) * lim) x), '[]'::jsonb)
  into total, rows;
  return jsonb_build_object('data', rows, 'meta', jsonb_build_object('total', total, 'page', pg, 'limit', lim));
end $$;

-- ── Case workspace: milestones, kickoff checklist, status updates ──────

create table public.case_milestones (
  id           bigint generated always as identity primary key,
  case_id      bigint not null references public.cases on delete cascade,
  phase        text,
  title        text not null,
  description  text,
  status       text not null default 'pending' check (status in ('pending','in_progress','done','blocked')),
  due_date     date,
  sort_order   int not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table public.case_checklist_items (
  id          bigint generated always as identity primary key,
  case_id     bigint not null references public.cases on delete cascade,
  title       text not null,
  description text,
  is_required boolean not null default true,
  is_done     boolean not null default false,
  document_id bigint references public.documents on delete set null,
  sort_order  int not null default 0,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table public.case_updates (
  id          bigint generated always as identity primary key,
  case_id     bigint not null references public.cases on delete cascade,
  author_id   uuid references public.profiles on delete set null,
  update_type text not null default 'weekly' check (update_type in ('weekly','kickoff','delivery','general')),
  summary     text not null,
  next_steps  text,
  blockers    text,
  created_at  timestamptz not null default now()
);

create index on public.case_milestones (case_id);
create index on public.case_checklist_items (case_id);
create index on public.case_updates (case_id);
alter table public.case_milestones      enable row level security;
alter table public.case_checklist_items enable row level security;
alter table public.case_updates         enable row level security;
revoke all on public.case_milestones, public.case_checklist_items, public.case_updates from anon, authenticated;

-- 'staff' = admin or the advisor assigned to the case; 'owner' = the client
create function public._case_access(p_case_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require();
  c  cases;
begin
  select * into c from cases where id = p_case_id;
  if c.id is null then return null; end if;
  if me.role = 'admin' or (c.advisor_id is not null and c.advisor_id = _my_advisor_id()) then return 'staff'; end if;
  if c.user_id = me.id then return 'owner'; end if;
  return null;
end $$;

create function public._require_case(p_case_id bigint, need_staff boolean) returns text
language plpgsql stable security definer set search_path = public as $$
declare acc text := _case_access(p_case_id);
begin
  if acc is null then raise exception 'Case not found'; end if;
  if need_staff and acc <> 'staff' then raise exception 'You do not have permission to do this'; end if;
  return acc;
end $$;

create function public.api_case_detail(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare acc text := _require_case(p_id, false);
begin
  return (
    select to_jsonb(c) || jsonb_build_object(
      'access', acc,
      'user_name', u.full_name,
      'advisor_name', ap.full_name,
      'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.sort_order, m.id)
                              from case_milestones m where m.case_id = c.id), '[]'::jsonb),
      'checklist',  coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order, i.id)
                              from case_checklist_items i where i.case_id = c.id), '[]'::jsonb),
      'updates',    coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc)
                              from (select cu.*, pa.full_name as author_name
                                    from case_updates cu left join profiles pa on pa.id = cu.author_id
                                    where cu.case_id = c.id) x), '[]'::jsonb),
      'progress', (select case when count(*) = 0 then 0
                               else round(100.0 * count(*) filter (where status = 'done') / count(*)) end
                   from case_milestones where case_id = c.id)
    )
    from cases c
    join profiles u       on u.id  = c.user_id
    left join advisors a  on a.id  = c.advisor_id
    left join profiles ap on ap.id = a.profile_id
    where c.id = p_id);
end $$;

-- Create (p_id null) or update a milestone. Staff only.
create function public.api_save_milestone(p_case_id bigint, p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acc text := _require_case(p_case_id, true);
  m   case_milestones;
  old text;
begin
  if p_id is null then
    if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
    insert into case_milestones (case_id, phase, title, description, status, due_date, sort_order)
    values (p_case_id, nullif(p->>'phase', ''), trim(p->>'title'), p->>'description',
            coalesce(nullif(p->>'status', ''), 'pending'), nullif(p->>'due_date', '')::date,
            coalesce(nullif(p->>'sort_order', '')::int,
                     (select coalesce(max(sort_order), 0) + 1 from case_milestones where case_id = p_case_id)))
    returning * into m;
  else
    select status into old from case_milestones where id = p_id and case_id = p_case_id;
    if old is null then raise exception 'Milestone not found'; end if;
    update case_milestones set
      phase        = case when p ? 'phase' then nullif(p->>'phase', '') else phase end,
      title        = coalesce(nullif(trim(p->>'title'), ''), title),
      description  = case when p ? 'description' then p->>'description' else description end,
      status       = coalesce(nullif(p->>'status', ''), status),
      due_date     = case when p ? 'due_date' then nullif(p->>'due_date', '')::date else due_date end,
      sort_order   = coalesce(nullif(p->>'sort_order', '')::int, sort_order),
      completed_at = case when coalesce(nullif(p->>'status', ''), status) = 'done'
                          then coalesce(completed_at, now()) end
    where id = p_id returning * into m;
    if m.status = 'done' and old <> 'done' then
      perform _notify((select user_id from cases where id = p_case_id), 'case', 'Milestone completed',
        '"' || m.title || '" is done.', '/user/dashboard');
    end if;
  end if;
  return to_jsonb(m);
end $$;

create function public.api_delete_milestone(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare cid bigint := (select case_id from case_milestones where id = p_id);
begin
  if cid is null then raise exception 'Milestone not found'; end if;
  perform _require_case(cid, true);
  delete from case_milestones where id = p_id;
end $$;

-- Staff create/edit items; the client may tick items off and attach their documents.
create function public.api_save_checklist_item(p_case_id bigint, p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acc   text := _require_case(p_case_id, false);
  i     case_checklist_items;
  v_doc bigint := nullif(p->>'document_id', '')::bigint;
begin
  if v_doc is not null and not exists (
    select 1 from documents d join cases c on c.user_id = d.user_id where d.id = v_doc and c.id = p_case_id
  ) then
    raise exception 'Document not found';
  end if;

  if p_id is null then
    if acc <> 'staff' then raise exception 'You do not have permission to do this'; end if;
    if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
    insert into case_checklist_items (case_id, title, description, is_required, sort_order)
    values (p_case_id, trim(p->>'title'), p->>'description', coalesce((p->>'is_required')::boolean, true),
            coalesce(nullif(p->>'sort_order', '')::int,
                     (select coalesce(max(sort_order), 0) + 1 from case_checklist_items where case_id = p_case_id)))
    returning * into i;
  else
    if not exists (select 1 from case_checklist_items where id = p_id and case_id = p_case_id) then
      raise exception 'Checklist item not found';
    end if;
    if acc = 'staff' then
      update case_checklist_items set
        title       = coalesce(nullif(trim(p->>'title'), ''), title),
        description = case when p ? 'description' then p->>'description' else description end,
        is_required = coalesce((p->>'is_required')::boolean, is_required),
        sort_order  = coalesce(nullif(p->>'sort_order', '')::int, sort_order)
      where id = p_id;
    end if;
    update case_checklist_items set
      is_done     = coalesce((p->>'is_done')::boolean, is_done),
      document_id = case when p ? 'document_id' then v_doc else document_id end,
      done_at     = case when coalesce((p->>'is_done')::boolean, is_done) then coalesce(done_at, now()) end
    where id = p_id returning * into i;
  end if;
  return to_jsonb(i);
end $$;

create function public.api_delete_checklist_item(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare cid bigint := (select case_id from case_checklist_items where id = p_id);
begin
  if cid is null then raise exception 'Checklist item not found'; end if;
  perform _require_case(cid, true);
  delete from case_checklist_items where id = p_id;
end $$;

create function public.api_add_case_update(p_case_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  acc text := _require_case(p_case_id, true);
  u   case_updates;
begin
  if nullif(trim(p->>'summary'), '') is null then raise exception 'Summary is required'; end if;
  insert into case_updates (case_id, author_id, update_type, summary, next_steps, blockers)
  values (p_case_id, auth.uid(), coalesce(nullif(p->>'update_type', ''), 'weekly'),
          trim(p->>'summary'), p->>'next_steps', p->>'blockers')
  returning * into u;
  perform _notify((select user_id from cases where id = p_case_id), 'case',
    case u.update_type when 'weekly' then 'Weekly status update' when 'kickoff' then 'Kickoff summary'
                       when 'delivery' then 'Delivery update' else 'Case update' end,
    left(u.summary, 200), '/user/dashboard');
  return to_jsonb(u);
end $$;

-- ── Privileges for the new functions ───────────────────────────────────

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

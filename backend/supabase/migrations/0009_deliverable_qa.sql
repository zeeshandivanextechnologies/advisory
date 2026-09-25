-- ═══════════════════════════════════════════════════════════════════════
-- QA checklist before any deliverable goes out (core-offerings document):
--   draft → in QA (7-point checklist) → approved (founder / full admin, not
--   the author) → released to the client; "request changes" sends it back.
--   The engagement-level QA gate from migration 0006 is unchanged.
--
-- Files live in the private `documents` bucket under the uploader's folder;
-- clients can read a deliverable only once it is released.
-- Additive; _can_read_document_object keeps its signature.
-- ═══════════════════════════════════════════════════════════════════════

create table public.deliverables (
  id               bigint generated always as identity primary key,
  engagement_id    bigint not null references public.engagements on delete cascade,
  title            text not null,
  description      text,
  file_path        text unique,
  file_name        text,
  file_type        text,
  file_size        bigint,
  link_url         text,
  status           text not null default 'draft'
                   check (status in ('draft','in_qa','changes_requested','approved','released')),
  created_by       uuid references public.profiles on delete set null,
  submitted_at     timestamptz,
  qa_completed_at  timestamptz,
  approved_by      uuid references public.profiles on delete set null,
  approved_at      timestamptz,
  released_at      timestamptz,
  review_note      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.deliverables (engagement_id);

create table public.deliverable_qa_items (
  id             bigint generated always as identity primary key,
  deliverable_id bigint not null references public.deliverables on delete cascade,
  label          text not null,
  is_checked     boolean not null default false,
  checked_by     uuid references public.profiles on delete set null,
  checked_at     timestamptz,
  sort_order     int not null default 0
);
create index on public.deliverable_qa_items (deliverable_id);

alter table public.deliverables         enable row level security;
alter table public.deliverable_qa_items enable row level security;
revoke all on public.deliverables, public.deliverable_qa_items from anon, authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────

-- The document's QA checklist, applied to every deliverable
create function public._seed_deliverable_qa(did bigint) returns void
language sql security definer set search_path = public as $$
  insert into deliverable_qa_items (deliverable_id, label, sort_order)
  select did, label, ord from unnest(array[
    'Client name, company, sector, country and target market are correct',
    'All numbers, assumptions and recommendations are internally consistent',
    'Legal/regulatory sections use proper disclaimers and avoid unauthorized legal advice',
    'Sources or assumptions are noted where necessary',
    'Deliverable matches the signed scope and does not give free extra work',
    'Formatting uses brand colors, logo, heading structure and clean tables',
    'Every recommendation ends with a practical next step, owner and timing'
  ]) with ordinality as t(label, ord)
$$;

-- Approvers: full admins and founders in the team directory
create function public._can_approve(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role = 'admin' and admin_scope = 'full')
      or exists (select 1 from staff_members where profile_id = uid and staff_role = 'founder' and is_active)
$$;

create function public._deliverable_json(d public.deliverables) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(d) || jsonb_build_object(
    'created_by_name', (select full_name from profiles where id = d.created_by),
    'approved_by_name', (select full_name from profiles where id = d.approved_by),
    'has_file', d.file_path is not null,
    'qa_total', (select count(*) from deliverable_qa_items where deliverable_id = d.id),
    'qa_done', (select count(*) from deliverable_qa_items where deliverable_id = d.id and is_checked),
    'qa_items', coalesce((select jsonb_agg(to_jsonb(q) || jsonb_build_object('checked_by_name', pc.full_name) order by q.sort_order, q.id)
                          from deliverable_qa_items q left join profiles pc on pc.id = q.checked_by
                          where q.deliverable_id = d.id), '[]'::jsonb))
$$;

-- Returns the engagement + caller access ('staff' | 'client') or raises
create function public._deliverable_engagement(eid bigint) returns public.engagements
language plpgsql stable security definer set search_path = public as $$
declare e engagements;
begin
  select * into e from engagements where id = eid;
  if e.id is null or _engagement_access(e) is null then raise exception 'Engagement not found'; end if;
  return e;
end $$;

-- ── API ────────────────────────────────────────────────────────────────

-- Staff see every deliverable; the client sees released ones only
create function public.api_deliverables(p_engagement_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e   engagements := _deliverable_engagement(p_engagement_id);
  acc text := _engagement_access(e);
  me  profiles := _require();
begin
  return jsonb_build_object(
    'access', acc,
    'can_approve', _can_approve(me.id),
    'data', coalesce((select jsonb_agg(
               case when acc = 'staff' then _deliverable_json(d)
                    else jsonb_build_object('id', d.id, 'title', d.title, 'description', d.description,
                                            'file_name', d.file_name, 'file_type', d.file_type, 'has_file', d.file_path is not null,
                                            'link_url', d.link_url, 'status', d.status, 'released_at', d.released_at) end
               order by d.created_at desc)
             from deliverables d
             where d.engagement_id = e.id and (acc = 'staff' or d.status = 'released')), '[]'::jsonb));
end $$;

create function public.api_create_deliverable(p_engagement_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin','advisor']);
  e      engagements := _deliverable_engagement(p_engagement_id);
  v_path text := nullif(p->>'file_path', '');
  v_link text := nullif(trim(p->>'link_url'), '');
  d      deliverables;
begin
  if _engagement_access(e) <> 'staff' then raise exception 'Engagement not found'; end if;
  if e.status in ('awaiting_deposit','cancelled') then raise exception 'Deliverables can be added once the engagement has started'; end if;
  if nullif(trim(p->>'title'), '') is null then raise exception 'Title is required'; end if;
  if v_path is null and v_link is null then raise exception 'Attach a file or add a link'; end if;
  if v_link is not null and v_link !~* '^https?://' then raise exception 'The link must start with http:// or https://'; end if;
  if v_path is not null then
    if split_part(v_path, '/', 1) <> me.id::text then raise exception 'Invalid file path'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'documents' and name = v_path) then raise exception 'Upload not found'; end if;
  end if;

  insert into deliverables (engagement_id, title, description, file_path, file_name, file_type, file_size, link_url, created_by)
  values (e.id, trim(p->>'title'), nullif(p->>'description', ''), v_path, nullif(p->>'file_name', ''),
          nullif(p->>'file_type', ''), nullif(p->>'file_size', '')::bigint, v_link, me.id)
  returning * into d;
  perform _seed_deliverable_qa(d.id);
  return _deliverable_json(d);
end $$;

create function public.api_update_deliverable(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  d  deliverables;
begin
  select * into d from deliverables where id = p_id for update;
  if d.id is null or _engagement_access(_deliverable_engagement(d.engagement_id)) <> 'staff' then raise exception 'Deliverable not found'; end if;
  if d.status not in ('draft','changes_requested') then raise exception 'Only drafts can be edited'; end if;
  update deliverables set
    title       = coalesce(nullif(trim(p->>'title'), ''), title),
    description = case when p ? 'description' then nullif(p->>'description', '') else description end,
    link_url    = case when p ? 'link_url' then nullif(trim(p->>'link_url'), '') else link_url end,
    updated_at  = now()
  where id = p_id returning * into d;
  if d.link_url is not null and d.link_url !~* '^https?://' then raise exception 'The link must start with http:// or https://'; end if;
  return _deliverable_json(d);
end $$;

create function public.api_set_deliverable_qa(p_item_id bigint, p_checked boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  q  deliverable_qa_items;
  d  deliverables;
begin
  select * into q from deliverable_qa_items where id = p_item_id;
  if q.id is null then raise exception 'Checklist item not found'; end if;
  select * into d from deliverables where id = q.deliverable_id for update;
  if _engagement_access(_deliverable_engagement(d.engagement_id)) <> 'staff' then raise exception 'Checklist item not found'; end if;
  if d.status <> 'in_qa' then raise exception 'Submit the deliverable for QA first'; end if;
  update deliverable_qa_items set is_checked = p_checked,
         checked_by = case when p_checked then me.id end, checked_at = case when p_checked then now() end
   where id = q.id;
  update deliverables set qa_completed_at =
    case when not exists (select 1 from deliverable_qa_items where deliverable_id = d.id and not is_checked) then now() end
   where id = d.id returning * into d;
  return _deliverable_json(d);
end $$;

-- submit | approve | request_changes | release
create function public.api_deliverable_action(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin','advisor']);
  d      deliverables;
  e      engagements;
  action text := p->>'action';
  note   text := nullif(trim(p->>'note'), '');
  a      record;
begin
  select * into d from deliverables where id = p_id for update;
  if d.id is null then raise exception 'Deliverable not found'; end if;
  e := _deliverable_engagement(d.engagement_id);
  if _engagement_access(e) <> 'staff' then raise exception 'Deliverable not found'; end if;

  if action = 'submit' then
    if d.status not in ('draft','changes_requested') then raise exception 'This deliverable is already in review'; end if;
    -- Every submission is checked again from scratch
    update deliverable_qa_items set is_checked = false, checked_by = null, checked_at = null where deliverable_id = d.id;
    update deliverables set status = 'in_qa', submitted_at = now(), qa_completed_at = null, review_note = null, updated_at = now()
     where id = d.id returning * into d;
    for a in select id from profiles p where p.is_active and _can_approve(p.id) and p.id <> me.id loop
      perform _notify(a.id, 'document', 'Deliverable ready for QA and approval', '"' || d.title || '" — ' || e.title || '.', '/admin/engagements');
    end loop;

  elsif action = 'approve' then
    if d.status <> 'in_qa' then raise exception 'Only deliverables in QA can be approved'; end if;
    if exists (select 1 from deliverable_qa_items where deliverable_id = d.id and not is_checked) then
      raise exception 'Complete every QA checklist item before approval';
    end if;
    if not _can_approve(me.id) then raise exception 'Only a founder or full admin can approve deliverables'; end if;
    -- Four-eyes: the author cannot approve their own work (founders have the final say)
    if d.created_by = me.id and not exists (select 1 from staff_members where profile_id = me.id and staff_role = 'founder' and is_active) then
      raise exception 'Someone other than the author must approve this deliverable';
    end if;
    update deliverables set status = 'approved', approved_by = me.id, approved_at = now(), review_note = note, updated_at = now()
     where id = d.id returning * into d;
    if d.created_by is not null and d.created_by <> me.id then
      perform _notify(d.created_by, 'document', 'Deliverable approved', '"' || d.title || '" is approved and can be released.', '/advisor/engagements');
    end if;

  elsif action = 'request_changes' then
    if d.status not in ('in_qa','approved') then raise exception 'Only deliverables in review can be sent back'; end if;
    if note is null then raise exception 'Say what needs to change'; end if;
    update deliverables set status = 'changes_requested', review_note = note, approved_by = null, approved_at = null, updated_at = now()
     where id = d.id returning * into d;
    if d.created_by is not null and d.created_by <> me.id then
      perform _notify(d.created_by, 'document', 'Changes requested', '"' || d.title || '": ' || note, '/advisor/engagements');
    end if;

  elsif action = 'release' then
    if d.status <> 'approved' then raise exception 'Only approved deliverables can be released to the client'; end if;
    update deliverables set status = 'released', released_at = now(), updated_at = now() where id = d.id returning * into d;
    perform _notify(e.user_id, 'document', 'New deliverable: ' || d.title, 'Your advisor shared "' || d.title || '" for ' || e.title || '.', '/user/engagements');

  else
    raise exception 'Unknown action';
  end if;
  return _deliverable_json(d);
end $$;

-- File path for download: staff always, the client once released
create function public.api_deliverable_path(p_id bigint) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  d   deliverables;
  acc text;
begin
  select * into d from deliverables where id = p_id;
  if d.id is null or d.file_path is null then raise exception 'Deliverable not found'; end if;
  acc := _engagement_access(_deliverable_engagement(d.engagement_id));
  if acc is null or (acc = 'client' and d.status <> 'released') then raise exception 'Deliverable not found'; end if;
  return d.file_path;
end $$;

-- Storage read policy now also covers deliverables (same signature)
create or replace function public._can_read_document_object(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from documents d where d.file_path = object_name and _can_view_document(d))
      or exists (
        select 1 from deliverables v join engagements e on e.id = v.engagement_id
        where v.file_path = object_name
          and (_engagement_access(e) = 'staff' or (e.user_id = auth.uid() and v.status = 'released')))
$$;

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

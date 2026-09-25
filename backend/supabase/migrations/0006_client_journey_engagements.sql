-- ═══════════════════════════════════════════════════════════════════════
-- Client journey, steps 5–12 (core-offerings document):
--   5  Proposal / SOW: scope, deliverables, timeline, price, payment terms,
--      boundaries, validity 15–30 days
--   6  Contract (client accepts the proposal) + 50% deposit invoice;
--      no work starts before the deposit is paid
--   7  Kickoff on deposit payment: case workspace, phases, kickoff checklist,
--      welcome packet
--   8  Delivery in phases (case milestones) + Friday status-update nudges
--   9  Pre-delivery QA checklist; delivery is blocked until it is complete
--   10 Delivery (handover notes live on the consultation)
--   11 Final invoice issued on delivery; reminders on days 7, 14 and 15
--   12 Follow-ups on days 7, 30, 60, 90 (referral ask) and 180
--
-- Additive only. Payments made against engagement invoices are also written
-- to `payments` so the existing revenue reports include them.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────────────

create table public.proposals (
  id              bigint generated always as identity primary key,
  request_id      bigint references public.service_requests on delete set null,
  user_id         uuid not null references public.profiles on delete cascade,
  offering_id     bigint references public.service_offerings,
  title           text not null,
  scope           text,
  deliverables    jsonb not null default '[]'::jsonb,
  out_of_scope    jsonb not null default '[]'::jsonb,
  timeline        text,
  amount          numeric(12,2) not null check (amount > 0),
  currency        text not null default 'USD',
  deposit_percent int not null default 50 check (deposit_percent between 1 and 100),
  payment_terms   text,
  valid_until     date not null,
  status          text not null default 'draft'
                  check (status in ('draft','sent','accepted','declined','expired','withdrawn')),
  sent_at         timestamptz,
  responded_at    timestamptz,
  signed_name     text,
  decline_reason  text,
  created_by      uuid references public.profiles on delete set null,
  created_at      timestamptz not null default now()
);
create index on public.proposals (user_id);

create table public.engagements (
  id                   bigint generated always as identity primary key,
  proposal_id          bigint not null unique references public.proposals,
  request_id           bigint references public.service_requests on delete set null,
  user_id              uuid not null references public.profiles on delete cascade,
  offering_id          bigint references public.service_offerings,
  advisor_id           bigint references public.advisors on delete set null,
  case_id              bigint references public.cases on delete set null,
  title                text not null,
  amount               numeric(12,2) not null,
  currency             text not null default 'USD',
  status               text not null default 'awaiting_deposit'
                       check (status in ('awaiting_deposit','kickoff','in_delivery','qa','delivered','completed','cancelled')),
  qa_completed_at      timestamptz,
  delivery_notes       text,
  kickoff_at           timestamptz,
  delivered_at         timestamptz,
  completed_at         timestamptz,
  last_friday_nudge_on date,
  created_at           timestamptz not null default now()
);
create index on public.engagements (user_id);
create index on public.engagements (advisor_id);

create table public.engagement_invoices (
  id             bigint generated always as identity primary key,
  invoice_no     text unique,
  engagement_id  bigint not null references public.engagements on delete cascade,
  user_id        uuid not null references public.profiles on delete cascade,
  kind           text not null check (kind in ('deposit','final')),
  amount         numeric(12,2) not null check (amount > 0),
  currency       text not null default 'USD',
  status         text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  issued_at      timestamptz not null default now(),
  due_date       date not null,
  paid_at        timestamptz,
  payment_method text,
  payment_ref    text,
  reminder_days  int[] not null default '{}',
  created_at     timestamptz not null default now()
);
create index on public.engagement_invoices (engagement_id);
create index on public.engagement_invoices (status);

create table public.engagement_qa_items (
  id            bigint generated always as identity primary key,
  engagement_id bigint not null references public.engagements on delete cascade,
  label         text not null,
  is_checked    boolean not null default false,
  checked_by    uuid references public.profiles on delete set null,
  checked_at    timestamptz,
  sort_order    int not null default 0
);
create index on public.engagement_qa_items (engagement_id);

create table public.engagement_followups (
  id            bigint generated always as identity primary key,
  engagement_id bigint not null references public.engagements on delete cascade,
  user_id       uuid not null references public.profiles on delete cascade,
  day_offset    int not null,
  kind          text not null default 'checkin' check (kind in ('checkin','referral')),
  due_date      date not null,
  status        text not null default 'scheduled' check (status in ('scheduled','sent','done','skipped')),
  sent_at       timestamptz,
  notes         text,
  unique (engagement_id, day_offset)
);
create index on public.engagement_followups (status, due_date);

alter table public.payments add column engagement_invoice_id bigint references public.engagement_invoices on delete set null;

alter table public.proposals            enable row level security;
alter table public.engagements          enable row level security;
alter table public.engagement_invoices  enable row level security;
alter table public.engagement_qa_items  enable row level security;
alter table public.engagement_followups enable row level security;
revoke all on public.proposals, public.engagements, public.engagement_invoices,
              public.engagement_qa_items, public.engagement_followups from anon, authenticated;

create function public._set_engagement_invoice_no() returns trigger
language plpgsql set search_path = public as $$
begin
  new.invoice_no := 'ENG-' || to_char(now(), 'YYYYMM') || '-' || lpad(new.id::text, 5, '0');
  return new;
end $$;
create trigger engagement_invoices_no before insert on public.engagement_invoices
  for each row execute function public._set_engagement_invoice_no();

-- ── Helpers ────────────────────────────────────────────────────────────

create function public._qatar_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Qatar')::date $$;

-- Qatar weekend is Friday + Saturday
create function public._add_business_days(d date, n int) returns date
language plpgsql immutable as $$
declare r date := d; added int := 0;
begin
  while added < n loop
    r := r + 1;
    if extract(isodow from r) not in (5, 6) then added := added + 1; end if;
  end loop;
  return r;
end $$;

-- 'staff' = admin or the engagement's advisor; 'client' = the owner
create function public._engagement_access(e public.engagements) returns text
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  if me.role = 'admin' then return 'staff'; end if;
  if e.advisor_id is not null and e.advisor_id = _my_advisor_id() then return 'staff'; end if;
  if e.user_id = me.id then return 'client'; end if;
  return null;
end $$;

create function public._proposal_json(pr public.proposals) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(pr) || jsonb_build_object(
    'client_name', u.full_name, 'client_email', u.email,
    'offering_name', o.name,
    'deposit_amount', round(pr.amount * pr.deposit_percent / 100.0, 2),
    'is_expired', pr.status = 'sent' and pr.valid_until < _qatar_today(),
    'engagement_id', (select id from engagements where proposal_id = pr.id))
  from profiles u left join service_offerings o on o.id = pr.offering_id
  where u.id = pr.user_id
$$;

create function public._engagement_json(e public.engagements) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(e) || jsonb_build_object(
    'client_name', u.full_name, 'client_email', u.email,
    'advisor_name', ap.full_name,
    'offering_name', o.name,
    'case_number', c.case_number,
    'paid_amount', (select coalesce(sum(amount), 0) from engagement_invoices where engagement_id = e.id and status = 'paid'),
    'outstanding', (select coalesce(sum(amount), 0) from engagement_invoices where engagement_id = e.id and status = 'unpaid'),
    'qa_total', (select count(*) from engagement_qa_items where engagement_id = e.id),
    'qa_done', (select count(*) from engagement_qa_items where engagement_id = e.id and is_checked))
  from profiles u
  left join advisors a on a.id = e.advisor_id
  left join profiles ap on ap.id = a.profile_id
  left join service_offerings o on o.id = e.offering_id
  left join cases c on c.id = e.case_id
  where u.id = e.user_id
$$;

-- ── Step 5: proposals ──────────────────────────────────────────────────

-- Create (p_id null; from a request, or by client email + offering) or edit a draft
create function public.api_admin_save_proposal(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin']);
  pr     proposals;
  r      service_requests;
  o      service_offerings;
  v_user uuid;
  v_valid date;
begin
  if p_id is null then
    if nullif(p->>'request_id', '') is not null then
      select * into r from service_requests where id = (p->>'request_id')::bigint;
      if r.id is null then raise exception 'Request not found'; end if;
      v_user := r.user_id;
      select * into o from service_offerings where id = r.offering_id;
    else
      v_user := _user_id_by_email(p->>'client_email');
      if v_user is null then raise exception 'No client found with that email'; end if;
      select * into o from service_offerings where id = nullif(p->>'offering_id', '')::bigint;
    end if;
    insert into proposals (request_id, user_id, offering_id, title, scope, deliverables, out_of_scope, timeline,
                           amount, currency, payment_terms, valid_until, created_by)
    values (r.id, v_user, o.id,
            coalesce(nullif(trim(p->>'title'), ''), o.name, 'Advisory engagement'),
            coalesce(p->>'scope', o.summary),
            coalesce(_text_array(p->'deliverables'), o.deliverables, '[]'::jsonb),
            coalesce(_text_array(p->'out_of_scope'), o.out_of_scope, '[]'::jsonb),
            coalesce(p->>'timeline', o.timeline),
            coalesce(nullif(p->>'amount', '')::numeric, r.quoted_amount, o.price_min, 1),
            coalesce(nullif(p->>'currency', ''), o.currency, 'USD'),
            coalesce(p->>'payment_terms', '50% deposit on acceptance; balance due on delivery.'),
            _qatar_today() + 30, me.id)
    returning * into pr;
    p_id := pr.id;
  end if;

  select * into pr from proposals where id = p_id for update;
  if pr.id is null then raise exception 'Proposal not found'; end if;
  if pr.status <> 'draft' then raise exception 'Only draft proposals can be edited'; end if;

  v_valid := coalesce(nullif(p->>'valid_until', '')::date, pr.valid_until);
  update proposals set
    title           = coalesce(nullif(trim(p->>'title'), ''), title),
    scope           = case when p ? 'scope' then p->>'scope' else scope end,
    deliverables    = coalesce(_text_array(p->'deliverables'), deliverables),
    out_of_scope    = coalesce(_text_array(p->'out_of_scope'), out_of_scope),
    timeline        = case when p ? 'timeline' then p->>'timeline' else timeline end,
    amount          = coalesce(nullif(p->>'amount', '')::numeric, amount),
    currency        = coalesce(nullif(p->>'currency', ''), currency),
    deposit_percent = coalesce(nullif(p->>'deposit_percent', '')::int, deposit_percent),
    payment_terms   = case when p ? 'payment_terms' then p->>'payment_terms' else payment_terms end,
    valid_until     = v_valid
  where id = p_id returning * into pr;
  return _proposal_json(pr);
end $$;

create function public.api_admin_send_proposal(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  pr proposals;
  days int;
begin
  select * into pr from proposals where id = p_id for update;
  if pr.id is null then raise exception 'Proposal not found'; end if;
  if pr.status <> 'draft' then raise exception 'This proposal has already been sent'; end if;
  days := pr.valid_until - _qatar_today();
  if days < 15 or days > 30 then
    raise exception 'Proposal validity must be 15–30 days (currently % days)', days;
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

create function public.api_admin_withdraw_proposal(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  pr proposals;
begin
  update proposals set status = 'withdrawn' where id = p_id and status in ('draft','sent') returning * into pr;
  if pr.id is null then raise exception 'Only draft or sent proposals can be withdrawn'; end if;
  return _proposal_json(pr);
end $$;

create function public.api_admin_proposals(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  st text := nullif(p->>'status', '');
begin
  return coalesce((select jsonb_agg(_proposal_json(pr) order by pr.created_at desc)
                   from proposals pr where st is null or pr.status = st), '[]'::jsonb);
end $$;

create function public.api_my_proposals() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles := _require();
begin
  return coalesce((select jsonb_agg(_proposal_json(pr) order by pr.created_at desc)
                   from proposals pr where pr.user_id = me.id and pr.status <> 'draft'), '[]'::jsonb);
end $$;

-- ── Step 6: contract acceptance + deposit invoice ──────────────────────

create function public.api_respond_proposal(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['user']);
  pr     proposals;
  e      engagements;
  inv    engagement_invoices;
  accept boolean := coalesce((p->>'accept')::boolean, false);
  a      record;
begin
  select * into pr from proposals where id = p_id and user_id = me.id for update;
  if pr.id is null or pr.status = 'draft' then raise exception 'Proposal not found'; end if;
  if pr.status <> 'sent' then raise exception 'This proposal is no longer open'; end if;
  if pr.valid_until < _qatar_today() then
    update proposals set status = 'expired' where id = pr.id;
    raise exception 'This proposal expired on %. Please ask us for an updated one.', to_char(pr.valid_until, 'DD Mon YYYY');
  end if;

  if not accept then
    update proposals set status = 'declined', responded_at = now(), decline_reason = left(p->>'reason', 2000)
     where id = pr.id returning * into pr;
    if pr.request_id is not null then update service_requests set status = 'declined', updated_at = now() where id = pr.request_id; end if;
    for a in select id from profiles where role = 'admin' and is_active loop
      perform _notify(a.id, 'case', 'Proposal declined', me.full_name || ' declined "' || pr.title || '".', '/admin/engagements');
    end loop;
    return _proposal_json(pr);
  end if;

  -- Accepting is the contract: record who signed, and when
  if nullif(trim(p->>'signed_name'), '') is null then raise exception 'Type your full name to sign'; end if;
  if not coalesce((p->>'agree')::boolean, false) then raise exception 'Please confirm you agree to the scope and payment terms'; end if;

  update proposals set status = 'accepted', responded_at = now(), signed_name = left(trim(p->>'signed_name'), 200)
   where id = pr.id returning * into pr;
  if pr.request_id is not null then update service_requests set status = 'won', updated_at = now() where id = pr.request_id; end if;

  insert into engagements (proposal_id, request_id, user_id, offering_id, title, amount, currency)
  values (pr.id, pr.request_id, pr.user_id, pr.offering_id, pr.title, pr.amount, pr.currency)
  returning * into e;

  -- 50% deposit due within 5 business days; work starts only once it is paid
  insert into engagement_invoices (engagement_id, user_id, kind, amount, currency, due_date)
  values (e.id, e.user_id, 'deposit', round(pr.amount * pr.deposit_percent / 100.0, 2), pr.currency,
          _add_business_days(_qatar_today(), 5))
  returning * into inv;

  perform _notify(me.id, 'billing', 'Deposit invoice ' || inv.invoice_no,
    'Thank you for accepting. Work begins once the ' || pr.deposit_percent || '% deposit is received (due ' ||
    to_char(inv.due_date, 'DD Mon YYYY') || ').', '/user/engagements');
  for a in select id from profiles where role = 'admin' and is_active loop
    perform _notify(a.id, 'case', 'Proposal accepted', me.full_name || ' accepted "' || pr.title || '".', '/admin/engagements');
  end loop;
  return _proposal_json(pr) || jsonb_build_object('engagement', _engagement_json(e), 'invoice', to_jsonb(inv));
end $$;

-- ── Engagements ────────────────────────────────────────────────────────

create function public.api_engagements(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require();
  adv bigint   := _my_advisor_id();
  st  text     := nullif(p->>'status', '');
begin
  return coalesce((
    select jsonb_agg(_engagement_json(e) order by e.created_at desc)
    from engagements e
    where (st is null or e.status = st)
      and case me.role when 'admin' then true when 'advisor' then e.advisor_id = adv else e.user_id = me.id end
  ), '[]'::jsonb);
end $$;

create function public.api_engagement_detail(p_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  e   engagements;
  acc text;
begin
  select * into e from engagements where id = p_id;
  if e.id is null then raise exception 'Engagement not found'; end if;
  acc := _engagement_access(e);
  if acc is null then raise exception 'Engagement not found'; end if;
  return _engagement_json(e) || jsonb_build_object(
    'access', acc,
    'proposal', (select _proposal_json(pr) from proposals pr where pr.id = e.proposal_id),
    'invoices', coalesce((select jsonb_agg(to_jsonb(i) order by i.issued_at) from engagement_invoices i where i.engagement_id = e.id), '[]'::jsonb),
    'qa_items', coalesce((select jsonb_agg(to_jsonb(q) || jsonb_build_object('checked_by_name', pc.full_name) order by q.sort_order, q.id)
                          from engagement_qa_items q left join profiles pc on pc.id = q.checked_by
                          where q.engagement_id = e.id), '[]'::jsonb),
    'followups', coalesce((select jsonb_agg(to_jsonb(f) order by f.day_offset) from engagement_followups f where f.engagement_id = e.id), '[]'::jsonb));
end $$;

-- Staff move the engagement forward. Deposit → kickoff and final payment →
-- completed happen automatically when invoices are paid.
create function public.api_update_engagement(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me     profiles := _require(array['admin','advisor']);
  e      engagements;
  acc    text;
  s      text := nullif(p->>'status', '');
  remain numeric;
  inv    engagement_invoices;
begin
  select * into e from engagements where id = p_id for update;
  if e.id is null then raise exception 'Engagement not found'; end if;
  acc := _engagement_access(e);
  if acc is null or acc <> 'staff' then raise exception 'Engagement not found'; end if;

  if p ? 'advisor_id' then
    if me.role <> 'admin' then raise exception 'Only an admin can assign the advisor'; end if;
    update engagements set advisor_id = nullif(p->>'advisor_id', '')::bigint where id = e.id returning * into e;
    if e.case_id is not null then update cases set advisor_id = e.advisor_id where id = e.case_id; end if;
  end if;
  if p ? 'delivery_notes' then
    update engagements set delivery_notes = p->>'delivery_notes' where id = e.id returning * into e;
  end if;

  if s is not null and s <> e.status then
    if s = 'cancelled' then
      if me.role <> 'admin' then raise exception 'Only an admin can cancel an engagement'; end if;
      update engagement_invoices set status = 'void' where engagement_id = e.id and status = 'unpaid';
      update engagements set status = 'cancelled' where id = e.id returning * into e;
    elsif s = 'in_delivery' and e.status in ('kickoff','qa') then
      update engagements set status = 'in_delivery' where id = e.id returning * into e;
    elsif s = 'qa' and e.status = 'in_delivery' then
      update engagements set status = 'qa' where id = e.id returning * into e;
    elsif s = 'delivered' and e.status = 'qa' then
      if exists (select 1 from engagement_qa_items where engagement_id = e.id and not is_checked) then
        raise exception 'Complete every QA checklist item before delivery';
      end if;
      update engagements set status = 'delivered', delivered_at = now() where id = e.id returning * into e;
      if e.case_id is not null then update cases set status = 'review' where id = e.case_id; end if;

      -- Step 11: final invoice for the balance, issued the same day
      remain := e.amount - (select coalesce(sum(amount), 0) from engagement_invoices
                            where engagement_id = e.id and kind = 'deposit' and status <> 'void');
      if remain > 0 then
        insert into engagement_invoices (engagement_id, user_id, kind, amount, currency, due_date)
        values (e.id, e.user_id, 'final', remain, e.currency, _qatar_today() + 14)
        returning * into inv;
        perform _notify(e.user_id, 'billing', 'Final invoice ' || inv.invoice_no,
          'Your deliverables are ready. The balance is due by ' || to_char(inv.due_date, 'DD Mon YYYY') || '.', '/user/engagements');
      else
        perform _complete_engagement(e.id);
        select * into e from engagements where id = e.id;
      end if;
      perform _notify(e.user_id, 'case', 'Deliverables delivered', e.title || ' has been delivered.', '/user/engagements');
    else
      raise exception 'Cannot move from % to %', replace(e.status, '_', ' '), replace(s, '_', ' ');
    end if;
  end if;
  return _engagement_json(e);
end $$;

-- ── Step 9: QA checklist ───────────────────────────────────────────────

create function public._seed_qa_items(eid bigint) returns void
language sql security definer set search_path = public as $$
  insert into engagement_qa_items (engagement_id, label, sort_order)
  select eid, label, ord from unnest(array[
    'Client name, company, sector, country and target market are correct',
    'All numbers, assumptions and recommendations are internally consistent',
    'Legal/regulatory sections use proper disclaimers and avoid unauthorized legal advice',
    'Sources or assumptions are noted where necessary',
    'Deliverable matches the signed scope and does not give free extra work',
    'Formatting uses brand colors, logo, heading structure and clean tables',
    'Every recommendation ends with a practical next step, owner and timing'
  ]) with ordinality as t(label, ord)
$$;

create function public.api_set_qa_item(p_item_id bigint, p_checked boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  q  engagement_qa_items;
  e  engagements;
begin
  select * into q from engagement_qa_items where id = p_item_id;
  if q.id is null then raise exception 'Checklist item not found'; end if;
  select * into e from engagements where id = q.engagement_id;
  if _engagement_access(e) is distinct from 'staff' then raise exception 'Checklist item not found'; end if;
  if e.status in ('delivered','completed','cancelled') then raise exception 'QA is closed for this engagement'; end if;

  update engagement_qa_items set is_checked = p_checked,
         checked_by = case when p_checked then me.id end, checked_at = case when p_checked then now() end
   where id = q.id;
  update engagements set qa_completed_at =
    case when not exists (select 1 from engagement_qa_items where engagement_id = e.id and not is_checked) then now() end
   where id = e.id;
  return api_engagement_detail(e.id);
end $$;

create function public.api_add_qa_item(p_engagement_id bigint, p_label text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin','advisor']);
  e  engagements;
begin
  select * into e from engagements where id = p_engagement_id;
  if e.id is null or _engagement_access(e) is distinct from 'staff' then raise exception 'Engagement not found'; end if;
  if nullif(trim(p_label), '') is null then raise exception 'Enter the checklist item'; end if;
  insert into engagement_qa_items (engagement_id, label, sort_order)
  values (e.id, left(trim(p_label), 300), (select coalesce(max(sort_order), 0) + 1 from engagement_qa_items where engagement_id = e.id));
  update engagements set qa_completed_at = null where id = e.id;
  return api_engagement_detail(e.id);
end $$;

-- ── Payments (steps 6, 7, 11, 12) ──────────────────────────────────────

-- Step 12 schedule, created when the engagement completes
create function public._complete_engagement(eid bigint) returns void
language plpgsql security definer set search_path = public as $$
declare e engagements;
begin
  update engagements set status = 'completed', completed_at = now() where id = eid and status <> 'completed' returning * into e;
  if e.id is null then return; end if;
  if e.case_id is not null then update cases set status = 'closed' where id = e.case_id; end if;
  insert into engagement_followups (engagement_id, user_id, day_offset, kind, due_date)
  select e.id, e.user_id, d, case when d = 90 then 'referral' else 'checkin' end, _qatar_today() + d
  from unnest(array[7, 30, 60, 90, 180]) d
  on conflict do nothing;
  perform _notify(e.user_id, 'case', 'Engagement completed', 'Thank you for working with us on ' || e.title || '.', '/user/engagements');
end $$;

-- Server-only. Marks an invoice paid (admin record or gateway confirmation),
-- writes it to `payments`, and advances the engagement. Idempotent.
create function public._pay_engagement_invoice(p_invoice_id bigint, p_method text, p_ref text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  inv engagement_invoices;
  e   engagements;
  c   cases;
  a   record;
begin
  select * into inv from engagement_invoices where id = p_invoice_id for update;
  if inv.id is null then raise exception 'Invoice not found'; end if;
  if inv.status = 'paid' then return jsonb_build_object('invoice', to_jsonb(inv), 'already_paid', true); end if;
  if inv.status = 'void' then raise exception 'This invoice was cancelled'; end if;

  update engagement_invoices set status = 'paid', paid_at = now(), payment_method = coalesce(p_method, 'manual'), payment_ref = p_ref
   where id = inv.id returning * into inv;
  select * into e from engagements where id = inv.engagement_id for update;

  insert into payments (user_id, amount, currency, payment_method, description, status, paid_at, engagement_invoice_id)
  values (inv.user_id, inv.amount, inv.currency, inv.payment_method,
          e.title || ' — ' || case inv.kind when 'deposit' then 'deposit' else 'final payment' end || ' (' || inv.invoice_no || ')',
          'completed', now(), inv.id);

  if inv.kind = 'deposit' and e.status = 'awaiting_deposit' then
    -- Step 7: kickoff — workspace, phases, kickoff checklist, QA list
    insert into cases (user_id, advisor_id, title, category, description, priority, status)
    values (e.user_id, e.advisor_id, e.title,
            coalesce((select category from service_offerings where id = e.offering_id), 'other'),
            (select scope from proposals where id = e.proposal_id), 'medium', 'in_progress')
    returning * into c;

    insert into case_milestones (case_id, phase, title, sort_order, status)
    select c.id, 'Phase ' || ord, t, ord, case when ord = 1 then 'in_progress' else 'pending' end
    from unnest(array['Kickoff & onboarding','Research & analysis','Drafting deliverables','Internal QA','Delivery & walkthrough'])
         with ordinality as x(t, ord);

    insert into case_checklist_items (case_id, title, description, sort_order)
    select c.id, t, d, ord from (values
      (1, 'Read the welcome packet', 'How the engagement runs: weekly Friday updates, QA before delivery, and a delivery walkthrough.'),
      (2, 'Upload your company documents', 'Use Documents to share everything listed in the proposal scope.'),
      (3, 'Confirm key contacts', 'Tell us who approves deliverables and who we can contact day to day.'),
      (4, 'Attend the kickoff call', 'Book the kickoff session from Consultations.')
    ) as x(ord, t, d);

    perform _seed_qa_items(e.id);
    update engagements set status = 'kickoff', kickoff_at = now(), case_id = c.id where id = e.id returning * into e;

    perform _notify(e.user_id, 'case', 'Welcome aboard — your engagement has started',
      'Deposit received. Your workspace for ' || e.title || ' is ready with a kickoff checklist.', '/user/engagements');
    for a in select id from profiles where role = 'admin' and is_active loop
      perform _notify(a.id, 'billing', 'Deposit received', e.title || ' can start (' || inv.invoice_no || ').', '/admin/engagements');
    end loop;
  elsif inv.kind = 'final' then
    perform _complete_engagement(e.id);
  end if;

  perform _notify(inv.user_id, 'billing', 'Payment received', 'Invoice ' || inv.invoice_no || ' is paid. Thank you.', '/user/engagements');
  return jsonb_build_object('invoice', to_jsonb(inv), 'engagement_id', e.id, 'kind', inv.kind);
end $$;

create function public.api_admin_record_invoice_payment(p_invoice_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := _require(array['admin']);
begin
  return _pay_engagement_invoice(p_invoice_id, coalesce(nullif(p->>'method', ''), 'bank_transfer'), nullif(p->>'reference', ''));
end $$;

-- Validates that the caller may pay this invoice online; used before creating a checkout
create function public.api_invoice_for_checkout(p_invoice_id bigint) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me  profiles := _require(array['user']);
  inv engagement_invoices;
begin
  select * into inv from engagement_invoices where id = p_invoice_id and user_id = me.id;
  if inv.id is null then raise exception 'Invoice not found'; end if;
  if inv.status <> 'unpaid' then raise exception 'This invoice is not payable'; end if;
  return to_jsonb(inv) || jsonb_build_object('email', me.email,
    'title', (select title from engagements where id = inv.engagement_id));
end $$;

create function public.api_admin_invoices(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  st text := nullif(p->>'status', '');
begin
  return coalesce((
    select jsonb_agg(to_jsonb(i) || jsonb_build_object('client_name', u.full_name, 'client_email', u.email,
                                                       'engagement_title', e.title,
                                                       'days_since_issue', _qatar_today() - (i.issued_at at time zone 'Asia/Qatar')::date,
                                                       'is_overdue', i.status = 'unpaid' and i.due_date < _qatar_today())
                     order by i.issued_at desc)
    from engagement_invoices i join profiles u on u.id = i.user_id join engagements e on e.id = i.engagement_id
    where st is null or i.status = st), '[]'::jsonb);
end $$;

-- ── Step 12: follow-ups ────────────────────────────────────────────────

create function public.api_admin_followups(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  st text := nullif(p->>'status', '');
begin
  return coalesce((
    select jsonb_agg(to_jsonb(f) || jsonb_build_object('client_name', u.full_name, 'client_email', u.email, 'engagement_title', e.title)
                     order by f.due_date, f.id)
    from engagement_followups f join profiles u on u.id = f.user_id join engagements e on e.id = f.engagement_id
    where st is null or f.status = st), '[]'::jsonb);
end $$;

create function public.api_admin_update_followup(p_id bigint, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := _require(array['admin']);
  f  engagement_followups;
begin
  update engagement_followups set
    status = coalesce(nullif(p->>'status', ''), status),
    notes  = case when p ? 'notes' then p->>'notes' else notes end
  where id = p_id returning * into f;
  if f.id is null then raise exception 'Follow-up not found'; end if;
  return to_jsonb(f);
end $$;

-- ── Scheduled jobs (called hourly by the API server) ───────────────────
-- Everything is claimed once in the database, so it is safe to run often and
-- from several servers. Returns what should be emailed.

create function public._run_journey_jobs() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  today     date := _qatar_today();
  reminders jsonb := '[]'::jsonb;
  followups jsonb := '[]'::jsonb;
  nudges    jsonb := '[]'::jsonb;
  expired   int;
  r         record;
  r2        record;
begin
  -- Proposals past their validity
  update proposals set status = 'expired' where status = 'sent' and valid_until < today;
  get diagnostics expired = row_count;

  -- Step 11: unpaid invoice reminders on days 7, 14 and 15 after issue
  for r in
    select i.*, (today - (i.issued_at at time zone 'Asia/Qatar')::date) as age, u.email, u.full_name, e.title
    from engagement_invoices i join profiles u on u.id = i.user_id join engagements e on e.id = i.engagement_id
    where i.status = 'unpaid'
      and (today - (i.issued_at at time zone 'Asia/Qatar')::date) in (7, 14, 15)
      and not ((today - (i.issued_at at time zone 'Asia/Qatar')::date) = any(i.reminder_days))
    for update of i
  loop
    update engagement_invoices set reminder_days = array_append(reminder_days, r.age) where id = r.id;
    perform _notify(r.user_id, 'billing', 'Payment reminder: ' || r.invoice_no,
      r.currency || ' ' || r.amount || ' is due ' || to_char(r.due_date, 'DD Mon YYYY') || '.', '/user/engagements');
    reminders := reminders || jsonb_build_object('email', r.email, 'name', r.full_name, 'invoice_no', r.invoice_no,
      'amount', r.amount, 'currency', r.currency, 'due_date', r.due_date, 'day', r.age, 'title', r.title, 'kind', r.kind);
  end loop;

  -- Step 12: follow-ups that are due
  for r in
    select f.*, u.email, u.full_name, e.title
    from engagement_followups f join profiles u on u.id = f.user_id join engagements e on e.id = f.engagement_id
    where f.status = 'scheduled' and f.due_date <= today
    for update of f
  loop
    update engagement_followups set status = 'sent', sent_at = now() where id = r.id;
    perform _notify(r.user_id, 'case',
      case r.kind when 'referral' then 'Know someone we could help?' else 'Checking in on ' || r.title end,
      case r.kind when 'referral' then 'If a colleague is looking at the GCC, we would be glad to help them too.'
                  else 'How are things going since we delivered? Reply any time.' end, '/user/engagements');
    followups := followups || jsonb_build_object('email', r.email, 'name', r.full_name, 'kind', r.kind,
      'day', r.day_offset, 'title', r.title);
  end loop;

  -- Step 8: every Friday (Qatar time), nudge staff when an active engagement
  -- has had no status update in the last 6 days
  if extract(isodow from today) = 5 then
    for r in
      select e.*, c.id as cid
      from engagements e left join cases c on c.id = e.case_id
      where e.status in ('kickoff','in_delivery','qa')
        and (e.last_friday_nudge_on is null or e.last_friday_nudge_on < today)
        and not exists (select 1 from case_updates cu where cu.case_id = e.case_id and cu.created_at > now() - interval '6 days')
      for update of e
    loop
      update engagements set last_friday_nudge_on = today where id = r.id;
      for r2 in
        select p.id, p.email, p.full_name, p.role from profiles p
        where p.is_active and (p.role = 'admin' or p.id = (select profile_id from advisors where id = r.advisor_id))
      loop
        perform _notify(r2.id, 'case', 'Friday status update due', r.title || ' has no update this week.',
          case r2.role when 'admin' then '/admin/engagements' else '/advisor/engagements' end);
        nudges := nudges || jsonb_build_object('email', r2.email, 'name', r2.full_name, 'title', r.title, 'role', r2.role);
      end loop;
    end loop;
  end if;

  return jsonb_build_object('expired_proposals', expired, 'invoice_reminders', reminders,
                            'followups', followups, 'friday_nudges', nudges);
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
-- Pure date helpers, harmless to expose
grant execute on function public._qatar_today()                to authenticated;
grant execute on function public._add_business_days(date, int) to authenticated;

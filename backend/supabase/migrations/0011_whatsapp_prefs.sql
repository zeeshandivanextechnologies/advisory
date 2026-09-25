-- ═══════════════════════════════════════════════════════════════════════
-- WhatsApp notifications: an opt-in preference (off unless the user turns
-- it on in Settings → Notification). Messages go to profiles.phone.
-- Additive: same function as 0004 with one more known key.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.api_update_notification_prefs(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me    profiles := _require();
  known text[] := array['session_reminders','compliance_reminders','document_updates','billing_notifs','consultant_messages',
                        'whatsapp_notifs'];
  k     text;
  v     jsonb;
  prefs jsonb := me.notification_prefs;
begin
  for k, v in select key, value from jsonb_each(p) loop
    if k = any(known) and jsonb_typeof(v) = 'boolean' then
      prefs := prefs || jsonb_build_object(k, v);
    end if;
  end loop;
  -- WhatsApp needs a phone number to send to
  if jsonb_typeof(p->'whatsapp_notifs') = 'boolean' and (p->>'whatsapp_notifs')::boolean and nullif(trim(coalesce(me.phone, '')), '') is null then
    raise exception 'Add your phone number in Profile before turning on WhatsApp notifications';
  end if;
  update profiles set notification_prefs = prefs where id = me.id;
  return prefs;
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

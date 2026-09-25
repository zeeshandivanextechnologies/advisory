# Supabase backend

The app has no server of its own. Supabase provides Auth, Postgres and Storage. All business logic runs in the `api_*` Postgres functions in `migrations/` (apply the files in order), and the frontend calls them through `src/services/api.js`.

- Tables have RLS enabled and no client grants, so the browser can only use the RPC functions.
- Uploaded files go to the private `documents` storage bucket, under `<user-id>/...`.

## One-time dashboard setup

1. **Authentication → Emails → "Confirm signup" template.** The signup flow asks for a 6-digit code, so add the code to this template, e.g. `Your verification code is {{ .Token }}`.
2. **Authentication → Providers → Email.** Keep "Confirm email" enabled.
3. **Authentication → URL Configuration.** Set the Site URL to the deployed domain. Add `http://localhost:3000/**` and `https://<your-domain>/**` to Redirect URLs, because the password-reset link returns to `/auth/reset-password`.
4. **SMTP (Authentication → Emails → SMTP settings).** The built-in mailer only sends a few emails per hour, so configure your own SMTP before going live.

## Creating an admin

Register normally, then run this in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
delete from public.advisors where profile_id = (select id from public.profiles where email = 'you@example.com');
```

The `delete` line is only needed if the account was registered as an advisor.

## Advisors

New advisors start as `pending`. They are hidden from clients until an admin approves them on Admin → Advisors.

## Payments

`payment_gateway = manual` (the default) activates a plan as soon as it is purchased and records a completed payment. Before charging real customers, add a Supabase Edge Function for Stripe or Tap that holds the secret key and marks payments completed from the gateway webhook.

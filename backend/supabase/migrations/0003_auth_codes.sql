-- ═══════════════════════════════════════════════════════════════════════
-- One-time codes issued by the Express API (sent with nodemailer):
--   * 'signup' — 6-digit email verification code
--   * 'reset'  — password-reset link token
-- Only hashes are stored. Server-side only: RLS on, no client grants, and
-- no api_* function exposes this table.
-- ═══════════════════════════════════════════════════════════════════════

create table public.auth_codes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  email       text not null,
  purpose     text not null check (purpose in ('signup','reset')),
  code_hash   text not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index on public.auth_codes (email, purpose, created_at desc);

alter table public.auth_codes enable row level security;
revoke all on public.auth_codes from anon, authenticated;

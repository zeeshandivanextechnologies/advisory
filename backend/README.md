# AunAdvisory backend (Supabase)

The backend is serverless. Supabase provides Postgres, Auth and Storage. All business logic lives in `api_*` Postgres functions, and the React app calls them through `src/services/api.js`.

```
backend/
├── package.json              npm scripts wrapping the Supabase CLI
└── supabase/
    ├── config.toml           local stack config (auth, email, storage, ports)
    ├── migrations/           schema + api_* functions, applied in order
    │   ├── 0001_init.sql
    │   └── 0002_client_journey.sql
    ├── templates/            auth emails (6-digit signup code, password reset)
    └── seed.sql              local-only test data
```

## Security model
- Tables have RLS enabled and no grants for `anon`/`authenticated`, so the browser can only call the `api_*` functions.
- Each function checks the caller's login, role and ownership itself. `_*` functions are internal and cannot be called by clients.
- Uploaded files go to the private `documents` storage bucket, under `<user-id>/...`.

## Run locally
Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be running.

```bash
cd backend
npm install
npm start          # starts Postgres, Auth, Storage, Studio; applies migrations + seed
npm run status     # prints the local API URL and publishable/anon key
```

Point the React app at the local stack by creating `.env.local` in the project root. It overrides `.env` during `npm start`.

```
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_PUBLISHABLE_KEY=<publishable key from npm run status>
```

Restart the React dev server after changing env files.

Useful local URLs:
- **Studio** (tables, SQL editor): http://127.0.0.1:54323
- **Mailpit** (all auth emails, including OTP codes, land here): http://127.0.0.1:54324

Other scripts:
- `npm run reset` wipes the local database and re-applies all migrations and the seed.
- `npm run new-migration <name>` creates a new migration file. Never edit a migration that has already been applied to production; add a new one instead.
- `npm stop` stops the local stack.

## Deploying to the hosted project
Hosted project ref: `dtiyvsaugifxgvekuiuv`.

```bash
npm run link                # asks for the database password
npm run migrations:remote   # compare local vs remote migrations
npm run push                # apply new migrations to production
```

`0001` and `0002` were applied to production by hand before this folder existed. After linking, mark them as applied once so `push` doesn't try to re-run them:

```bash
npx supabase migration repair --status applied 0001 0002 --linked
```

### One-time hosted dashboard setup
`config.toml` only affects the local stack. On the hosted project, set these in the dashboard:
1. **Authentication → Emails → "Confirm signup":** include `{{ .Token }}`. You can copy `templates/confirmation.html`.
2. **Authentication → Providers → Email:** keep "Confirm email" enabled.
3. **Authentication → URL Configuration:** set the Site URL to the live domain. Add `http://localhost:3000/**` and `https://<your-domain>/**` to Redirect URLs.
4. **SMTP:** configure your own provider before going live. The built-in mailer is heavily rate-limited.

## Creating an admin
Register normally, then run this in the SQL editor (Studio locally, or the dashboard):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
delete from public.advisors where profile_id = (select id from public.profiles where email = 'you@example.com');
```

The `delete` is only needed if the account registered as an advisor.

## Notes
- New advisors start as `pending` and are hidden from clients until an admin approves them.
- `payment_gateway = manual` activates plans immediately. Add a Stripe/Tap Edge Function (`supabase/functions/`) before charging real customers.

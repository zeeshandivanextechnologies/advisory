# AunAdvisory backend

The backend has two parts:

1. **Express REST API** (`src/`). This is a Node.js server exposing `/api/...` endpoints: auth, users, advisors, cases, documents, admin and so on.
2. **Database layer** (`supabase/`). This holds the Postgres schema and the `api_*` SQL functions that contain the business rules and permission checks.

The React app can use either backend. Choose with `REACT_APP_BACKEND` in the root `.env`:

| `REACT_APP_BACKEND` | Frontend talks to | Frontend file |
|---|---|---|
| `supabase` (default) | Supabase directly (serverless) | `src/services/api.supabase.js` |
| `express` | This Express server | `src/services/api.rest.js` |

Both paths run the same SQL functions, so behaviour and permissions are identical.

```
backend/
├── .env.example              copy to .env and fill in
├── package.json
├── src/
│   ├── index.js              starts the server
│   ├── app.js                express app, CORS, JSON, error handling
│   ├── config/
│   │   ├── env.js            reads and validates .env
│   │   ├── db.js             Postgres pool + rpc() helper (runs api_* as the user)
│   │   └── supabase.js       Supabase Auth/Storage clients
│   ├── middleware/
│   │   ├── auth.js           JWT sign/verify (requireAuth)
│   │   └── errorHandler.js   maps errors → { success:false, message } + status
│   ├── controllers/          one file per area (auth, users, advisors, cases, documents, admin, misc)
│   ├── routes/index.js       every endpoint
│   └── utils/
└── supabase/
    ├── config.toml           local Supabase stack config
    ├── migrations/           schema + api_* functions, applied in order
    │   ├── 0001_init.sql
    │   └── 0002_client_journey.sql
    ├── templates/            auth emails (6-digit signup code, password reset)
    └── seed.sql
```

## Run the Express API

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values (already done on this machine)
npm run dev               # http://localhost:5000/api, restarts on file changes
```

Then set this in the root `.env` and restart the React dev server:

```
REACT_APP_BACKEND=express
REACT_APP_API_URL=http://localhost:5000/api
```

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `FRONTEND_URL` | Used in email links (password reset, signup redirect) |
| `CORS_ORIGINS` | Comma-separated origins allowed to call the API |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Signing key and lifetime for this API's login tokens |
| `DATABASE_URL` | Supabase Postgres connection string |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Supabase Auth (signup, OTP, login) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used for file storage and password changes. Never put it in the frontend |

### Endpoints (all under `/api`)
Every response is `{ success, data }` (lists add `meta`) or `{ success:false, message }`. Protected endpoints need `Authorization: Bearer <token>`.

- **Public:**
  - `GET /health`
  - `GET /settings`
  - `GET /subscriptions/plans`
  - `POST /contact`
- **Auth:**
  - `POST /auth/login`, `/auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/forgot-password`, `/auth/reset-password`
  - `GET /auth/me`
  - `PUT /auth/change-password`
- **Users:**
  - `GET /users/dashboard`
  - `GET|PUT /users/profile`
  - `GET|POST /users/consultations`
  - `PUT /users/consultations/:id`
  - `GET /users/consultations/:id/join`
- **Advisors:**
  - `GET /advisors`
  - `GET /advisors/dashboard`
  - `GET|PUT /advisors/profile`
- **Cases:**
  - `GET|POST /cases`
  - `GET|PUT /cases/:id`
  - `POST /cases/:id/milestones`, `PUT /cases/:id/milestones/:itemId`, `DELETE /milestones/:itemId`
  - `POST /cases/:id/checklist`, `PUT /cases/:id/checklist/:itemId`, `DELETE /checklist/:itemId`
  - `POST /cases/:id/updates`
- **Documents:**
  - `GET /documents`
  - `POST /documents` (multipart: `file`, `category`, `jurisdiction`, `case_id`)
  - `GET /documents/:id/download`
  - `PUT /documents/:id/review`
  - `DELETE /documents/:id`
- **Notifications:**
  - `GET /notifications`
  - `POST /notifications/read`
- **Intake:**
  - `GET|PUT /intake`
  - `GET /intake/:userId`
- **Subscriptions:**
  - `GET /subscriptions/my-subscription`
  - `POST /subscriptions/purchase`
  - `GET|POST /subscriptions/admin/plans`
  - `PUT|DELETE /subscriptions/admin/plans/:id`
  - `GET /payments`
- **Admin:**
  - `GET /admin/dashboard`
  - `GET /admin/users`, `PUT /admin/users/:id/toggle`
  - `GET /admin/advisors`, `PUT /admin/advisors/:id/status`
  - `GET /admin/revenue`
  - `GET|PUT /admin/settings`
  - `GET /admin/leads`, `PUT /admin/leads/:id`

### How a request flows
`route → controller → rpc('api_xxx', args, userId)`. The `rpc()` helper in `config/db.js` runs the SQL function inside a transaction as role `authenticated` with the user's id. This is exactly how Supabase runs it, so the SQL function does the role, ownership and validation checks. Its error messages become the HTTP error response.

## Security model
- Tables have RLS enabled and no grants for `anon`/`authenticated`, so the browser can only call the `api_*` functions.
- Each function checks the caller's login, role and ownership itself. `_*` functions are internal and cannot be called by clients.
- Uploaded files go to the private `documents` storage bucket, under `<user-id>/...`.

## Run the database locally (optional)
By default both backends use the hosted Supabase project. To run Postgres/Auth/Storage on your machine instead:

Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be running.

```bash
cd backend
npm install
npm run db:start   # starts Postgres, Auth, Storage, Studio; applies migrations + seed
npm run db:status  # prints the local API URL and publishable/anon key
```

Point the React app at the local stack by creating `.env.local` in the project root; it overrides `.env` during `npm start`. For the Express API, also set `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, `SUPABASE_URL=http://127.0.0.1:54321` and the local keys in `backend/.env`.

```
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_PUBLISHABLE_KEY=<publishable key from npm run db:status>
```

Restart the React dev server after changing env files.

Useful local URLs:
- **Studio** (tables, SQL editor): http://127.0.0.1:54323
- **Mailpit** (all auth emails, including OTP codes, land here): http://127.0.0.1:54324

Other scripts:
- `npm run db:reset` wipes the local database and re-applies all migrations and the seed.
- `npm run db:new-migration <name>` creates a new migration file. Never edit a migration that has already been applied to production; add a new one instead.
- `npm run db:stop` stops the local stack.

## Deploying to the hosted project
Hosted project ref: `dtiyvsaugifxgvekuiuv`.

```bash
npm run db:link             # asks for the database password
npm run db:remote           # compare local vs remote migrations
npm run db:push             # apply new migrations to production
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

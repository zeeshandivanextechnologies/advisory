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
│   ├── services/             mailer, email templates, auth codes, payments (Stripe), reminders, prefs
│   ├── routes/index.js       every endpoint
│   └── utils/
└── supabase/
    ├── config.toml           local Supabase stack config
    ├── migrations/           schema + api_* functions, applied in order
    │   ├── 0001_init.sql
    │   ├── 0002_client_journey.sql
    │   ├── 0003_auth_codes.sql
    │   ├── 0004_pending_features.sql
    │   ├── 0005_services_catalog.sql
    │   └── 0006_client_journey_engagements.sql
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
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used for account creation, file storage and password changes. Never put it in the frontend |
| `SMTP_*`, `MAIL_FROM`, `APP_NAME`, `ADMIN_EMAIL` | Outgoing email (see below) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Online plan payments when the gateway is Stripe (see below) |
| `SESSION_REMINDERS` | `false` turns off the 30-minute session reminder job |

### Email (nodemailer)
In Express mode the API sends every email itself over SMTP.

| Email | When |
|---|---|
| 6-digit signup code | Register, or resend code. Expires in 10 min, allows 5 attempts, 60 s cooldown and at most 5 per hour |
| Password-reset link | `/auth/reset-password?token=…` on forgot password. Expires in 60 min and works once |
| Password changed | After a reset or a change |
| Booking confirmation | To the client, plus an alert to the advisor |
| Payment receipt | After a plan purchase |
| Contact auto-reply | To the sender. A copy goes to `ADMIN_EMAIL` if it is set |

- Codes and tokens are stored only as hashes, in `public.auth_codes` (migration `0003`).
- **If `SMTP_HOST` is empty, emails are printed in the server console** instead, which is handy for local testing.
- For Gmail, turn on 2-Step Verification, create an App Password, and set:
  ```
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=465
  SMTP_SECURE=true
  SMTP_USER=you@gmail.com
  SMTP_PASS=<app password>
  MAIL_FROM="AunAdvisory <you@gmail.com>"
  ```

### Notification preferences
Users manage these under Settings → Notifications (`GET|PUT /users/notification-prefs`). A missing key means the notification is on. Account emails (codes, resets, security alerts) and booking confirmations are always sent.

| Key | Controls |
|---|---|
| `session_reminders` | Reminder email 30 minutes before a session. The in-app reminder is always created |
| `document_updates` | Email when a document is approved or rejected |
| `billing_notifs` | Payment receipts |
| `consultant_messages` | Case status updates, and session notes / action items |
| `compliance_reminders` | Saved for later; there are no compliance deadlines yet |

### Payments
Admin → Settings → Payment gateway decides how plans are paid.

- **manual** (default): the plan activates immediately.
- **stripe**:
  1. `POST /subscriptions/purchase` creates a *pending* payment and returns `redirect_url` to Stripe Checkout.
  2. After the customer pays, Stripe calls `POST /payments/stripe/webhook`, and the return page calls `GET /payments/stripe/confirm`. Either one activates the plan; activation is idempotent.
  3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. To test locally, run `stripe listen --forward-to localhost:5000/api/payments/stripe/webhook`.
- **tap**: not supported yet. Purchases return a clear error.

Online payments need the Express backend. In Supabase-only mode, only `manual` works.

### Maintenance mode
When Admin → Settings → Maintenance Mode is on:
- Every non-admin API call returns `503`, including login.
- Admins and public endpoints (settings, plans, contact) keep working.

### Services, retainers and community (migration `0005`)
- **Catalog:** 5 categories (Decision, Preparation, Execution, Relationships, Retention). Each offering has a summary, pricing (fixed, starting at, range, monthly, membership or on request), what is in scope, deliverables, what is out of scope, best fit and timeline. Admins edit or hide offerings under Admin → Services. Offerings are never deleted.
- **Requests:** a client requests an offering, gets an in-app notification and an email, and the admin moves it through new → in review → proposal sent → won or declined. Only one open request per offering is allowed.
- **Executive Advisory Retainer:**
  - Hours per month (default 4) and a minimum term (default 3 months). The end date cannot be earlier than the minimum term allows.
  - The admin or the assigned advisor logs time. Each calendar month is capped at its allotment, and unused hours never roll over.
- **Community:**
  - Integra Innovators and Gold memberships are invite-only; the member accepts the invitation.
  - Events can be for everyone, members only or Gold members only, with RSVP and an optional capacity.
  - Monthly Market Briefs can go to everyone, retainer clients or members. Publishing one notifies that audience.

### Client journey (migration `0006`)
| Step | What happens |
|---|---|
| 1 Lead | The contact form stores a lead with its source. Admins manage leads under Admin → Leads |
| 2 Auto-reply | Sent immediately, with a link to the intake form. WhatsApp is not included; it needs a WhatsApp Business API account |
| 3 Intake | The client fills in `/user/intake`. Admins see it on the service request |
| 4 Discovery call | 45-minute session type. The advisor records go / no-go / nurture / refer and the next step (Schedule → Outcome) |
| 5 Proposal/SOW | Admin → Engagements → Proposals: scope, deliverables, boundaries, timeline, price, deposit % and terms. Validity must be 15–30 days |
| 6 Contract + deposit | The client signs by typing their name and ticking "agree". This creates a deposit invoice due in 5 business days. No work starts before the deposit is paid |
| 7 Kickoff | Paying the deposit creates the case workspace (5 phases and a kickoff checklist), seeds the 7-point QA list and emails the welcome packet |
| 8 Delivery | Kanban phases and status updates live in the workspace. On Fridays, staff are nudged if an engagement had no update that week |
| 9 QA | Delivery is blocked until every QA item is ticked. A warning shows if QA finished less than 24 hours earlier |
| 10 Handover | Recording link, action items and notes are saved on the consultation, and the client gets an email |
| 11 Final invoice | Issued when delivery is marked done. Reminders go out on days 7, 14 and 15 |
| 12 Follow-ups | Scheduled when the final payment lands: day 7, 30, 60, 90 (referral ask) and 180. Admins log the outcome |

- Invoices are paid either by the admin recording a payment or online through Stripe, when the gateway is Stripe.
- Every payment is also written to `payments`, so Revenue includes it.
- Jobs run hourly. Set `JOURNEY_JOBS=false` to turn them off.

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
- **Services & retainers:**
  - `GET /services/catalog` (public)
  - `GET|POST /services/requests`, `PUT /services/requests/:id/cancel`
  - `GET /retainers`, `GET /retainers/:id`, `POST /retainers/:id/logs`, `DELETE /retainer-logs/:logId`
- **Community:**
  - `GET /community/memberships`, `PUT /community/memberships/:id/respond`
  - `GET /community/events`, `PUT /community/events/:id/rsvp`
  - `GET /community/briefs`
- **Admin:**
  - `GET /admin/dashboard`
  - `GET /admin/users`, `PUT /admin/users/:id/toggle`
  - `GET /admin/advisors`, `PUT /admin/advisors/:id/status`
  - `GET /admin/revenue`
  - `GET|PUT /admin/settings`
  - `GET /admin/leads`, `PUT /admin/leads/:id`
  - `GET|POST /admin/services/offerings`, `PUT /admin/services/offerings/:id`
  - `GET /admin/services/requests`, `PUT /admin/services/requests/:id`
  - `POST /admin/retainers`, `PUT /admin/retainers/:id`
  - `GET|POST /admin/community/memberships`, `PUT /admin/community/memberships/:id`
  - `GET|POST /admin/community/events`, `PUT|DELETE /admin/community/events/:id`
  - `POST /admin/community/briefs`, `PUT|DELETE /admin/community/briefs/:id`

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

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
    │   ├── 0006_client_journey_engagements.sql
    │   ├── 0007_sales_rules.sql
    │   ├── 0008_staffing_ai.sql
    │   ├── 0009_deliverable_qa.sql
    │   ├── 0010_partners.sql
    │   └── 0011_whatsapp_prefs.sql
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
| `ANTHROPIC_API_KEY`, `AI_MODEL` | AI drafting with Claude (default model `claude-opus-5`). Server-side only; leave the key empty to disable AI |

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
| `whatsapp_notifs` | **Opt-in, off by default.** WhatsApp copies of session reminders, proposals, invoices, invoice reminders, released deliverables and referral consent requests. Needs a phone number in the profile |

### WhatsApp (Meta WhatsApp Cloud API)
WhatsApp messages go out next to the matching emails, only to users who switched on *WhatsApp notifications* and saved a phone number. Numbers saved without a country code get `WHATSAPP_DEFAULT_COUNTRY_CODE` (974). Without `WHATSAPP_TOKEN`, messages are printed to the console, the same way emails are in development.

Setup:
1. In Meta for Developers, create an app with the WhatsApp product. Add and verify your business phone number.
2. Set `WHATSAPP_PHONE_NUMBER_ID` (WhatsApp → API Setup). Set `WHATSAPP_TOKEN` to a **permanent System User token** with `whatsapp_business_messaging`. The temporary 24-hour token is only for testing.
3. In WhatsApp Manager → Message templates, create these templates (category **Utility**, language English `en`). The names must match; to use other names, set `WHATSAPP_TPL_<NAME>`, e.g. `WHATSAPP_TPL_INVOICE_ISSUED=my_invoice`.

| Template name | Body (variables in this order) |
|---|---|
| `session_reminder` | Hi {{1}}, your session with {{2}} starts at {{3}}. Join from your dashboard. |
| `proposal_sent` | Hi {{1}}, your proposal for {{2}} is ready and valid until {{3}}. Review it in your dashboard. |
| `invoice_issued` | Hi {{1}}, invoice {{2}} for {{3}} has been issued and is due on {{4}}. |
| `invoice_reminder` | Hi {{1}}, a reminder that invoice {{2}} for {{3}} is due on {{4}}. |
| `deliverable_released` | Hi {{1}}, your deliverable "{{2}}" for {{3}} has passed our quality check and is ready. |
| `referral_consent` | Hi {{1}}, we would like to introduce you to {{2}}. Please give or decline consent in your dashboard. |

A failed WhatsApp send is logged and never affects the request or the email.

### Payments
Admin → Settings → Payment gateway decides how plans are paid.

- **manual** (default): the plan activates immediately.
- **stripe**:
  1. `POST /subscriptions/purchase` creates a *pending* payment and returns `redirect_url` to Stripe Checkout.
  2. After the customer pays, Stripe calls `POST /payments/stripe/webhook`, and the return page calls `GET /payments/stripe/confirm`. Either one activates the plan; activation is idempotent.
  3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. To test locally, run `stripe listen --forward-to localhost:5000/api/payments/stripe/webhook`.
- **tap** (Tap Payments: cards, Apple Pay, NAPS / Benefit / KNET / mada where enabled on your account):
  1. `POST /subscriptions/purchase` creates a *pending* payment, opens a Tap charge (`source: src_all`) and returns `redirect_url` to the Tap payment page.
  2. Tap sends the customer back to `/user/plans?checkout=success&tap_id=chg_…`, and the page calls `GET /payments/tap/confirm`. If `API_PUBLIC_URL` is set, Tap also calls `POST /payments/tap/webhook`.
  3. In both cases the charge is **re-fetched from the Tap API**. Only `CAPTURED` activates the plan. Declined, cancelled and abandoned charges mark the payment failed. The webhook payload is never trusted.
  4. Set `TAP_SECRET_KEY` (`sk_test_…` for testing, `sk_live_…` live) and `API_PUBLIC_URL`.

Engagement invoices (deposit / final) are paid the same way with either gateway, from the client's Engagements page.

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

### Sales rules (migration `0007`)
All limits are in Admin → Settings → Sales Rules and are enforced by the database when a client books.

- **Free calls:** one free discovery call (`sales_free_calls`) until the client has a paid pathway (a paid invoice, a retainer or an accepted proposal). A **strategic** prospect with a recorded *defined deal* gets one extra relationship call.
- **Pre-close meetings:** at most three meetings (`sales_max_premeetings`) before a proposal is sent. **Government**, **embassy** and **anchor-referral partners** are exempt. Set the prospect type on a service request.
- **Proposal shelf life:** 15–30 days (`proposal_valid_min_days` / `proposal_valid_max_days`). An expired proposal moves its request to **nurture** for `sales_nurture_months` (6); after that the request closes automatically. Leads in nurture work the same way.
- **Fit discipline:** a request for a project offering records a budget range and a documents commitment. It is flagged when the budget is below `sales_min_project_budget` ($5,000) or documents can't be committed, and the admin can **Move to Nurture** or **Refer Out**.

### Staffing & AI (migration `0008`)
- **Team directory (Admin → Team):** Founder / Principal, Advisor, Financial specialist, Legal / regulatory professional, Virtual assistant and Content contractor, each with a cost model and rate.
  - Founders join every engagement automatically.
  - Engagements show staff cost and margin, and recommend a financial specialist for the Market Entry Blueprint and larger engagements.
- **Team logins:** a registered account can be given limited admin access as `virtual_assistant` (leads, requests & intake, follow-ups, events) or `content_contractor` (market briefs, events).
  - `_require` enforces the scope in the database from the calling `api_*` function, so it holds in both backends.
  - The sidebar, tabs and routes follow the same scope.
- **AI drafts (Express only):** these need `ANTHROPIC_API_KEY`.
  - Proposal / SOW first draft, lead triage and reply draft, Monthly Market Brief research (with web search and sources), a 12-month financial-model scaffold, and checklist suggestions.
  - Every result is labelled as a draft for human review and logged in `ai_drafts`.
  - Requests use `claude-opus-5` with adaptive thinking, and use the server-side refusal fallback (`fallbacks: "default"`).

### Deliverable QA (migration `0009`)
No deliverable reaches a client without the QA checklist and an approval. The flow is **draft → in QA → approved → released**; changes requested returns it to the author.

1. Staff (an admin or the assigned advisor) add a deliverable to an engagement, as a file, a link, or both.
2. Submitting it seeds the document's 7-point QA checklist. The checklist is reset on every resubmission.
3. Approval needs every item ticked, and must come from a **full admin or a founder**. The author cannot approve their own work unless they are a founder.
4. Releasing it notifies and emails the client. Clients only ever see released deliverables and can download them. Storage access for clients is also limited to released files.
5. A warning shows when QA finished less than 24 hours before release.

The engagement-level "final delivery" QA gate from migration `0006` still applies.

### Law firm / partner MOU workflow (migration `0010`)
This is the admin **Partners** page, for full admins only. Limited team logins cannot open it.

1. **Priority partners**: law firms and licensed professionals with Qatar/GCC business-setup experience. The page tracks the target of six priority partners that are active with a signed MOU.
2. **Partner profile**: specialties, jurisdictions, languages, response time, pricing, referral policy and conflicts.
3. **MOU before any client is sent**. A MOU can only be marked signed when it covers referral fees, confidentiality, client ownership, service boundaries and a response expectation (in hours). Signing activates the partner. A partner cannot be made active, or receive a referral, without a signed MOU that has not expired. Expired MOUs are closed by the hourly job.
4. **Referral handoff form**. Every introduction records a purpose (required), what will be shared, and the client's consent:
   - **In-app consent**: the client is notified and emailed, then consents or declines under *Services → Introductions to Licensed Partners*.
   - **Consent obtained outside the app** (email, written, verbal): the admin must confirm it and note how it was given.

   An introduction can only be marked as made after consent. A linked service request moves to `referred`. The flow is: introduced → partner responded (response time measured against the MOU) → completed (outcome, client rating, referral fee).
5. **Quarterly review**. Each quarter shows every partner's referrals, average response time, late responses, client rating and fees. The admin then scores responsiveness, quality, client feedback and reputational risk, and decides:
   - **keep**
   - **watch**: pauses new referrals
   - **remove**: needs a reason; the partner is removed and blocked from referrals

   Admins are notified once when a new quarter's reviews are due.

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

## Deploying to production
Payments, emails, WhatsApp, session reminders and the hourly jobs all run in the Express API. So the live site should use the Express backend, with the database staying on Supabase.

**1. Deploy the API.** `render.yaml` at the repo root is a Render Blueprint (Dashboard → New → Blueprint). Any Node 20+ host works: Railway, a VPS with pm2, etc. Settings: root `backend`, build `npm ci --omit=dev`, start `npm start`, health check `/api/health`.
- Use an always-on instance. Free instances sleep, and reminders / jobs stop while they sleep.
- `DATABASE_URL`: use Supabase → Connect → **Session pooler**. The direct `db.<ref>.supabase.co` host is IPv6-only, and most hosts can't reach it.
- Set `FRONTEND_URL` and `CORS_ORIGINS` to the live site URL, and `API_PUBLIC_URL` to the API's own URL.
- Copy the other values from `backend/.env`: Supabase keys, SMTP, Stripe/Tap, WhatsApp. Use a new random `JWT_SECRET` in production.

**2. Point the live frontend at it.** In `.env.production`, set these two lines, then rebuild and deploy the frontend:
```
REACT_APP_BACKEND=express
REACT_APP_API_URL=https://<your-api-host>/api
```
Keep `REACT_APP_BACKEND=supabase` until the API is live. Switching earlier makes the live site call a server that doesn't exist.

**3. Payment webhooks.**
- Stripe: Developers → Webhooks, endpoint `https://<api>/api/payments/stripe/webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
- Tap: nothing to register. The webhook URL is sent with each charge, from `API_PUBLIC_URL`.

Then choose the gateway in Admin → Settings → Payment Gateway.

## Deploying database migrations
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
`config.toml` only affects the local stack. On the hosted project, set these in the dashboard. They are required while the live site runs in Supabase mode, where Supabase sends the signup codes and reset links. They are still recommended with the Express backend.
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
- `payment_gateway = manual` activates plans immediately. Switch to Stripe or Tap (Express backend) before charging real customers.

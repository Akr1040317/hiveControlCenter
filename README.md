## Hive Control Center

Secure admin center for Hive, deployed separately from the main website and
designed for `admin.hivewebsite.com`.

Current implementation baseline:
- Next.js App Router + TypeScript + Tailwind
- Firebase Google sign-in
- Server-verified allowlist session creation
- Protected route group for admin modules
- RBAC and audit-log scaffolding
- CSRF token validation + rate limiting for mutating routes
- Automation runbook catalog + dry-run job API
- Firestore-backed dashboard metrics and platform-user lookup
- Content Management module shell (Word of Day, articles, lessons, videos, webinars, quizzes, tracks)
- Tools Center script inventory from `hivewebsite/scripts` and `hiveTools`

## Run locally

1. Copy env values:

```bash
cp .env.example .env.local
```

2. Fill in Firebase Admin credentials in `.env.local`:
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
   - `FIREBASE_ADMIN_STORAGE_BUCKET`
  - `STRIPE_SECRET_KEY` (required for Stripe revenue/health on dashboard)
  - `STRIPE_WEBHOOK_SECRET` (for webhook verification + webhook health readiness)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`
   - `ADMIN_CENTER_AUTOMATION_ENABLED=true` (set `false` to pause live executions)
   - Keep `FIREBASE_ADMIN_PROJECT_ID=beeapp-5c98b` to match `hivewebsite`.

3. Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

- `/sign-in` - Google Firebase sign-in
- `/dashboard` - executive control center shell
- `/content-management` - content control modules
- `/tools-center` - scripts and tooling catalog
- `/users`, `/campaigns`, `/automation`, `/settings` - admin modules
- `/api/auth/session` - verifies Firebase ID token, enforces allowlist, sets
  secure cookie
- `/api/auth/csrf` - issues CSRF token for authenticated mutations
- `/api/automation/inputs/upload` - upload CSV/PDF/TXT inputs for runbooks
- `/api/users/search` - admin user lookup from Firestore `adminUsers`
- `/api/users/platform-search` - lookup users from main `users` collection
- `/api/users/platform-update` - audited single-user role/status/tier update
- `/api/users/platform-bulk-update` - audited bulk role/status/tier updates
- `/api/users/grant-access` - audited admin role/status grant/update endpoint
- `/api/campaigns/history` - campaign run history from automation jobs
- `/api/campaigns/send` - create campaign send/dry-run runbook jobs
- `/api/campaigns/templates` - campaign template catalog
- `/api/campaigns/templates/[templateKey]/preview` - template preview payload
- `/api/integrations/stripe/health` - Stripe connectivity status for billing admins
- `/api/commerce/stripe/customer-lookup` - search Stripe customers by email/id/name
- `/api/commerce/stripe/sync-check` - compare app billing fields vs Stripe truth
- `/api/commerce/stripe/payment-failures` - list recent failed payment intents
- `/api/commerce/stripe/webhook-health` - webhook telemetry summary from Firestore
- `/api/commerce/stripe/resync` - one-click user billing resync from Stripe (audited)
- `/api/content/modules` - content management module definitions
- `/api/tools/scripts` - script inventory from hivewebsite + hiveTools mapping
- `/api/automation/jobs` - dry-run-first runbook execution scaffold
- `/api/automation/jobs/[jobId]` - job detail endpoint
- `/api/automation/jobs/[jobId]/approve` - approve job with reason
- `/api/automation/jobs/[jobId]/cancel` - cancel job with reason

## Deploy to Vercel

1. Create a new Vercel project pointing to this repository.
2. Add the environment variables from `.env.example` for each environment.
3. Add production domain `admin.hivewebsite.com`.
4. Keep `ADMIN_CENTER_READ_ONLY_MODE=true` for initial launch safety.

## Next implementation steps

- Integrate script wrappers for campaign and Bee Ready operations
- Add tests for sign-in allowlist and protected API access

## Notes

This control center is intentionally separate from `hivewebsite` and uses the
same Firebase project (`beeapp-5c98b`) for authentication and data access.
The scripts in `hiveTools` also target this same Firebase project via service
account credentials.

Manual runbook inputs:
- Campaign and pronunciation runbooks support manual values and uploaded
  documents (`.csv`, `.pdf`, `.txt`) via `automationInputs` records.
- Uploads are stored in Firebase Storage and parsed values are persisted in
  Firestore for repeatable, auditable execution on Vercel.

## Hive Control Center

Secure admin center for Hive, deployed separately from the main website and
designed for `admin.hivewebsite.com`.

Current implementation baseline:
- Next.js App Router + TypeScript + Tailwind
- Firebase Google sign-in
- Server-verified allowlist session creation
- Protected route group for admin modules
- RBAC and audit-log scaffolding
- Automation runbook catalog + dry-run job API

## Run locally

1. Copy env values:

```bash
cp .env.example .env.local
```

2. Fill in Firebase Admin credentials in `.env.local`:
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
   - Keep `FIREBASE_ADMIN_PROJECT_ID=beeapp-5c98b` to match `hivewebsite`.

3. Start development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Key routes

- `/sign-in` - Google Firebase sign-in
- `/dashboard` - executive control center shell
- `/users`, `/campaigns`, `/automation`, `/settings` - module placeholders
- `/api/auth/session` - verifies Firebase ID token, enforces allowlist, sets
  secure cookie
- `/api/users/search` - admin user lookup from Firestore `adminUsers`
- `/api/users/grant-access` - audited admin role/status grant/update endpoint
- `/api/automation/jobs` - dry-run-first runbook execution scaffold

## Deploy to Vercel

1. Create a new Vercel project pointing to this repository.
2. Add the environment variables from `.env.example` for each environment.
3. Add production domain `admin.hivewebsite.com`.
4. Keep `ADMIN_CENTER_READ_ONLY_MODE=true` for initial launch safety.

## Next implementation steps

- Wire dashboard metrics to Firestore + Stripe sources
- Port Users & Access admin workflows from `hivewebsite`
- Add mutating APIs with mandatory audit logging
- Integrate script wrappers for campaign and Bee Ready operations
- Add tests for sign-in allowlist and protected API access

## Notes

This control center is intentionally separate from `hivewebsite` and uses the
same Firebase project (`beeapp-5c98b`) for authentication and data access.
The scripts in `hiveTools` also target this same Firebase project via service
account credentials.

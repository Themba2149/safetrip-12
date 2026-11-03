# SafeTrip Driver Portal

The customer-facing SafeTrip web portal is for drivers. It includes a public product landing page, driver account access, a dashboard, Trip Advisor, a rewards wallet, driver profile management, and a seven-step application-for-cover journey.

The insurer workflow belongs to the separate SafeTrip business portal. Completing an application does not activate insurance; the insurer must verify the details and make an underwriting decision.

## Run locally

Use Node.js 22.18 or newer and install the project dependencies:

```sh
npm install
npm run dev
```

Create `.env.local` with the Supabase project URL and browser anon key:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never put a Supabase service-role key in the browser app. Authentication, profile, rewards, and onboarding data access must be protected by Supabase Row Level Security. The onboarding flow also expects the `driver_applications` and `application_documents` tables and a private `driver-documents` storage bucket with owner-only policies.

The onboarding document step is still a prototype: use sample or blurred documents, not real identity documents.

## Checks

```sh
npm run build
npm run lint
node --test src/**/*.test.ts
```

The Android and iPhone app links are intentionally marked “coming soon” on the landing page until the mobile builds are published.

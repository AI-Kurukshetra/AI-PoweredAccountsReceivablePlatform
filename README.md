## InvoicedOS

Fresh Next.js codebase for the AI-powered accounts receivable and invoice management platform described in `invoiced_blueprint_20260310_143504.pdf`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase-ready client/server helpers
- React Hook Form + Zod ready for future form flows

## Getting Started

1. Install dependencies.
2. Copy `.env.example` to `.env.local`.
3. Fill in your Supabase project values.
4. In Supabase, set your auth site URL / redirect URL to include `http://localhost:3000/auth/confirm`.
5. Run the development server.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current MVP Surface

- Marketing landing page aligned to the invoice blueprint
- Workspace pages for dashboard, invoices, deliveries, customers, payments, gateways, collections, analytics, templates, portal, documents, integrations, recovery, compliance, and access
- Mock finance data shaped for invoice and AR workflows
- Supabase browser/server helper files for the next integration step
- Email/password auth with protected workspace routes and sign-out
- Confirmation callback route for Supabase email verification
- Public customer portal route backed by per-customer portal tokens
- Template, integration, and document records persisted in Supabase
- Delivery tracking, gateway accounts, recovery snapshots, and compliance controls persisted in Supabase
- Automated invoice schedules, reminder policies, credit alerts, and integration sync run tracking

## Next Build Steps

- Apply the SQL migration in `supabase/migrations`
- Create your first company onboarding flow and membership assignment
- Replace gateway readiness records with live payment collection flows
- Replace placeholder storage paths with actual Supabase Storage uploads
- Add outbound delivery jobs, ERP sync jobs, and scheduled restore drills

## Commands

```bash
npm run dev
npm run lint
```

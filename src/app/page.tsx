import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  BellRing,
  BrainCircuit,
  ChartNoAxesCombined,
  CheckCircle2,
  DatabaseZap,
  FileDigit,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { getMembershipContext } from "@/lib/company";
import { productModules, summaryMetrics } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

const featureCards = [
  {
    icon: FileDigit,
    title: "Automated invoice generation",
    copy: "Recurring schedules, contract milestones, and branded templates stay in one delivery workflow.",
  },
  {
    icon: BellRing,
    title: "Multi-channel invoice delivery",
    copy: "Email, SMS, portal, and postal delivery queues now track recipient, confirmation, and failure state.",
  },
  {
    icon: BadgeDollarSign,
    title: "Gateway-backed payment collection",
    copy: "Gateway accounts now cover card, ACH, wire, and wallet rails with checkout and webhook readiness captured in the workspace.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Cash flow forecasting",
    copy: "Aging, likely receipts, and risk-weighted forecasts surface where cash is slipping.",
  },
  {
    icon: Workflow,
    title: "ERP and webhook operations",
    copy: "Connection records now track accounting, payment, and webhook integrations instead of leaving those modules as future-only placeholders.",
  },
  {
    icon: ShieldCheck,
    title: "Recovery and compliance controls",
    copy: "Backup snapshots, restore tests, and SOC 2 or PCI control records now have dedicated modules instead of living outside the product.",
  },
];

const buildPhases = [
  "Phase 1 live: auth, companies, customers, invoices, line items, payments, reminders, dashboard analytics, and dispute queues.",
  "Phase 2 live: templates, portal access, document registry, multi-channel delivery, payment gateways, recovery snapshots, compliance controls, and role-based access.",
  "Phase 3 next: deeper live sync jobs, predictive collections, and multi-currency support.",
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const membership = user ? await getMembershipContext() : null;
  const workspaceHref = membership ? "/dashboard" : "/onboarding";

  return (
    <div className="app-shell min-h-screen">
      <MarketingNavbar
        isAuthenticated={Boolean(user)}
        workspaceHref={workspaceHref}
      />

      <main>
        <section
          id="platform"
          className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 lg:px-8"
        >
          <div className="grid-faint absolute inset-x-0 top-0 h-[560px] opacity-40" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="pt-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(141,128,102,0.24)] bg-[rgba(255,255,255,0.45)] px-4 py-2 text-sm text-[rgba(22,33,31,0.75)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                Built from your invoice automation blueprint
              </div>
              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">
                A separate fresh codebase for the AR platform, ready for Supabase.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[rgba(22,33,31,0.76)]">
                This implementation turns the blueprint into a real Next.js workspace: finance-focused landing page, operational dashboard, invoices, deliveries, gateways, portal access, recovery, compliance, and the surrounding AR operations needed for the must-have SRS surface.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--surface-strong)] px-6 py-3 text-sm font-medium text-[var(--background)] hover:opacity-90"
                >
                  Open MVP workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#build-plan"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--stroke)] px-6 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--surface-strong)]"
                >
                  Review implementation plan
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {summaryMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-[22px] border border-[rgba(141,128,102,0.22)] bg-[rgba(255,255,255,0.55)] p-5"
                  >
                    <p className="text-sm text-[rgba(22,33,31,0.62)]">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-sm text-[rgba(22,33,31,0.6)]">{metric.change}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-surface relative rounded-[36px] p-6 sm:p-8">
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(14,122,98,0.45)] to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
                    MVP layout
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    Product system in one glance
                  </h2>
                </div>
                <BrainCircuit className="h-8 w-8 text-[var(--brand)]" />
              </div>

              <div className="mt-8 space-y-4">
                {productModules.map((module, index) => (
                  <div
                    key={module}
                    className="flex items-start gap-4 rounded-[24px] bg-[rgba(255,255,255,0.62)] p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-sm font-semibold text-[var(--brand)]">
                      0{index + 1}
                    </div>
                    <div>
                      <p className="text-base font-medium text-[var(--foreground)]">
                        {module}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-[24px] bg-[var(--surface-strong)] p-5 text-[var(--background)]">
                <div className="flex items-center gap-3">
                  <DatabaseZap className="h-5 w-5 text-[var(--accent)]" />
                  <p className="text-sm font-medium">Supabase integration seam</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[rgba(243,239,229,0.76)]">
                  `.env.example`, browser/server Supabase clients, and route structure are already added so the next step is wiring auth and real tables.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
                Modules
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                The build now covers the must-have core from your SRS.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article key={feature.title} className="card-surface rounded-[28px] p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-[var(--foreground)]">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[rgba(22,33,31,0.7)]">
                      {feature.copy}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="architecture" className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="card-surface rounded-[30px] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
                Architecture
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                Recommended stack for this codebase
              </h2>
              <div className="mt-6 space-y-4">
                {[
                  "Next.js App Router for one repo across UI and backend route handlers",
                  "Supabase for auth, Postgres, storage, and row-level security",
                  "React Hook Form + Zod for safer finance-facing forms",
                  "Stripe-ready payment collection path for later phases",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 text-[var(--success)]" />
                    <p className="text-sm leading-7 text-[rgba(22,33,31,0.72)]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="build-plan" className="card-surface rounded-[30px] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
                Build plan
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
                What this first implementation establishes
              </h2>
              <div className="mt-6 space-y-4">
                {buildPhases.map((phase) => (
                  <div
                    key={phase}
                    className="rounded-[24px] border border-[rgba(141,128,102,0.2)] bg-[rgba(255,255,255,0.5)] p-4"
                  >
                    <p className="text-sm leading-7 text-[rgba(22,33,31,0.78)]">{phase}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

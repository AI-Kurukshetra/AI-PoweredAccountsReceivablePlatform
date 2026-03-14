import { redirect } from "next/navigation";
import { CompanyForm } from "@/components/onboarding/company-form";
import { signOutAction } from "@/app/(auth)/actions";
import { createCompanyAction } from "@/app/onboarding/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getMembershipContext();

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_460px]">
        <section className="card-surface rounded-[36px] p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--stroke-strong)]">
              Company onboarding
            </p>
            <form action={signOutAction}>
              <button type="submit" className="secondary-button">
                Sign out
              </button>
            </form>
          </div>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
            Create the first company workspace for your invoicing platform.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[rgba(22,33,31,0.72)]">
            This sets up the tenant boundary for all future customers, invoices, payments, reminders, and documents. You can optionally load sample finance data so the dashboard becomes useful immediately.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "Company record with base currency and slug",
              "Owner membership for your signed-in account",
              "Optional sample AR dataset for the first workspace",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[24px] bg-[rgba(255,255,255,0.54)] px-4 py-4 text-sm text-[rgba(22,33,31,0.74)]"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface rounded-[36px] p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--stroke-strong)]">
            Workspace setup
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            Finish your first tenant
          </h2>
          <p className="mt-3 text-sm leading-7 text-[rgba(22,33,31,0.72)]">
            You can create additional roles and companies later. For now, start with one owner workspace.
          </p>

          <div className="mt-8">
            <CompanyForm action={createCompanyAction} />
          </div>
        </section>
      </div>
    </div>
  );
}

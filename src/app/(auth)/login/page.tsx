import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { loginAction, signOutAction } from "@/app/(auth)/actions";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const membership = await getMembershipContext();
    const destination = membership ? "/dashboard" : "/onboarding";

    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
          Session active
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
          You are already signed in
        </h1>
        <p className="mt-3 text-sm leading-7 text-[rgba(22,33,31,0.72)]">
          {user.email ?? "This account"} already has an active session. Open your
          workspace or sign out to use a different account.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={destination} className="primary-button">
            {destination === "/dashboard" ? "Open workspace" : "Continue setup"}
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="secondary-button w-full sm:w-auto">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--stroke-strong)]">
        Welcome back
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
        Sign in to your workspace
      </h1>
      <p className="mt-3 text-sm leading-7 text-[rgba(22,33,31,0.72)]">
        Use your Supabase-backed account to access the invoicing workspace.
      </p>

      <div className="mt-8">
        <AuthForm mode="login" action={loginAction} />
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getMembershipContext } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const membership = await getMembershipContext();

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <WorkspaceShell
      userEmail={membership.userEmail}
      userName={membership.userName}
      companyName={membership.companyName}
      role={membership.role}
    >
      {children}
    </WorkspaceShell>
  );
}

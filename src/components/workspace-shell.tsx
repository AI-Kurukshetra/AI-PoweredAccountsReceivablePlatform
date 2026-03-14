"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  ChartSpline,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  PlugZap,
  ReceiptText,
  Route,
  ShieldCheck,
  ShieldUser,
  ShieldAlert,
  Siren,
  HardDriveDownload,
  Users,
  WalletCards,
  Waypoints,
} from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: WalletCards },
  { href: "/deliveries", label: "Deliveries", icon: Route },
  { href: "/gateways", label: "Gateways", icon: Siren },
  { href: "/collections", label: "Collections", icon: BellRing },
  { href: "/analytics", label: "Analytics", icon: ChartSpline },
  { href: "/templates", label: "Templates", icon: FileStack },
  { href: "/portal", label: "Portal", icon: Waypoints },
  { href: "/documents", label: "Documents", icon: FolderKanban },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/recovery", label: "Recovery", icon: HardDriveDownload },
  { href: "/compliance", label: "Compliance", icon: ShieldAlert },
  { href: "/access", label: "Add Company Members", icon: ShieldUser },
];

export function WorkspaceShell({
  children,
  userEmail,
  userName,
  companyName,
  role,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  companyName: string;
  role: string;
}) {
  const pathname = usePathname();
  const currentItem =
    items.find((item) => pathname === item.href) ??
    items.find((item) => pathname.startsWith(item.href) && item.href !== "/dashboard") ??
    items[0];
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="workspace-sidebar flex min-h-screen flex-col px-5 py-6">
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                InvoicedOS
              </p>
              <p className="text-sm text-[var(--stroke-strong)]">{companyName}</p>
            </div>
          </Link>

          <nav className="mt-8 space-y-1.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-4 border-t border-[var(--stroke)] pt-5">
            <div className="soft-panel rounded-[22px] px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--stroke-strong)]">
                Workspace
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {userName ?? "Workspace user"}
              </p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{userEmail}</p>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--stroke-strong)]">
                <span>{role}</span>
                <span>Supabase Live</span>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <header className="workspace-hero rounded-[28px] px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--stroke-strong)]">
                  {currentItem.label}
                </p>
                <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  Welcome back, {userName ?? companyName}
                </h1>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {today} · {companyName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-[var(--stroke)] bg-white px-4 py-2 text-sm text-[var(--ink-soft)]">
                  {currentItem.label} workspace
                </div>
                <div className="rounded-full bg-[var(--brand-soft)] px-4 py-2 text-sm font-medium text-[var(--brand)]">
                  Connected
                </div>
              </div>
            </div>
          </header>

          <div className="mt-5">{children}</div>
        </main>
      </div>
    </div>
  );
}

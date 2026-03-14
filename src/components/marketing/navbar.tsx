"use client";

import Link from "next/link";
import { Menu, ReceiptText, X } from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/app/(auth)/actions";

const links = [
  { href: "#platform", label: "Platform" },
  { href: "#modules", label: "Modules" },
  { href: "#architecture", label: "Architecture" },
];

export function MarketingNavbar({
  isAuthenticated,
  workspaceHref,
}: {
  isAuthenticated: boolean;
  workspaceHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(141,128,102,0.25)] bg-[rgba(243,239,229,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--background)]">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--stroke-strong)]">
              InvoicedOS
            </p>
            <p className="text-sm text-[rgba(22,33,31,0.72)]">
              AR operations cockpit
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[rgba(22,33,31,0.78)] hover:text-[var(--foreground)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                href={workspaceHref}
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--surface-strong)]"
              >
                {workspaceHref === "/dashboard" ? "Open workspace" : "Continue setup"}
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-[var(--stroke)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--surface-strong)]"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm font-medium text-[var(--background)] hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          className="rounded-full border border-[var(--stroke)] p-2 md:hidden"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-[rgba(141,128,102,0.2)] px-4 py-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.4)]"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  href={workspaceHref}
                  className="rounded-2xl border border-[var(--stroke)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
                  onClick={() => setOpen(false)}
                >
                  {workspaceHref === "/dashboard" ? "Open workspace" : "Continue setup"}
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--background)]"
                    onClick={() => setOpen(false)}
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-2xl border border-[var(--stroke)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
                  onClick={() => setOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-2xl bg-[var(--surface-strong)] px-3 py-2 text-sm font-medium text-[var(--background)]"
                  onClick={() => setOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

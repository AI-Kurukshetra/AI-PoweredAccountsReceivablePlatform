import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[rgba(141,128,102,0.24)] bg-[rgba(19,33,31,0.98)] text-[rgba(243,239,229,0.82)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.3fr_0.7fr_0.7fr] lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-[rgba(243,239,229,0.45)]">
            InvoicedOS
          </p>
          <h2 className="mt-4 max-w-md text-2xl font-semibold text-white">
            Finance teams get one system for invoices, reminders, disputes, and forecastable cash flow.
          </h2>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Workspace</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/dashboard" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/invoices" className="hover:text-white">
              Invoices
            </Link>
            <Link href="/collections" className="hover:text-white">
              Collections
            </Link>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Setup</p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <a href="#architecture" className="hover:text-white">
              Architecture
            </a>
            <a href="#build-plan" className="hover:text-white">
              MVP phases
            </a>
            <a href="#modules" className="hover:text-white">
              Product modules
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

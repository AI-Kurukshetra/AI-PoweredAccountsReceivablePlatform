do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'invoice_delivery_channel'
  ) then
    create type public.invoice_delivery_channel as enum ('email', 'sms', 'portal', 'postal');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'invoice_delivery_status'
  ) then
    create type public.invoice_delivery_status as enum ('queued', 'sent', 'delivered', 'failed', 'confirmed');
  end if;
end
$$;

create table if not exists public.invoice_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  channel public.invoice_delivery_channel not null,
  status public.invoice_delivery_status not null default 'queued',
  recipient text,
  tracking_ref text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  confirmed_at timestamptz,
  failure_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_gateway_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_label text not null,
  provider text not null,
  status text not null default 'sandbox',
  supported_channels jsonb not null default '[]'::jsonb,
  checkout_url text,
  webhook_status text not null default 'planned',
  settlement_days integer not null default 2,
  merchant_ref text,
  last_event_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  snapshot_name text not null,
  scope text not null,
  backup_kind text not null,
  status text not null default 'completed',
  storage_ref text not null,
  notes text,
  expires_at timestamptz,
  restore_tested_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.security_controls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  control_name text not null,
  framework text not null,
  status text not null default 'planned',
  owner text,
  last_reviewed_at timestamptz,
  next_review_due timestamptz,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_payment_gateway_accounts_updated_at on public.payment_gateway_accounts;
create trigger trg_payment_gateway_accounts_updated_at
before update on public.payment_gateway_accounts
for each row execute function public.set_updated_at();

drop trigger if exists trg_security_controls_updated_at on public.security_controls;
create trigger trg_security_controls_updated_at
before update on public.security_controls
for each row execute function public.set_updated_at();

alter table public.invoice_deliveries enable row level security;
alter table public.payment_gateway_accounts enable row level security;
alter table public.recovery_snapshots enable row level security;
alter table public.security_controls enable row level security;

create policy "invoice_deliveries_member_access"
on public.invoice_deliveries
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "payment_gateway_accounts_member_access"
on public.payment_gateway_accounts
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "recovery_snapshots_member_access"
on public.recovery_snapshots
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "security_controls_member_access"
on public.security_controls
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create index if not exists idx_invoice_deliveries_company_id
on public.invoice_deliveries(company_id);

create index if not exists idx_invoice_deliveries_invoice_id
on public.invoice_deliveries(invoice_id);

create index if not exists idx_payment_gateway_accounts_company_id
on public.payment_gateway_accounts(company_id);

create index if not exists idx_recovery_snapshots_company_id
on public.recovery_snapshots(company_id);

create index if not exists idx_security_controls_company_id
on public.security_controls(company_id);

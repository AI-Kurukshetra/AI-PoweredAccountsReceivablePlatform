create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum ('owner', 'admin', 'finance_manager', 'collector', 'viewer');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'invoice_status'
  ) then
    create type public.invoice_status as enum (
      'draft',
      'scheduled',
      'sent',
      'partial',
      'overdue',
      'paid',
      'disputed',
      'void'
    );
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'payment_status'
  ) then
    create type public.payment_status as enum ('pending', 'settled', 'failed', 'refunded');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'payment_channel'
  ) then
    create type public.payment_channel as enum ('card', 'ach', 'wire', 'wallet');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'reminder_channel'
  ) then
    create type public.reminder_channel as enum ('email', 'sms', 'call_task');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'reminder_status'
  ) then
    create type public.reminder_status as enum ('queued', 'sent', 'escalated', 'canceled');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'document_kind'
  ) then
    create type public.document_kind as enum ('invoice_pdf', 'contract', 'proof', 'dispute_attachment');
  end if;
end
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  base_currency text not null default 'USD',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  segment text,
  external_ref text,
  payment_terms_days integer not null default 30,
  credit_limit numeric(14, 2) not null default 0,
  billing_address jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_number text not null,
  status public.invoice_status not null default 'draft',
  issue_date date not null,
  due_date date not null,
  subtotal numeric(14, 2) not null default 0,
  tax_total numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  balance_due numeric(14, 2) not null default 0,
  currency text not null default 'USD',
  delivery_channel text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(14, 2) not null default 0,
  tax_rate numeric(6, 3) not null default 0,
  line_total numeric(14, 2) not null default 0,
  sort_order integer not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(14, 2) not null,
  status public.payment_status not null default 'pending',
  channel public.payment_channel not null,
  external_ref text,
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  stage text not null,
  channel public.reminder_channel not null,
  status public.reminder_status not null default 'queued',
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  opened_by uuid references auth.users(id),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  dispute_id uuid references public.disputes(id) on delete set null,
  bucket_path text not null,
  kind public.document_kind not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
  );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.company_members enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;
alter table public.disputes enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_insert_self"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "company_members_select_own_companies"
on public.company_members
for select
using (public.is_company_member(company_id));

create policy "companies_select_member"
on public.companies
for select
using (public.is_company_member(id));

create policy "customers_member_access"
on public.customers
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "invoices_member_access"
on public.invoices
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "invoice_line_items_member_access"
on public.invoice_line_items
for all
using (
  exists (
    select 1
    from public.invoices inv
    where inv.id = invoice_id
      and public.is_company_member(inv.company_id)
  )
)
with check (
  exists (
    select 1
    from public.invoices inv
    where inv.id = invoice_id
      and public.is_company_member(inv.company_id)
  )
);

create policy "payments_member_access"
on public.payments
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "reminders_member_access"
on public.reminders
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "disputes_member_access"
on public.disputes
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "documents_member_access"
on public.documents
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "audit_logs_member_access"
on public.audit_logs
for select
using (public.is_company_member(company_id));

create index if not exists idx_company_members_company_id on public.company_members(company_id);
create index if not exists idx_company_members_user_id on public.company_members(user_id);
create index if not exists idx_customers_company_id on public.customers(company_id);
create index if not exists idx_invoices_company_id on public.invoices(company_id);
create index if not exists idx_invoices_customer_id on public.invoices(customer_id);
create index if not exists idx_payments_company_id on public.payments(company_id);
create index if not exists idx_payments_customer_id on public.payments(customer_id);
create index if not exists idx_reminders_company_id on public.reminders(company_id);
create index if not exists idx_disputes_company_id on public.disputes(company_id);
create index if not exists idx_documents_company_id on public.documents(company_id);
create index if not exists idx_audit_logs_company_id on public.audit_logs(company_id);

alter table public.customers
add column if not exists portal_enabled boolean not null default false;

alter table public.customers
add column if not exists portal_access_token text;

create unique index if not exists idx_customers_portal_access_token
on public.customers(portal_access_token)
where portal_access_token is not null;

create table if not exists public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  delivery_channel text,
  payment_terms_days integer not null default 30,
  accent_color text not null default '#3d73e7',
  footer_text text,
  is_default boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  provider text not null,
  category text not null,
  status text not null default 'planned',
  health_note text,
  webhook_url text,
  last_sync_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_invoice_templates_updated_at on public.invoice_templates;
create trigger trg_invoice_templates_updated_at
before update on public.invoice_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_integration_connections_updated_at on public.integration_connections;
create trigger trg_integration_connections_updated_at
before update on public.integration_connections
for each row execute function public.set_updated_at();

alter table public.invoice_templates enable row level security;
alter table public.integration_connections enable row level security;

create policy "invoice_templates_member_access"
on public.invoice_templates
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "integration_connections_member_access"
on public.integration_connections
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "profiles_select_company_members"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.company_members current_member
    join public.company_members target_member
      on target_member.company_id = current_member.company_id
    where current_member.user_id = auth.uid()
      and target_member.user_id = profiles.id
  )
);

create index if not exists idx_invoice_templates_company_id
on public.invoice_templates(company_id);

create index if not exists idx_integration_connections_company_id
on public.integration_connections(company_id);

create index if not exists idx_integration_connections_provider
on public.integration_connections(provider);

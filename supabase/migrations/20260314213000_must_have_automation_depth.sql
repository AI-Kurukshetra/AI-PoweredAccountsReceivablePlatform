create table if not exists public.invoice_automations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  template_id uuid references public.invoice_templates(id) on delete set null,
  name text not null,
  automation_mode text not null default 'recurring' check (automation_mode in ('recurring', 'contract', 'milestone')),
  cadence_days integer not null default 30 check (cadence_days > 0 and cadence_days <= 365),
  next_run_date date not null,
  auto_send boolean not null default false,
  delivery_channel public.invoice_delivery_channel,
  default_notes text,
  line_items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  last_generated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  trigger_type text not null check (trigger_type in ('before_due', 'after_due')),
  days_offset integer not null default 3 check (days_offset >= 0 and days_offset <= 120),
  stage text not null,
  channel public.reminder_channel not null default 'email',
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.credit_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  integration_id uuid not null references public.integration_connections(id) on delete cascade,
  direction text not null default 'bi_directional' check (direction in ('pull', 'push', 'bi_directional')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  triggered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

drop trigger if exists trg_invoice_automations_updated_at on public.invoice_automations;
create trigger trg_invoice_automations_updated_at
before update on public.invoice_automations
for each row execute function public.set_updated_at();

drop trigger if exists trg_credit_alerts_updated_at on public.credit_alerts;
create trigger trg_credit_alerts_updated_at
before update on public.credit_alerts
for each row execute function public.set_updated_at();

alter table public.invoice_automations enable row level security;
alter table public.reminder_policies enable row level security;
alter table public.credit_alerts enable row level security;
alter table public.integration_sync_runs enable row level security;

drop policy if exists "invoice_automations_member_access" on public.invoice_automations;
create policy "invoice_automations_member_access"
on public.invoice_automations
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "reminder_policies_member_access" on public.reminder_policies;
create policy "reminder_policies_member_access"
on public.reminder_policies
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "credit_alerts_member_access" on public.credit_alerts;
create policy "credit_alerts_member_access"
on public.credit_alerts
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

drop policy if exists "integration_sync_runs_member_access" on public.integration_sync_runs;
create policy "integration_sync_runs_member_access"
on public.integration_sync_runs
for all
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create index if not exists idx_invoice_automations_company_id
on public.invoice_automations(company_id);

create index if not exists idx_invoice_automations_next_run_date
on public.invoice_automations(company_id, next_run_date)
where is_active = true;

create index if not exists idx_reminder_policies_company_id
on public.reminder_policies(company_id);

create index if not exists idx_credit_alerts_company_id
on public.credit_alerts(company_id);

create index if not exists idx_credit_alerts_customer_id
on public.credit_alerts(customer_id);

create unique index if not exists idx_credit_alerts_open_unique
on public.credit_alerts(company_id, customer_id, reason)
where status = 'open';

create index if not exists idx_integration_sync_runs_company_id
on public.integration_sync_runs(company_id);

create index if not exists idx_integration_sync_runs_integration_id
on public.integration_sync_runs(integration_id);

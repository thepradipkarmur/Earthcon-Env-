-- =====================================================================
-- Earthcon Lab CRM / LIMS — core schema
-- Workflow: Client → Quotation → PO → Task → Sample → Testing → Report → Invoice/Payment
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type public.app_role as enum ('admin','accounts','sampler','analyst','tech_manager','viewer');
create type public.quotation_status as enum ('draft','sent','accepted','rejected','expired','revised');
create type public.po_status as enum ('active','completed','cancelled','expired');
create type public.task_type as enum ('sampling','analysis','report','site_visit','other');
create type public.task_status as enum ('open','in_progress','done','cancelled');
create type public.task_priority as enum ('low','normal','high','urgent');
create type public.sample_status as enum ('registered','in_testing','tested','reported','rejected');
create type public.test_status as enum ('pending','entered','reviewed');
create type public.compliance as enum ('complies','exceeds','na');
create type public.report_status as enum ('draft','checked','approved','issued','cancelled');
create type public.invoice_status as enum ('draft','issued','partially_paid','paid','cancelled');

-- ---------- Helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Indian financial year label, e.g. 2026-27
create or replace function public.fy_label(d date default current_date) returns text
language sql immutable as $$
  select case when extract(month from d) >= 4
    then extract(year from d)::int || '-' || lpad(((extract(year from d)::int + 1) % 100)::text, 2, '0')
    else (extract(year from d)::int - 1) || '-' || lpad((extract(year from d)::int % 100)::text, 2, '0')
  end
$$;

-- ---------- Profiles (one per auth user) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  role public.app_role not null default 'viewer',
  designation text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_role_name() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_role(roles public.app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and is_active and (role = 'admin' or role = any(roles)))
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

-- New auth user → profile. First user becomes admin; others start as viewer.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email,
          case when exists (select 1 from public.profiles) then 'viewer'::public.app_role else 'admin'::public.app_role end);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Non-admins may not change their own role / active flag
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.has_role(array[]::public.app_role[]) then
    raise exception 'Only an admin can change roles or activation';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- Document numbering ----------
create table public.doc_counters (
  doc_type text not null,
  fy text not null,
  last_no int not null default 0,
  primary key (doc_type, fy)
);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  lab_name text not null default 'Earthcon Lab',
  doc_prefix text not null default 'EL',
  address text,
  phone text,
  email text,
  gstin text,
  state_code text not null default '24',          -- Gujarat
  state_name text not null default 'Gujarat',
  default_gst_pct numeric(5,2) not null default 18,
  default_sac text not null default '998346',
  bank_details text,
  quotation_terms text,
  invoice_terms text,
  report_footer text,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- next_doc_no('QT') → EL/QT/2026-27/0001
create or replace function public.next_doc_no(p_type text, p_pad int default 4, p_date date default current_date)
returns text language plpgsql security definer set search_path = public as $$
declare v_fy text := public.fy_label(p_date); v_no int; v_prefix text;
begin
  select doc_prefix into v_prefix from public.app_settings where id = 1;
  insert into public.doc_counters (doc_type, fy, last_no) values (p_type, v_fy, 1)
  on conflict (doc_type, fy) do update set last_no = public.doc_counters.last_no + 1
  returning last_no into v_no;
  return coalesce(v_prefix,'EL') || '/' || p_type || '/' || v_fy || '/' || lpad(v_no::text, p_pad, '0');
end $$;

-- ---------- Master data ----------
-- Generic admin-editable dropdowns (district, GIDC estate, sector, frequency, container ...)
create table public.lookups (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  value text not null,
  sort_order int not null default 100,
  is_active boolean not null default true,
  unique (category, value)
);

create table public.sample_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- WW, DW, AA, SE ...
  name text not null,
  matrix text not null check (matrix in ('water','ambient_air','stack','workzone','noise','soil','waste')),
  description text,
  is_active boolean not null default true,
  sort_order int not null default 100
);

create table public.test_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,              -- e.g. IS 3025 (P-44)
  title text,
  reference text,
  needs_verification boolean not null default true,
  is_active boolean not null default true
);

create table public.parameters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  matrix text not null check (matrix in ('water','ambient_air','stack','workzone','noise','soil','waste')),
  unit text,
  method_id uuid references public.test_methods(id),
  default_rate numeric(12,2) not null default 0,
  decimals int not null default 2,
  is_nabl boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 100
);

create table public.standards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  matrix text not null check (matrix in ('water','ambient_air','stack','workzone','noise','soil','waste')),
  reference text,
  client_id uuid,                          -- set for client-specific CCA limits
  notes text,
  needs_verification boolean not null default true,
  is_active boolean not null default true
);

create table public.standard_limits (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references public.standards(id) on delete cascade,
  parameter_id uuid not null references public.parameters(id) on delete cascade,
  min_value numeric,
  max_value numeric,
  limit_text text,                          -- printed text, e.g. "5.5 – 9.0" or "Absent"
  unique (standard_id, parameter_id)
);

create table public.instruments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  make text,
  model text,
  serial_no text,
  instrument_id_no text,
  calibration_date date,
  calibration_due date,
  is_active boolean not null default true,
  notes text
);

-- ---------- 1. Clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text unique,
  name text not null,
  industry_sector text,
  pcb_category text,                        -- Red / Orange / Green / White
  gstin text,
  pan text,
  address text,
  city text,
  district text,
  gidc_estate text,
  state text not null default 'Gujarat',
  pincode text,
  cca_number text,                          -- GPCB Consolidated Consent & Authorisation
  cca_valid_upto date,
  xgn_id text,                              -- GPCB XGN industry ID
  effluent_discharge_route text,            -- inland / sewer / land / marine / CETP / ZLD
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.standards add constraint standards_client_fk foreign key (client_id) references public.clients(id) on delete cascade;

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  designation text,
  email text,
  phone text,
  is_primary boolean not null default false
);

create table public.client_sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,                       -- Plant / unit name
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6)
);

-- ---------- 2. Quotations ----------
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quote_no text unique,
  revision int not null default 0,
  parent_id uuid references public.quotations(id),
  client_id uuid not null references public.clients(id),
  contact_id uuid references public.client_contacts(id),
  quote_date date not null default current_date,
  valid_until date default (current_date + 30),
  subject text,
  status public.quotation_status not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  discount_pct numeric(5,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  taxable_amount numeric(14,2) not null default 0,
  gst_pct numeric(5,2) not null default 18,
  gst_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  terms text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  line_no int not null default 1,
  item_type text not null default 'parameter' check (item_type in ('parameter','package','service')),
  sample_type_id uuid references public.sample_types(id),
  parameter_id uuid references public.parameters(id),
  description text not null,
  frequency text,                           -- One-time / Monthly / Quarterly ...
  quantity numeric(10,2) not null default 1, -- no. of samples / visits
  rate numeric(12,2) not null default 0,
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored
);

-- ---------- 3. Purchase orders ----------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null,                  -- client's PO number
  internal_ref text unique,
  client_id uuid not null references public.clients(id),
  quotation_id uuid references public.quotations(id),
  po_date date not null default current_date,
  valid_from date,
  valid_to date,
  po_value numeric(14,2) not null default 0,
  status public.po_status not null default 'active',
  file_path text,                           -- storage: documents/po/...
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, po_number)
);

-- ---------- 4. Tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_no text unique,
  task_type public.task_type not null default 'sampling',
  title text not null,
  description text,
  client_id uuid references public.clients(id),
  site_id uuid references public.client_sites(id),
  po_id uuid references public.purchase_orders(id),
  sample_type_id uuid references public.sample_types(id),
  assigned_to uuid references public.profiles(id),
  due_date date,
  priority public.task_priority not null default 'normal',
  status public.task_status not null default 'open',
  completed_at timestamptz,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 5. Samples ----------
create table public.samples (
  id uuid primary key default gen_random_uuid(),
  sample_no text unique,
  client_id uuid not null references public.clients(id),
  site_id uuid references public.client_sites(id),
  po_id uuid references public.purchase_orders(id),
  task_id uuid references public.tasks(id),
  sample_type_id uuid not null references public.sample_types(id),
  standard_id uuid references public.standards(id),
  sampling_point text,                      -- e.g. ETP Outlet, Stack attached to Boiler, Near main gate
  sample_description text,
  collected_by uuid references public.profiles(id),
  collected_at timestamptz,
  received_at timestamptz default now(),
  sampling_duration text,                   -- e.g. 24 hrs (air)
  quantity text,
  container text,
  preservation text,
  condition_on_receipt text,
  weather text,
  field_data jsonb not null default '{}'::jsonb,  -- matrix-specific (stack dia, fuel, flow, etc.)
  status public.sample_status not null default 'registered',
  remarks text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 6. Testing ----------
create table public.sample_tests (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references public.samples(id) on delete cascade,
  parameter_id uuid not null references public.parameters(id),
  method_id uuid references public.test_methods(id),
  unit text,
  result_value numeric,
  result_text text,                         -- "BDL (DL 0.01)", "Absent", etc.
  limit_min numeric,
  limit_max numeric,
  limit_text text,
  compliance public.compliance not null default 'na',
  analyst_id uuid references public.profiles(id),
  instrument_id uuid references public.instruments(id),
  analysis_start date,
  analysis_end date,
  status public.test_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  remarks text,
  sort_order int not null default 100,
  updated_at timestamptz not null default now(),
  unique (sample_id, parameter_id)
);

-- ---------- 7. Reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  report_no text unique,
  revision int not null default 0,
  sample_id uuid not null references public.samples(id),
  ulr_no text,
  issue_date date,
  status public.report_status not null default 'draft',
  prepared_by uuid references public.profiles(id) default auth.uid(),
  checked_by uuid references public.profiles(id),
  checked_at timestamptz,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  remarks text,
  opinion text,                             -- statement of conformity
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 8. Invoices & payments ----------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text unique,
  client_id uuid not null references public.clients(id),
  po_id uuid references public.purchase_orders(id),
  invoice_date date not null default current_date,
  due_date date default (current_date + 30),
  place_of_supply text not null default 'Gujarat',
  is_interstate boolean not null default false,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  taxable_amount numeric(14,2) not null default 0,
  gst_pct numeric(5,2) not null default 18,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  tds_amount numeric(14,2) not null default 0,
  balance numeric(14,2) generated always as (total - amount_paid - tds_amount) stored,
  status public.invoice_status not null default 'draft',
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  line_no int not null default 1,
  description text not null,
  sac text not null default '998346',
  sample_id uuid references public.samples(id),
  quantity numeric(10,2) not null default 1,
  rate numeric(12,2) not null default 0,
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  tds_amount numeric(14,2) not null default 0,
  mode text,                                 -- NEFT / RTGS / UPI / Cheque / Cash
  reference text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Audit log ----------
create table public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  return coalesce(new, old);
end $$;

-- ---------- Indexes ----------
create index on public.client_contacts(client_id);
create index on public.client_sites(client_id);
create index on public.quotations(client_id);
create index on public.quotation_items(quotation_id);
create index on public.purchase_orders(client_id);
create index on public.tasks(assigned_to, status);
create index on public.tasks(client_id);
create index on public.samples(client_id);
create index on public.samples(status);
create index on public.sample_tests(sample_id);
create index on public.sample_tests(status);
create index on public.reports(sample_id);
create index on public.invoices(client_id);
create index on public.invoice_items(invoice_id);
create index on public.payments(invoice_id);
create index on public.standard_limits(parameter_id);
create index on public.parameters(matrix);
create index on public.audit_log(table_name, record_id);

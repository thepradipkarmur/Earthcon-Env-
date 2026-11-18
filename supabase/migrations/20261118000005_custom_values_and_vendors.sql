-- =====================================================================
-- Earthcon Lab — custom dropdown values + vendor / purchasing module
-- =====================================================================

-- ---------- Quick-add helpers (any active staff member) ----------
create or replace function public.add_lookup(p_category text, p_value text) returns text
language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_value, '')), 200); c text := trim(coalesce(p_category, ''));
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  if v = '' or c = '' then raise exception 'A value is required'; end if;
  insert into public.lookups (category, value, sort_order) values (c, v, 500)
    on conflict (category, value) do update set is_active = true;
  return v;
end $$;

create or replace function public.quick_add_method(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_code, '')), 200); v_id uuid;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  if v = '' then raise exception 'A method code is required'; end if;
  insert into public.test_methods (code, title, needs_verification) values (v, v, true)
    on conflict (code) do update set is_active = true
    returning id into v_id;
  return v_id;
end $$;

create or replace function public.quick_add_instrument(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v text := left(trim(coalesce(p_name, '')), 200); v_id uuid;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  if v = '' then raise exception 'An instrument name is required'; end if;
  select id into v_id from public.instruments where lower(name) = lower(v) limit 1;
  if v_id is null then insert into public.instruments (name) values (v) returning id into v_id; end if;
  return v_id;
end $$;

revoke execute on function public.add_lookup(text, text) from public, anon;
revoke execute on function public.quick_add_method(text) from public, anon;
revoke execute on function public.quick_add_instrument(text) from public, anon;
grant execute on function public.add_lookup(text, text) to authenticated;
grant execute on function public.quick_add_method(text) to authenticated;
grant execute on function public.quick_add_instrument(text) to authenticated;

-- ---------- New dropdown lists ----------
insert into public.lookups (category, value, sort_order)
select c, v, row_number() over (partition by c order by o)
from (values
  ('vendor_category','Chemicals & reagents',1),('vendor_category','Glassware & consumables',2),
  ('vendor_category','Instruments & equipment',3),('vendor_category','Calibration services',4),
  ('vendor_category','Sub-contract laboratory testing',5),('vendor_category','Certified reference materials',6),
  ('vendor_category','Sampling equipment & spares',7),('vendor_category','Maintenance & AMC',8),
  ('vendor_category','Transport / logistics',9),('vendor_category','IT / software',10),
  ('vendor_category','Stationery & printing',11),('vendor_category','Safety / PPE',12),('vendor_category','Other',99),
  ('unit','Nos',1),('unit','Kg',2),('unit','g',3),('unit','L',4),('unit','mL',5),('unit','Box',6),('unit','Pack',7),
  ('unit','Set',8),('unit','Bottle',9),('unit','Lot',10),('unit','Hour',11),('unit','Visit',12),('unit','Sample',13),('unit','Month',14),
  ('payment_terms','100% advance',1),('payment_terms','50% advance, 50% on delivery',2),('payment_terms','Against delivery',3),
  ('payment_terms','15 days from invoice',4),('payment_terms','30 days from invoice',5),('payment_terms','45 days from invoice',6),
  ('payment_terms','60 days from invoice',7),
  ('water_sample_nature','Grab',1),('water_sample_nature','Composite (8 h)',2),('water_sample_nature','Composite (24 h)',3),
  ('service_item','Sampling charges',1),('service_item','Transportation charges',2),('service_item','Stack monitoring – per stack',3),
  ('service_item','Ambient air monitoring – per location (24 h)',4),('service_item','Noise monitoring – per location',5),
  ('service_item','Report preparation',6),
  ('state','Andaman and Nicobar Islands',1),('state','Andhra Pradesh',2),('state','Arunachal Pradesh',3),('state','Assam',4),
  ('state','Bihar',5),('state','Chandigarh',6),('state','Chhattisgarh',7),('state','Dadra and Nagar Haveli and Daman and Diu',8),
  ('state','Delhi',9),('state','Goa',10),('state','Gujarat',11),('state','Haryana',12),('state','Himachal Pradesh',13),
  ('state','Jammu and Kashmir',14),('state','Jharkhand',15),('state','Karnataka',16),('state','Kerala',17),('state','Ladakh',18),
  ('state','Lakshadweep',19),('state','Madhya Pradesh',20),('state','Maharashtra',21),('state','Manipur',22),('state','Meghalaya',23),
  ('state','Mizoram',24),('state','Nagaland',25),('state','Odisha',26),('state','Puducherry',27),('state','Punjab',28),
  ('state','Rajasthan',29),('state','Sikkim',30),('state','Tamil Nadu',31),('state','Telangana',32),('state','Tripura',33),
  ('state','Uttar Pradesh',34),('state','Uttarakhand',35),('state','West Bengal',36)
) as t(c, v, o)
on conflict (category, value) do nothing;

-- ---------- Vendors ----------
create type public.vendor_quote_status as enum ('received','under_review','accepted','rejected','expired');
create type public.vendor_po_status as enum ('draft','sent','acknowledged','partially_received','received','closed','cancelled');

create sequence public.vendor_code_seq;

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_code text unique,
  name text not null,
  category text,
  client_id uuid unique references public.clients(id) on delete set null,  -- same company is also a client
  gstin text,
  pan text,
  msme_no text,
  address text,
  city text,
  district text,
  state text not null default 'Gujarat',
  pincode text,
  contact_name text,
  contact_designation text,
  email text,
  phone text,
  payment_terms text,
  bank_details text,
  rating int check (rating between 1 and 5),
  is_active boolean not null default true,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_quotations (
  id uuid primary key default gen_random_uuid(),
  vq_no text unique,
  vendor_id uuid not null references public.vendors(id),
  vendor_ref text,                          -- vendor's own quotation number
  quote_date date not null default current_date,
  valid_until date,
  subject text,
  status public.vendor_quote_status not null default 'received',
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  taxable_amount numeric(14,2) not null default 0,
  gst_pct numeric(5,2) not null default 18,
  gst_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  file_path text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_quotation_items (
  id uuid primary key default gen_random_uuid(),
  vendor_quotation_id uuid not null references public.vendor_quotations(id) on delete cascade,
  line_no int not null default 1,
  description text not null,
  unit text,
  quantity numeric(12,3) not null default 1,
  rate numeric(14,2) not null default 0,
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored
);

create table public.vendor_pos (
  id uuid primary key default gen_random_uuid(),
  po_no text unique,
  vendor_id uuid not null references public.vendors(id),
  vendor_quotation_id uuid references public.vendor_quotations(id),
  po_date date not null default current_date,
  delivery_date date,
  delivery_address text,
  payment_terms text,
  status public.vendor_po_status not null default 'draft',
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
  sent_at timestamptz,
  terms text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendor_po_items (
  id uuid primary key default gen_random_uuid(),
  vendor_po_id uuid not null references public.vendor_pos(id) on delete cascade,
  line_no int not null default 1,
  description text not null,
  unit text,
  quantity numeric(12,3) not null default 1,
  rate numeric(14,2) not null default 0,
  received_qty numeric(12,3) not null default 0,
  amount numeric(14,2) generated always as (round(quantity * rate, 2)) stored
);

create table public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  vendor_po_id uuid not null references public.vendor_pos(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(14,2) not null default 0,
  tds_amount numeric(14,2) not null default 0,
  mode text,
  reference text,
  notes text,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index on public.vendor_quotations(vendor_id);
create index on public.vendor_quotation_items(vendor_quotation_id);
create index on public.vendor_pos(vendor_id);
create index on public.vendor_pos(vendor_quotation_id);
create index on public.vendor_po_items(vendor_po_id);
create index on public.vendor_payments(vendor_po_id);

-- ---------- Numbering (extends the existing trigger function) ----------
create or replace function public.assign_doc_numbers() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text; v_prefix text; v_fy text;
begin
  if tg_table_name = 'clients' then
    if new.client_code is null then
      new.client_code := 'CL-' || lpad(nextval('public.client_code_seq')::text, 4, '0');
    end if;
  elsif tg_table_name = 'vendors' then
    if new.vendor_code is null then
      new.vendor_code := 'VN-' || lpad(nextval('public.vendor_code_seq')::text, 4, '0');
    end if;
  elsif tg_table_name = 'quotations' then
    if new.quote_no is null then new.quote_no := public.next_doc_no('QT', 4, new.quote_date); end if;
  elsif tg_table_name = 'vendor_quotations' then
    if new.vq_no is null then new.vq_no := public.next_doc_no('VQ', 4, new.quote_date); end if;
  elsif tg_table_name = 'vendor_pos' then
    if new.po_no is null then new.po_no := public.next_doc_no('VPO', 4, new.po_date); end if;
  elsif tg_table_name = 'purchase_orders' then
    if new.internal_ref is null then new.internal_ref := public.next_doc_no('PO', 4, new.po_date); end if;
  elsif tg_table_name = 'tasks' then
    if new.task_no is null then new.task_no := public.next_doc_no('TK', 4); end if;
  elsif tg_table_name = 'samples' then
    if new.sample_no is null then
      select code into v_code from public.sample_types where id = new.sample_type_id;
      new.sample_no := public.next_doc_no(coalesce(v_code,'S'), 5, coalesce(new.received_at::date, current_date));
    end if;
  elsif tg_table_name = 'reports' then
    if new.report_no is null then new.report_no := public.next_doc_no('TR', 5); end if;
  elsif tg_table_name = 'invoices' then
    if new.invoice_no is null then
      select doc_prefix into v_prefix from public.app_settings where id = 1;
      v_fy := public.fy_label(new.invoice_date);
      insert into public.doc_counters (doc_type, fy, last_no) values ('INV', v_fy, 1)
        on conflict (doc_type, fy) do update set last_no = public.doc_counters.last_no + 1
        returning coalesce(v_prefix,'EL') || '/' || right(split_part(v_fy,'-',1),2) || '-' || split_part(v_fy,'-',2)
                  || '/' || lpad(last_no::text, 4, '0') into new.invoice_no;
    end if;
  end if;
  return new;
end $$;

create trigger vendors_no before insert on public.vendors for each row execute function public.assign_doc_numbers();
create trigger vendor_quotations_no before insert on public.vendor_quotations for each row execute function public.assign_doc_numbers();
create trigger vendor_pos_no before insert on public.vendor_pos for each row execute function public.assign_doc_numbers();

create trigger vendors_updated before update on public.vendors for each row execute function public.set_updated_at();
create trigger vendor_quotations_updated before update on public.vendor_quotations for each row execute function public.set_updated_at();
create trigger vendor_pos_updated before update on public.vendor_pos for each row execute function public.set_updated_at();

-- ---------- Totals ----------
create or replace function public.vendor_quote_totals() returns trigger
language plpgsql set search_path = public as $$
begin
  select coalesce(sum(amount),0) into new.subtotal from public.vendor_quotation_items where vendor_quotation_id = new.id;
  new.taxable_amount := new.subtotal - coalesce(new.discount_amount, 0);
  new.gst_amount := round(new.taxable_amount * new.gst_pct / 100, 2);
  new.total := new.taxable_amount + new.gst_amount;
  return new;
end $$;
create trigger vendor_quotations_totals before insert or update on public.vendor_quotations
  for each row execute function public.vendor_quote_totals();

create or replace function public.touch_vendor_quotation() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.vendor_quotations set updated_at = now() where id = coalesce(new.vendor_quotation_id, old.vendor_quotation_id);
  return null;
end $$;
create trigger vendor_quotation_items_touch after insert or update or delete on public.vendor_quotation_items
  for each row execute function public.touch_vendor_quotation();

create or replace function public.vendor_po_totals() returns trigger
language plpgsql set search_path = public as $$
declare v_tax numeric; v_lines int; v_full int; v_any int;
begin
  select coalesce(sum(amount),0), count(*), count(*) filter (where received_qty >= quantity), count(*) filter (where received_qty > 0)
    into new.subtotal, v_lines, v_full, v_any from public.vendor_po_items where vendor_po_id = new.id;
  new.taxable_amount := new.subtotal - coalesce(new.discount_amount, 0);
  v_tax := round(new.taxable_amount * new.gst_pct / 100, 2);
  if new.is_interstate then new.igst := v_tax; new.cgst := 0; new.sgst := 0;
  else new.igst := 0; new.cgst := round(v_tax / 2, 2); new.sgst := v_tax - round(v_tax / 2, 2);
  end if;
  new.total := new.taxable_amount + v_tax;
  select coalesce(sum(amount),0), coalesce(sum(tds_amount),0) into new.amount_paid, new.tds_amount
    from public.vendor_payments where vendor_po_id = new.id;
  if new.status in ('sent','acknowledged','partially_received','received') and v_lines > 0 then
    if v_full = v_lines then new.status := 'received';
    elsif v_any > 0 then new.status := 'partially_received';
    elsif new.status in ('partially_received','received') then new.status := 'acknowledged';
    end if;
  end if;
  if new.status = 'sent' and new.sent_at is null then new.sent_at := now(); end if;
  return new;
end $$;
create trigger vendor_pos_totals before insert or update on public.vendor_pos
  for each row execute function public.vendor_po_totals();

create or replace function public.touch_vendor_po() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.vendor_pos set updated_at = now() where id = coalesce(new.vendor_po_id, old.vendor_po_id);
  return null;
end $$;
create trigger vendor_po_items_touch after insert or update or delete on public.vendor_po_items
  for each row execute function public.touch_vendor_po();
create trigger vendor_payments_touch after insert or update or delete on public.vendor_payments
  for each row execute function public.touch_vendor_po();

-- ---------- Audit ----------
do $$ declare t text; begin
  foreach t in array array['vendors','vendor_quotations','vendor_quotation_items','vendor_pos','vendor_po_items','vendor_payments','lookups'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;

-- ---------- Row-level security ----------
do $$ declare t text; begin
  foreach t in array array['vendors','vendor_quotations','vendor_quotation_items','vendor_pos','vendor_po_items','vendor_payments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "staff read" on public.%I for select to authenticated using ((select public.is_staff()))', t);
    execute format('create policy "role insert" on public.%I for insert to authenticated with check ((select public.has_role(''{accounts,tech_manager}''::public.app_role[])))', t);
    execute format('create policy "role update" on public.%I for update to authenticated using ((select public.has_role(''{accounts,tech_manager}''::public.app_role[]))) with check ((select public.has_role(''{accounts,tech_manager}''::public.app_role[])))', t);
  end loop;
  foreach t in array array['vendors','vendor_quotations','vendor_pos'] loop
    execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select public.has_role(''{}''::public.app_role[])))', t);
  end loop;
  foreach t in array array['vendor_quotation_items','vendor_po_items','vendor_payments'] loop
    execute format('create policy "role delete" on public.%I for delete to authenticated using ((select public.has_role(''{accounts,tech_manager}''::public.app_role[])))', t);
  end loop;
end $$;

-- Trigger-only functions are not API-callable
revoke execute on function public.vendor_quote_totals() from public, anon, authenticated;
revoke execute on function public.touch_vendor_quotation() from public, anon, authenticated;
revoke execute on function public.vendor_po_totals() from public, anon, authenticated;
revoke execute on function public.touch_vendor_po() from public, anon, authenticated;
revoke execute on function public.assign_doc_numbers() from public, anon, authenticated;

-- Storage: purchasing staff may upload vendor quotation copies (same bucket)
drop policy if exists "staff upload documents" on storage.objects;
create policy "staff upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select public.has_role('{accounts,sampler,analyst,tech_manager}'::public.app_role[])));

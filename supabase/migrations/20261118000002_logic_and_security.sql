-- =====================================================================
-- Earthcon Lab — business rules (numbering, totals, compliance, report
-- locking), audit trail, row-level security and storage.
-- =====================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.fy_label(date) set search_path = public;

-- ---------- Auto numbering ----------
create sequence public.client_code_seq;

create or replace function public.assign_doc_numbers() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_code text; v_prefix text; v_fy text;
begin
  if tg_table_name = 'clients' then
    if new.client_code is null then
      new.client_code := 'CL-' || lpad(nextval('public.client_code_seq')::text, 4, '0');
    end if;
  elsif tg_table_name = 'quotations' then
    if new.quote_no is null then new.quote_no := public.next_doc_no('QT', 4, new.quote_date); end if;
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
      -- GST invoice serial must not exceed 16 characters → EL/26-27/0001
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

create trigger clients_no before insert on public.clients for each row execute function public.assign_doc_numbers();
create trigger quotations_no before insert on public.quotations for each row execute function public.assign_doc_numbers();
create trigger po_no before insert on public.purchase_orders for each row execute function public.assign_doc_numbers();
create trigger tasks_no before insert on public.tasks for each row execute function public.assign_doc_numbers();
create trigger samples_no before insert on public.samples for each row execute function public.assign_doc_numbers();
create trigger reports_no before insert on public.reports for each row execute function public.assign_doc_numbers();
create trigger invoices_no before insert on public.invoices for each row execute function public.assign_doc_numbers();

-- ---------- updated_at ----------
do $$ declare t text; begin
  foreach t in array array['clients','quotations','purchase_orders','tasks','samples','reports','invoices','app_settings'] loop
    execute format('create trigger %I_updated before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------- Quotation totals ----------
create or replace function public.quotation_totals() returns trigger
language plpgsql set search_path = public as $$
begin
  select coalesce(sum(amount),0) into new.subtotal from public.quotation_items where quotation_id = new.id;
  new.discount_amount := round(new.subtotal * new.discount_pct / 100, 2);
  new.taxable_amount  := new.subtotal - new.discount_amount;
  new.gst_amount      := round(new.taxable_amount * new.gst_pct / 100, 2);
  new.total           := new.taxable_amount + new.gst_amount;
  return new;
end $$;
create trigger quotations_totals before insert or update on public.quotations
  for each row execute function public.quotation_totals();

create or replace function public.touch_quotation() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.quotations set updated_at = now()
   where id = coalesce(new.quotation_id, old.quotation_id);
  return null;
end $$;
create trigger quotation_items_touch after insert or update or delete on public.quotation_items
  for each row execute function public.touch_quotation();

-- ---------- Invoice totals & status ----------
create or replace function public.invoice_totals() returns trigger
language plpgsql set search_path = public as $$
declare v_tax numeric;
begin
  select coalesce(sum(amount),0) into new.subtotal from public.invoice_items where invoice_id = new.id;
  new.taxable_amount := new.subtotal - coalesce(new.discount_amount,0);
  v_tax := round(new.taxable_amount * new.gst_pct / 100, 2);
  if new.is_interstate then
    new.igst := v_tax; new.cgst := 0; new.sgst := 0;
  else
    new.igst := 0; new.cgst := round(v_tax / 2, 2); new.sgst := v_tax - round(v_tax / 2, 2);
  end if;
  new.total := new.taxable_amount + v_tax;
  select coalesce(sum(amount),0), coalesce(sum(tds_amount),0)
    into new.amount_paid, new.tds_amount from public.payments where invoice_id = new.id;
  if new.status not in ('draft','cancelled') then
    if new.total > 0 and new.amount_paid + new.tds_amount >= new.total then new.status := 'paid';
    elsif new.amount_paid + new.tds_amount > 0 then new.status := 'partially_paid';
    else new.status := 'issued';
    end if;
  end if;
  return new;
end $$;
create trigger invoices_totals before insert or update on public.invoices
  for each row execute function public.invoice_totals();

create or replace function public.touch_invoice() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.invoices set updated_at = now()
   where id = coalesce(new.invoice_id, old.invoice_id);
  return null;
end $$;
create trigger invoice_items_touch after insert or update or delete on public.invoice_items
  for each row execute function public.touch_invoice();
create trigger payments_touch after insert or update or delete on public.payments
  for each row execute function public.touch_invoice();

-- ---------- Tasks ----------
create or replace function public.task_completion() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then new.completed_at := now(); end if;
  if new.status <> 'done' then new.completed_at := null; end if;
  return new;
end $$;
create trigger tasks_completion before update on public.tasks
  for each row execute function public.task_completion();

-- ---------- Test results: defaults, limits, compliance, lock ----------
create or replace function public.sample_test_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_std uuid; v_lim record;
begin
  -- Block edits once the sample's report is approved / issued
  if exists (select 1 from public.reports r where r.sample_id = new.sample_id
             and r.is_locked and r.status in ('approved','issued')) then
    raise exception 'Results are locked: an approved report exists for this sample. Cancel it and create a revision first.';
  end if;

  if tg_op = 'INSERT' then
    select coalesce(new.method_id, p.method_id), coalesce(new.unit, p.unit), p.sort_order
      into new.method_id, new.unit, new.sort_order
      from public.parameters p where p.id = new.parameter_id;
    select standard_id into v_std from public.samples where id = new.sample_id;
    if v_std is not null and new.limit_min is null and new.limit_max is null and new.limit_text is null then
      select min_value, max_value, limit_text into v_lim
        from public.standard_limits where standard_id = v_std and parameter_id = new.parameter_id;
      if found then
        new.limit_min := v_lim.min_value; new.limit_max := v_lim.max_value; new.limit_text := v_lim.limit_text;
      end if;
    end if;
  end if;

  if new.result_value is null then
    new.compliance := 'na';
  elsif new.limit_min is null and new.limit_max is null then
    new.compliance := 'na';
  elsif (new.limit_min is not null and new.result_value < new.limit_min)
     or (new.limit_max is not null and new.result_value > new.limit_max) then
    new.compliance := 'exceeds';
  else
    new.compliance := 'complies';
  end if;

  if (new.result_value is not null or nullif(trim(new.result_text),'') is not null) and new.status = 'pending' then
    new.status := 'entered';
    new.analyst_id := coalesce(new.analyst_id, auth.uid());
  end if;
  if new.status = 'reviewed' and (tg_op = 'INSERT' or old.status <> 'reviewed') then
    if not public.has_role(array['tech_manager']::public.app_role[]) then
      raise exception 'Only a Technical Manager can mark results as reviewed';
    end if;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger sample_tests_rules before insert or update on public.sample_tests
  for each row execute function public.sample_test_rules();

create or replace function public.sample_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sample uuid := coalesce(new.sample_id, old.sample_id); v_total int; v_done int;
begin
  select count(*), count(*) filter (where status <> 'pending') into v_total, v_done
    from public.sample_tests where sample_id = v_sample;
  update public.samples s set status = case
      when v_total > 0 and v_done = v_total then 'tested'::public.sample_status
      when v_done > 0 then 'in_testing'::public.sample_status
      else 'registered'::public.sample_status end
   where s.id = v_sample and s.status in ('registered','in_testing','tested');
  return null;
end $$;
create trigger sample_tests_progress after insert or update or delete on public.sample_tests
  for each row execute function public.sample_progress();

-- ---------- Reports: workflow + locking ----------
create or replace function public.report_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.is_locked then
    if new.status = 'issued' and old.status = 'approved' then
      new.issue_date := coalesce(new.issue_date, current_date);
      return new;
    elsif new.status = 'cancelled' and public.has_role(array['tech_manager']::public.app_role[]) then
      new.is_locked := true;
      return new;
    end if;
    raise exception 'Report % is approved and locked. Cancel it and create a revision to make changes.', old.report_no;
  end if;

  if new.status = 'checked' and (tg_op = 'INSERT' or old.status = 'draft') then
    if not public.has_role(array['analyst','tech_manager']::public.app_role[]) then
      raise exception 'Only an Analyst or Technical Manager can mark a report as checked';
    end if;
    new.checked_by := auth.uid(); new.checked_at := now();
  end if;

  if new.status in ('approved','issued') and (tg_op = 'INSERT' or old.status not in ('approved','issued')) then
    if not public.has_role(array['tech_manager']::public.app_role[]) then
      raise exception 'Only a Technical Manager can approve a report';
    end if;
    if exists (select 1 from public.sample_tests where sample_id = new.sample_id and status = 'pending') then
      raise exception 'All parameters must have results before approval';
    end if;
    new.approved_by := auth.uid(); new.approved_at := now();
    new.is_locked := true;
    new.issue_date := coalesce(new.issue_date, current_date);
    update public.samples set status = 'reported' where id = new.sample_id;
  end if;
  return new;
end $$;
create trigger reports_rules before insert or update on public.reports
  for each row execute function public.report_rules();

-- ---------- Audit trail ----------
do $$ declare t text; begin
  foreach t in array array['profiles','clients','client_contacts','client_sites','quotations','quotation_items',
    'purchase_orders','tasks','samples','sample_tests','reports','invoices','invoice_items','payments',
    'parameters','test_methods','standards','standard_limits','instruments','app_settings'] loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_trigger()', t, t);
  end loop;
end $$;

-- app_settings has int id; give audit a uuid-safe path
create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  begin
    v_id := (to_jsonb(coalesce(new, old))->>'id')::uuid;
  exception when others then v_id := null;
  end;
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (tg_table_name, v_id, tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  return coalesce(new, old);
end $$;

-- ---------- Row-level security ----------
do $$ declare t text; begin
  foreach t in array array['profiles','doc_counters','app_settings','lookups','sample_types','test_methods','parameters',
    'standards','standard_limits','instruments','clients','client_contacts','client_sites','quotations','quotation_items',
    'purchase_orders','tasks','samples','sample_tests','reports','invoices','invoice_items','payments','audit_log'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- All active staff can read operational data (internal CRM)
do $$ declare t text; begin
  foreach t in array array['profiles','app_settings','lookups','sample_types','test_methods','parameters','standards',
    'standard_limits','instruments','clients','client_contacts','client_sites','quotations','quotation_items',
    'purchase_orders','tasks','samples','sample_tests','reports','invoices','invoice_items','payments'] loop
    execute format('create policy "staff read" on public.%I for select to authenticated using ((select public.is_staff()))', t);
  end loop;
end $$;

-- Write policies by role (admin is always included by has_role)
create or replace function public._write_policies(p_table text, p_roles text, p_delete_roles text default '{}') returns void
language plpgsql set search_path = public as $$
begin
  execute format('create policy "role insert" on public.%I for insert to authenticated with check ((select public.has_role(%L::public.app_role[])))', p_table, p_roles);
  execute format('create policy "role update" on public.%I for update to authenticated using ((select public.has_role(%L::public.app_role[]))) with check ((select public.has_role(%L::public.app_role[])))', p_table, p_roles, p_roles);
  execute format('create policy "role delete" on public.%I for delete to authenticated using ((select public.has_role(%L::public.app_role[])))', p_table, p_delete_roles);
end $$;

select public._write_policies('lookups',        '{tech_manager}', '{}');
select public._write_policies('sample_types',   '{tech_manager}', '{}');
select public._write_policies('test_methods',   '{tech_manager}', '{}');
select public._write_policies('parameters',     '{tech_manager,accounts}', '{}');
select public._write_policies('standards',      '{tech_manager}', '{}');
select public._write_policies('standard_limits','{tech_manager}', '{tech_manager}');
select public._write_policies('instruments',    '{tech_manager,analyst}', '{}');
select public._write_policies('clients',        '{accounts,tech_manager}', '{}');
select public._write_policies('client_contacts','{accounts,tech_manager}', '{accounts}');
select public._write_policies('client_sites',   '{accounts,tech_manager}', '{accounts}');
select public._write_policies('quotations',     '{accounts}', '{}');
select public._write_policies('quotation_items','{accounts}', '{accounts}');
select public._write_policies('purchase_orders','{accounts}', '{}');
select public._write_policies('samples',        '{sampler,analyst,tech_manager}', '{}');
select public._write_policies('sample_tests',   '{sampler,analyst,tech_manager}', '{tech_manager}');
select public._write_policies('reports',        '{analyst,tech_manager}', '{}');
select public._write_policies('invoices',       '{accounts}', '{}');
select public._write_policies('invoice_items',  '{accounts}', '{accounts}');
select public._write_policies('payments',       '{accounts}', '{accounts}');
drop function public._write_policies(text, text, text);

-- Tasks: managers create/assign; the assignee can update their own task
create policy "role insert" on public.tasks for insert to authenticated
  with check ((select public.has_role('{accounts,tech_manager}'::public.app_role[])));
create policy "role or assignee update" on public.tasks for update to authenticated
  using ((select public.has_role('{accounts,tech_manager}'::public.app_role[])) or assigned_to = (select auth.uid()))
  with check ((select public.has_role('{accounts,tech_manager}'::public.app_role[])) or assigned_to = (select auth.uid()));
create policy "admin delete" on public.tasks for delete to authenticated
  using ((select public.has_role('{}'::public.app_role[])));

-- Profiles: self or admin may update (role changes guarded by trigger)
create policy "self or admin update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.has_role('{}'::public.app_role[])))
  with check (id = (select auth.uid()) or (select public.has_role('{}'::public.app_role[])));

-- Settings: admin only
create policy "admin update" on public.app_settings for update to authenticated
  using ((select public.has_role('{}'::public.app_role[]))) with check ((select public.has_role('{}'::public.app_role[])));

-- Audit log: admin & technical manager read-only
create policy "audit read" on public.audit_log for select to authenticated
  using ((select public.has_role('{tech_manager}'::public.app_role[])));

-- doc_counters: no direct policies (only security-definer functions write it)

revoke execute on function public.next_doc_no(text, int, date) from public, anon;
grant execute on function public.next_doc_no(text, int, date) to authenticated;

-- ---------- Storage: private bucket for PO copies & attachments ----------
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy "staff read documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (select public.is_staff()));
create policy "staff upload documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (select public.has_role('{accounts,sampler,analyst,tech_manager}'::public.app_role[])));
create policy "admin delete documents" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (select public.has_role('{}'::public.app_role[])));

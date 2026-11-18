-- =====================================================================
-- Earthcon Lab — in-app notifications + "assign to" on reviewable records
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;
create policy "own read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "own update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own delete" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

-- Who a record is assigned to for review / follow-up
alter table public.reports add column reviewer_id uuid references public.profiles(id);
alter table public.invoices add column assigned_to uuid references public.profiles(id);
alter table public.quotations add column assigned_to uuid references public.profiles(id);
alter table public.vendor_pos add column assigned_to uuid references public.profiles(id);

-- ---------- Helpers ----------
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = auth.uid() then return; end if;      -- never notify yourself
  if not exists (select 1 from public.profiles where id = p_user and is_active) then return; end if;
  insert into public.notifications (user_id, actor_id, kind, title, body, link)
  values (p_user, auth.uid(), p_kind, p_title, p_body, p_link);
end $$;

-- Technical managers (or admins if the lab has none yet)
create or replace function public.notify_reviewers(p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_role public.app_role := 'tech_manager';
begin
  if not exists (select 1 from public.profiles where role = 'tech_manager' and is_active) then v_role := 'admin'; end if;
  for r in select id from public.profiles where role = v_role and is_active loop
    perform public.notify(r.id, p_kind, p_title, p_body, p_link);
  end loop;
end $$;

create or replace function public.actor_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(full_name, ''), email, 'Someone') from public.profiles where id = auth.uid()
$$;

-- ---------- Tasks ----------
create or replace function public.tasks_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'task_assigned', 'Task assigned to you: ' || new.title,
      coalesce(new.task_no, '') || coalesce(' · due ' || to_char(new.due_date, 'DD Mon YYYY'), '') || ' · by ' || coalesce(public.actor_name(), 'system'),
      '/tasks?mine=1');
  end if;
  if tg_op = 'UPDATE' and new.status = 'done' and old.status is distinct from 'done' then
    perform public.notify(new.created_by, 'task_done', 'Task completed: ' || new.title,
      coalesce(new.task_no, '') || ' · by ' || coalesce(public.actor_name(), 'system'), '/tasks?status=done');
  end if;
  return null;
end $$;
create trigger tasks_notify after insert or update of assigned_to, status on public.tasks
  for each row execute function public.tasks_notify();

-- ---------- Reports ----------
create or replace function public.reports_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link text := '/reports/' || new.id; v_sample text;
begin
  select sample_no into v_sample from public.samples where id = new.sample_id;
  if new.reviewer_id is not null and (tg_op = 'INSERT' or new.reviewer_id is distinct from old.reviewer_id) then
    perform public.notify(new.reviewer_id, 'report_review', 'Report ' || new.report_no || ' assigned to you for review',
      'Sample ' || coalesce(v_sample, '') || ' · by ' || coalesce(public.actor_name(), 'system'), v_link);
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'checked' then
      if new.reviewer_id is not null then
        perform public.notify(new.reviewer_id, 'report_checked', 'Report ' || new.report_no || ' is ready for approval',
          'Checked by ' || coalesce(public.actor_name(), 'system'), v_link);
      else
        perform public.notify_reviewers('report_checked', 'Report ' || new.report_no || ' is ready for approval',
          'Checked by ' || coalesce(public.actor_name(), 'system'), v_link);
      end if;
    elsif new.status = 'approved' then
      perform public.notify(new.prepared_by, 'report_approved', 'Report ' || new.report_no || ' approved',
        'Approved by ' || coalesce(public.actor_name(), 'system'), v_link);
    elsif new.status = 'cancelled' then
      perform public.notify(new.prepared_by, 'report_cancelled', 'Report ' || new.report_no || ' cancelled for revision',
        'By ' || coalesce(public.actor_name(), 'system'), v_link);
    end if;
  end if;
  return null;
end $$;
create trigger reports_notify after insert or update of reviewer_id, status on public.reports
  for each row execute function public.reports_notify();

-- ---------- Samples: all results entered ----------
create or replace function public.samples_notify() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'tested' and old.status is distinct from 'tested' then
    perform public.notify_reviewers('sample_tested', 'Sample ' || new.sample_no || ' ready for report',
      'All results entered', '/samples/' || new.id);
  end if;
  return null;
end $$;
create trigger samples_notify after update of status on public.samples
  for each row execute function public.samples_notify();

-- ---------- Invoices ----------
create or replace function public.invoices_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link text := '/invoices/' || new.id;
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'invoice_assigned', 'Invoice ' || new.invoice_no || ' assigned to you',
      'By ' || coalesce(public.actor_name(), 'system'), v_link);
  end if;
  if tg_op = 'UPDATE' and new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.notify(new.created_by, 'invoice_paid', 'Invoice ' || new.invoice_no || ' fully paid', null, v_link);
    if new.assigned_to is distinct from new.created_by then
      perform public.notify(new.assigned_to, 'invoice_paid', 'Invoice ' || new.invoice_no || ' fully paid', null, v_link);
    end if;
  end if;
  return null;
end $$;
create trigger invoices_notify after insert or update of assigned_to, status on public.invoices
  for each row execute function public.invoices_notify();

-- ---------- Quotations ----------
create or replace function public.quotations_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link text := '/quotations/' || new.id;
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'quotation_assigned', 'Quotation ' || new.quote_no || ' assigned to you',
      'By ' || coalesce(public.actor_name(), 'system'), v_link);
  end if;
  if tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.notify(new.created_by, 'quotation_accepted', 'Quotation ' || new.quote_no || ' accepted', null, v_link);
  end if;
  return null;
end $$;
create trigger quotations_notify after insert or update of assigned_to, status on public.quotations
  for each row execute function public.quotations_notify();

-- ---------- Vendor POs ----------
create or replace function public.vendor_pos_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_link text := '/vendor-pos/' || new.id;
begin
  if new.assigned_to is not null and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'vendor_po_assigned', 'Purchase order ' || new.po_no || ' assigned to you',
      'By ' || coalesce(public.actor_name(), 'system'), v_link);
  end if;
  if tg_op = 'UPDATE' and new.status = 'received' and old.status is distinct from 'received' then
    perform public.notify(new.created_by, 'vendor_po_received', 'Purchase order ' || new.po_no || ' fully received', null, v_link);
  end if;
  return null;
end $$;
create trigger vendor_pos_notify after insert or update of assigned_to, status on public.vendor_pos
  for each row execute function public.vendor_pos_notify();

-- ---------- New sign-ups → admins ----------
create or replace function public.profiles_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select id from public.profiles where role = 'admin' and is_active and id <> new.id loop
    insert into public.notifications (user_id, kind, title, body, link)
    values (r.id, 'user_signup', 'New staff sign-up: ' || coalesce(nullif(new.full_name, ''), new.email),
            'Assign a role in Users & Roles', '/users');
  end loop;
  return null;
end $$;
create trigger profiles_notify after insert on public.profiles
  for each row execute function public.profiles_notify();

-- Functions used only by triggers are not API-callable
do $$ declare f text; begin
  foreach f in array array['notify(uuid,text,text,text,text)','notify_reviewers(text,text,text,text)','actor_name()',
    'tasks_notify()','reports_notify()','samples_notify()','invoices_notify()','quotations_notify()','vendor_pos_notify()','profiles_notify()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

-- Live updates for the bell (RLS limits each user to their own rows)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

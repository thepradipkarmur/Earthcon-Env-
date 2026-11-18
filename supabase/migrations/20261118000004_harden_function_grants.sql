-- Trigger-only functions: never callable through the API
revoke execute on function public.assign_doc_numbers() from public, anon, authenticated;
revoke execute on function public.audit_trigger() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.report_rules() from public, anon, authenticated;
revoke execute on function public.sample_progress() from public, anon, authenticated;
revoke execute on function public.sample_test_rules() from public, anon, authenticated;
-- Role helpers are used inside RLS policies: signed-in users only
revoke execute on function public.has_role(public.app_role[]) from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.current_role_name() from public, anon;
grant execute on function public.has_role(public.app_role[]) to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_role_name() to authenticated;
-- Document numbers are only issued by triggers
revoke execute on function public.next_doc_no(text, int, date) from public, anon, authenticated;

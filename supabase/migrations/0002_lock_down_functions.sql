-- Supabase grants EXECUTE on every new function in public straight to anon,
-- authenticated and service_role (its default privileges), not through
-- PUBLIC. So 0001's `revoke all ... from public` left both security-definer
-- functions callable with nothing but the anon key, which ships inside the
-- app. Found by Supabase's security advisor on the first real project.
--
-- consume_quota takes any user id: anyone could have run another person's
-- daily model quota to zero. Only the edge functions, as service_role, call it.
revoke execute on function public.consume_quota(uuid, text, integer) from anon, authenticated;

-- Signed out, auth.uid() is null and the function raises — but there is no
-- reason to expose it at all. Signed-in users keep their grant from 0001.
revoke execute on function public.delete_all_my_data() from anon;

-- A trigger has no business resolving names through a caller's search_path.
-- now() lives in pg_catalog, which is always searched.
alter function public.touch_updated_at() set search_path = '';

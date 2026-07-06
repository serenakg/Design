-- ============================================================
-- SEED — the two workspaces + owner bootstrap
-- ============================================================

insert into public.workspaces (slug, name, brand_colour, brand_config)
values
  ('serena', 'Serena Gasparini', '#7C3AED', jsonb_build_object(
    'tagline', 'Fractional · Advisory + Board · Speaking + Workshops',
    'community_name', 'Delia',
    'accent_soft', '#EDE9FE'
  )),
  ('femnest', 'FemNEST', '#EC4899', jsonb_build_object(
    'tagline', 'Financial freedom for women — 50+ life transitions, mapped to money',
    'community_name', 'FemNEST Community',
    'accent_soft', '#FCE7F3'
  ))
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- OWNER BOOTSTRAP
-- After the owner signs up in the app, run (in the Supabase SQL editor):
--
--   select public.setup_owner('owner@example.com');
--
-- It promotes that account to owner, enables publishing, and grants
-- access to both workspaces. It only works while no owner exists,
-- and it cannot be called from the app (execute is revoked below) —
-- only from the SQL editor / service role.
-- ------------------------------------------------------------
create or replace function public.setup_owner(p_email text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if exists (select 1 from public.profiles where role = 'owner') then
    return 'An owner already exists — nothing changed.';
  end if;

  select id into v_user_id from public.profiles where email = p_email;
  if v_user_id is null then
    return 'No account found for ' || p_email || '. Sign up in the app first, then re-run this.';
  end if;

  update public.profiles
  set role = 'owner', can_publish = true
  where id = v_user_id;

  insert into public.workspace_access (user_id, workspace_id)
  select v_user_id, id from public.workspaces
  on conflict do nothing;

  return p_email || ' is now the owner with access to both workspaces.';
end;
$$;

revoke execute on function public.setup_owner(text) from public, anon, authenticated;

-- ============================================================
-- PHASE 7 — TEAM POLISH
-- Invites per workspace, publish-vs-draft permissions, and the
-- approval flows finalised — all manageable in-app, owner-only.
--   · an invite pre-authorises an email: role, publish rights, and
--     WHICH workspaces (some people see only one — by design)
--   · when that email signs up, the invite is applied automatically
--   · only the owner creates/revokes invites and edits permissions
--     (RLS from Phase 0 already enforces the latter)
--   · the platform can never lose its owner: demoting the last
--     owner is blocked at the database level
-- ============================================================

create table public.team_invites (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  role            text not null default 'editor' check (role in ('admin', 'editor')),
  can_publish     boolean not null default false,
  workspace_slugs text[] not null default '{}',
  invited_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz
);

-- one pending invite per email
create unique index team_invites_pending_email_idx
  on public.team_invites (lower(email)) where accepted_at is null;

alter table public.team_invites enable row level security;

create policy "owner manages invites" on public.team_invites
  for all using (public.is_owner()) with check (public.is_owner());

-- ------------------------------------------------------------
-- SIGNUP CONSUMES THE INVITE — recreate the Phase 0 trigger with
-- the invite hook: matching email gets its pre-authorised role,
-- publish rights, and workspace access. Everyone else still starts
-- with the least privilege and no access.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite record;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  select * into v_invite
  from public.team_invites
  where lower(email) = lower(new.email) and accepted_at is null
  order by created_at desc
  limit 1;

  -- "if found", not "if v_invite is not null": a record with any null
  -- field (accepted_at always is) makes IS NOT NULL false in plpgsql
  if found then
    update public.profiles
    set role = v_invite.role, can_publish = v_invite.can_publish
    where id = new.id;

    insert into public.workspace_access (user_id, workspace_id)
    select new.id, w.id
    from public.workspaces w
    where w.slug = any (v_invite.workspace_slugs)
    on conflict do nothing;

    update public.team_invites set accepted_at = now() where id = v_invite.id;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- NEVER OWNERLESS — the last owner cannot be demoted, by anyone.
-- ------------------------------------------------------------
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.role = 'owner' and new.role <> 'owner' then
    if not exists (
      select 1 from public.profiles
      where role = 'owner' and id <> old.id
    ) then
      raise exception 'The platform must always have an owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_owner
  before update on public.profiles
  for each row execute function public.protect_last_owner();

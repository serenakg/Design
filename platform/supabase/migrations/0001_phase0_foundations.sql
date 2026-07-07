-- ============================================================
-- PHASE 0 — FOUNDATIONS
-- Two walled workspaces (Serena Gasparini + FemNEST).
-- Rule #1: every workspace-scoped table carries workspace_id and
-- row-level security makes it impossible for a query in one
-- workspace to return the other's rows.
-- Rule #2: the approval gate is a database constraint, not a UI habit.
-- Rule #4: GDPR (consent, export, erasure) is in the schema from day one.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- WORKSPACES
-- ------------------------------------------------------------
create table public.workspaces (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  brand_colour text not null default '#7C3AED',
  brand_config jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PROFILES (team + owner; mirrors auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'editor' check (role in ('owner', 'admin', 'editor')),
  can_publish boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Which workspaces a user may enter. No row = no access. This table,
-- checked by RLS on every other table, IS the wall.
create table public.workspace_access (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  granted_at   timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

-- Auto-create a profile whenever someone signs up.
-- New users get the least-privileged role and NO workspace access;
-- the owner grants access explicitly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- RLS helper: does the current user have access to this workspace?
-- SECURITY DEFINER so policies can call it without recursive RLS.
-- ------------------------------------------------------------
create or replace function public.has_workspace_access(ws uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_access
    where user_id = auth.uid() and workspace_id = ws
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- ------------------------------------------------------------
-- CONTACTS — the spine. Every front door writes here.
-- consent_at is nullable on purpose: NULL means "no recorded consent"
-- and the app must treat that contact as un-emailable.
-- ------------------------------------------------------------
create table public.contacts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null,
  email        text not null,
  status       text not null default 'lead' check (status in ('lead', 'subscriber', 'paid')),
  source       text not null default 'manual',
  value        numeric(10, 2) not null default 0,
  tags         text[] not null default '{}',
  consent_at   timestamptz,
  consent_note text,
  joined_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create index contacts_workspace_idx on public.contacts (workspace_id);
create index contacts_status_idx on public.contacts (workspace_id, status);
create index contacts_tags_idx on public.contacts using gin (tags);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- POSTS (social) — the approval gate lives HERE, in the data.
-- A post cannot reach 'scheduled' or 'posted' without approved_by.
-- ------------------------------------------------------------
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  caption      text not null default '',
  media_url    text,
  platforms    text[] not null default '{}',
  status       text not null default 'draft'
               check (status in ('draft', 'pending_approval', 'scheduled', 'posted', 'rejected')),
  scheduled_at timestamptz,
  approved_by  uuid references public.profiles (id),
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  -- THE APPROVAL GATE: no sign-off, no publish. Not an honour system.
  constraint approval_gate check (
    status not in ('scheduled', 'posted') or approved_by is not null
  )
);

create index posts_workspace_idx on public.posts (workspace_id, status);

-- ------------------------------------------------------------
-- MEMBERS (community) — Phase 5 sits on this
-- ------------------------------------------------------------
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  contact_id   uuid not null references public.contacts (id) on delete cascade,
  tier         text not null default 'free',
  joined_at    timestamptz not null default now(),
  unique (workspace_id, contact_id)
);

-- ------------------------------------------------------------
-- COURSES / LESSONS / ENROLMENTS — Phase 6 sits on this
-- ------------------------------------------------------------
create table public.courses (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title        text not null,
  description  text not null default '',
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.lessons (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  title        text not null,
  content      text not null default '',
  video_url    text,
  position     int not null default 0
);

create table public.enrolments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  contact_id   uuid not null references public.contacts (id) on delete cascade,
  progress     jsonb not null default '{}'::jsonb,
  enrolled_at  timestamptz not null default now(),
  unique (course_id, contact_id)
);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY — the wall, enforced
-- ------------------------------------------------------------
alter table public.workspaces       enable row level security;
alter table public.profiles         enable row level security;
alter table public.workspace_access enable row level security;
alter table public.contacts         enable row level security;
alter table public.posts            enable row level security;
alter table public.members          enable row level security;
alter table public.courses          enable row level security;
alter table public.lessons          enable row level security;
alter table public.enrolments       enable row level security;

-- Workspaces: visible only to users granted access.
create policy "read own workspaces" on public.workspaces
  for select using (public.has_workspace_access(id));

-- Profiles: you see yourself; the owner sees the team.
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy "owner manages profiles" on public.profiles
  for update using (public.is_owner());

-- Workspace access: you see your own grants; only the owner grants/revokes.
create policy "read own access" on public.workspace_access
  for select using (user_id = auth.uid() or public.is_owner());
create policy "owner grants access" on public.workspace_access
  for insert with check (public.is_owner());
create policy "owner revokes access" on public.workspace_access
  for delete using (public.is_owner());

-- Every workspace-scoped table gets the same four policies:
-- you can only touch rows in workspaces you belong to, and you can
-- never move a row into a workspace you don't belong to.
create policy "wall select" on public.contacts for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.contacts for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.contacts for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.contacts for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.posts for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.posts for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.posts for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.posts for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.members for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.members for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.members for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.members for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.courses for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.courses for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.courses for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.courses for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.lessons for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.lessons for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.lessons for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.lessons for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.enrolments for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.enrolments for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.enrolments for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.enrolments for delete using (public.has_workspace_access(workspace_id));

-- ------------------------------------------------------------
-- GDPR — right of access + right to erasure, as database functions
-- ------------------------------------------------------------

-- Export everything held about one contact (data-portability / SAR).
create or replace function public.gdpr_export_contact(p_contact_id uuid)
returns jsonb
language plpgsql
security invoker set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'exported_at', now(),
    'contact', to_jsonb(c),
    'community_memberships', coalesce((select jsonb_agg(to_jsonb(m)) from public.members m where m.contact_id = c.id), '[]'::jsonb),
    'course_enrolments', coalesce((select jsonb_agg(to_jsonb(e)) from public.enrolments e where e.contact_id = c.id), '[]'::jsonb)
  )
  into result
  from public.contacts c
  where c.id = p_contact_id;

  if result is null then
    raise exception 'Contact not found or not accessible';
  end if;
  return result;
end;
$$;

-- Erase one contact and every row that references them
-- (right to be forgotten). SECURITY INVOKER: RLS still applies,
-- so you can only erase contacts in workspaces you can access.
create or replace function public.gdpr_delete_contact(p_contact_id uuid)
returns void
language plpgsql
security invoker set search_path = public
as $$
begin
  delete from public.contacts where id = p_contact_id;
  if not found then
    raise exception 'Contact not found or not accessible';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- FILE STORAGE — one private bucket per workspace, walled like the tables
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('serena-media', 'serena-media', false),
       ('femnest-media', 'femnest-media', false)
on conflict (id) do nothing;

create policy "serena bucket wall" on storage.objects for all
  using (
    bucket_id = 'serena-media'
    and public.has_workspace_access((select id from public.workspaces where slug = 'serena'))
  )
  with check (
    bucket_id = 'serena-media'
    and public.has_workspace_access((select id from public.workspaces where slug = 'serena'))
  );

create policy "femnest bucket wall" on storage.objects for all
  using (
    bucket_id = 'femnest-media'
    and public.has_workspace_access((select id from public.workspaces where slug = 'femnest'))
  )
  with check (
    bucket_id = 'femnest-media'
    and public.has_workspace_access((select id from public.workspaces where slug = 'femnest'))
  );

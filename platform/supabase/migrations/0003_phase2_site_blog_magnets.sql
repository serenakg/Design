-- ============================================================
-- PHASE 2 — PUBLIC SITE + BLOG + LEAD MAGNETS
-- Public pages read through narrow, deliberate openings in the wall
-- (published posts, active magnets, a branding view). Everything
-- else stays walled. The approval gate now guards blog publishing
-- too, and gains teeth: only can_publish users can approve, enforced
-- by trigger — an editor cannot self-approve.
-- ============================================================

-- ------------------------------------------------------------
-- BLOG POSTS
-- ------------------------------------------------------------
create table public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  slug         text not null check (slug ~ '^[a-z0-9-]+$'),
  title        text not null,
  excerpt      text not null default '',
  content      text not null default '',
  status       text not null default 'draft'
               check (status in ('draft', 'pending_approval', 'published')),
  approved_by  uuid references public.profiles (id),
  created_by   uuid references public.profiles (id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, slug),
  -- THE APPROVAL GATE, again: no sign-off, no publish.
  constraint blog_approval_gate check (
    status <> 'published' or approved_by is not null
  )
);

create index blog_posts_workspace_idx on public.blog_posts (workspace_id, status);
create index blog_posts_published_idx on public.blog_posts (workspace_id, published_at desc)
  where status = 'published';

create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- LEAD MAGNETS
-- ------------------------------------------------------------
create table public.lead_magnets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  slug         text not null check (slug ~ '^[a-z0-9-]+$'),
  title        text not null,
  description  text not null default '',
  file_url     text not null default '',
  tag          text not null default 'lead-magnet',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index lead_magnets_workspace_idx on public.lead_magnets (workspace_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.blog_posts   enable row level security;
alter table public.lead_magnets enable row level security;

-- The wall, same as every other table…
create policy "wall select" on public.blog_posts for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.blog_posts for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.blog_posts for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.blog_posts for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.lead_magnets for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.lead_magnets for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.lead_magnets for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.lead_magnets for delete using (public.has_workspace_access(workspace_id));

-- …plus the deliberate public openings: published posts and active
-- magnets are public content (they're on the public site by definition).
-- Drafts and pending posts stay behind the wall.
create policy "public read published" on public.blog_posts
  for select to anon, authenticated using (status = 'published');
create policy "public read active" on public.lead_magnets
  for select to anon, authenticated using (active = true);

-- ------------------------------------------------------------
-- BRANDING VIEW — the public site needs name/colour/tagline without
-- opening the workspaces table itself (whose RLS drives the switcher).
-- Owner-rights view, exposing only brand-safe columns.
-- ------------------------------------------------------------
create view public.workspace_branding as
  select id, slug, name, brand_colour, brand_config
  from public.workspaces;

grant select on public.workspace_branding to anon, authenticated;

-- ------------------------------------------------------------
-- APPROVAL RIGHTS — the gate gains teeth. Publishing states can only
-- be entered by a profile with can_publish; approved_by is stamped
-- from the actual session, not from form data. Applies to blog posts
-- AND social posts. (auth.uid() is null for the SQL editor / service
-- role, which stays able to administrate.)
-- ------------------------------------------------------------
create or replace function public.enforce_publish_rights()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status in ('published', 'scheduled', 'posted') then
    if auth.uid() is not null then
      if not exists (
        select 1 from public.profiles
        where id = auth.uid() and can_publish
      ) then
        raise exception 'Publishing requires sign-off rights (can_publish)';
      end if;
      new.approved_by := auth.uid();
    end if;
    if new.approved_by is null then
      raise exception 'Nothing publishes without approval';
    end if;
    -- nested on purpose: "posts" has no published_at column, and SQL
    -- does not short-circuit record field access
    if tg_table_name = 'blog_posts' then
      if new.published_at is null then
        new.published_at := now();
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger blog_posts_publish_rights
  before insert or update on public.blog_posts
  for each row execute function public.enforce_publish_rights();

create trigger posts_publish_rights
  before insert or update on public.posts
  for each row execute function public.enforce_publish_rights();

-- ------------------------------------------------------------
-- THE FRONT DOOR INTO THE SPINE — claiming a lead magnet creates a
-- contact, with consent, in the right workspace. SECURITY DEFINER
-- because anonymous visitors have no workspace access; the function
-- itself is the narrow, validated opening.
-- ------------------------------------------------------------
create or replace function public.claim_lead_magnet(
  p_workspace_slug text,
  p_magnet_slug    text,
  p_name           text,
  p_email          text,
  p_consent        boolean
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_magnet record;
  v_email  text := lower(trim(p_email));
  v_name   text := trim(p_name);
begin
  -- GDPR: no consent, no contact record. Full stop.
  if not coalesce(p_consent, false) then
    raise exception 'Consent is required';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address';
  end if;
  if v_name = '' or length(v_name) > 200 or length(v_email) > 320 then
    raise exception 'Please enter your name';
  end if;

  select m.*, w.name as workspace_name into v_magnet
  from public.lead_magnets m
  join public.workspaces w on w.id = m.workspace_id
  where w.slug = p_workspace_slug and m.slug = p_magnet_slug and m.active;

  if v_magnet is null then
    raise exception 'This download is not available';
  end if;

  insert into public.contacts
    (workspace_id, name, email, status, source, tags, consent_at, consent_note)
  values
    (v_magnet.workspace_id, v_name, v_email, 'lead',
     'lead-magnet:' || v_magnet.slug,
     array[v_magnet.tag],
     now(),
     'Opted in via lead magnet "' || v_magnet.title || '"')
  on conflict (workspace_id, email) do update
    set tags = (select array(select distinct t from unnest(contacts.tags || excluded.tags) as t)),
        consent_at = coalesce(contacts.consent_at, excluded.consent_at),
        consent_note = coalesce(contacts.consent_note, excluded.consent_note);

  return jsonb_build_object(
    'title', v_magnet.title,
    'file_url', v_magnet.file_url
  );
end;
$$;

grant execute on function public.claim_lead_magnet(text, text, text, text, boolean)
  to anon, authenticated;

-- ------------------------------------------------------------
-- PUBLIC STORAGE — one public bucket per workspace for freebie files
-- and site images. Public to read (that's the point of a freebie);
-- writes stay behind the wall.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('serena-public', 'serena-public', true),
       ('femnest-public', 'femnest-public', true)
on conflict (id) do nothing;

create policy "public buckets read" on storage.objects for select
  using (bucket_id in ('serena-public', 'femnest-public'));

create policy "serena public bucket write" on storage.objects for insert
  with check (
    bucket_id = 'serena-public'
    and public.has_workspace_access((select id from public.workspaces where slug = 'serena'))
  );
create policy "serena public bucket delete" on storage.objects for delete
  using (
    bucket_id = 'serena-public'
    and public.has_workspace_access((select id from public.workspaces where slug = 'serena'))
  );

create policy "femnest public bucket write" on storage.objects for insert
  with check (
    bucket_id = 'femnest-public'
    and public.has_workspace_access((select id from public.workspaces where slug = 'femnest'))
  );
create policy "femnest public bucket delete" on storage.objects for delete
  using (
    bucket_id = 'femnest-public'
    and public.has_workspace_access((select id from public.workspaces where slug = 'femnest'))
  );

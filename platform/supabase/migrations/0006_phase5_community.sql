-- ============================================================
-- PHASE 5 — COMMUNITY (Delia inside Serena · FemNEST community)
-- Two communities, one per workspace, walled like everything else.
-- DELIA rules apply hard here:
--   E — content warnings are a first-class column; moderation
--       (hide/remove + a flag queue) is built in, not bolted on
--   L — no streaks, no "last seen", nothing punishes being offline
--   I — tiers support sliding-scale pricing via Stripe
--   D — profiles ask for a chosen display name and optional pronouns
-- Community members authenticate like everyone else, but their key
-- is a members row (user_id), NOT workspace_access — members never
-- gain team access to contacts, email, or drafts.
-- ============================================================

-- ------------------------------------------------------------
-- MEMBERS — extend Phase 0's table into real community membership
-- ------------------------------------------------------------
alter table public.members
  add column user_id       uuid references public.profiles (id) on delete cascade,
  add column display_name  text not null default '',
  add column pronouns      text not null default '',
  add column bio           text not null default '';

create unique index members_user_workspace_idx
  on public.members (workspace_id, user_id) where user_id is not null;

-- ------------------------------------------------------------
-- SPACES — the rooms of the community
-- ------------------------------------------------------------
create table public.spaces (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  slug         text not null check (slug ~ '^[a-z0-9-]+$'),
  name         text not null,
  description  text not null default '',
  position     int not null default 0,
  paid_only    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (workspace_id, slug)
);

-- ------------------------------------------------------------
-- POSTS + COMMENTS — with content warnings and moderation states
-- ------------------------------------------------------------
create table public.space_posts (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  space_id         uuid not null references public.spaces (id) on delete cascade,
  author_member_id uuid not null references public.members (id) on delete cascade,
  title            text not null default '',
  body             text not null,
  content_warning  text not null default '',
  status           text not null default 'published'
                   check (status in ('published', 'hidden', 'removed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index space_posts_feed_idx on public.space_posts (space_id, created_at desc);

create trigger space_posts_touch before update on public.space_posts
  for each row execute function public.touch_updated_at();

create table public.space_comments (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  post_id          uuid not null references public.space_posts (id) on delete cascade,
  author_member_id uuid not null references public.members (id) on delete cascade,
  body             text not null,
  status           text not null default 'published'
                   check (status in ('published', 'hidden', 'removed')),
  created_at       timestamptz not null default now()
);

create index space_comments_post_idx on public.space_comments (post_id, created_at);

-- ------------------------------------------------------------
-- FLAGS — the report button. Reports go to the team, quietly.
-- ------------------------------------------------------------
create table public.flags (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  target_type        text not null check (target_type in ('post', 'comment')),
  target_id          uuid not null,
  reporter_member_id uuid references public.members (id) on delete set null,
  reason             text not null default '',
  status             text not null default 'open'
                     check (status in ('open', 'resolved')),
  created_at         timestamptz not null default now()
);

create index flags_queue_idx on public.flags (workspace_id, status);

-- ------------------------------------------------------------
-- STRIPE EVENTS — idempotency + audit for the paywall webhook
-- ------------------------------------------------------------
create table public.stripe_events (
  id           text primary key,   -- Stripe event id
  workspace_id uuid references public.workspaces (id) on delete set null,
  type         text not null default '',
  email        text,
  amount       numeric(10,2),
  outcome      text not null default '',
  received_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- RLS HELPERS — membership is the community key
-- ------------------------------------------------------------
create or replace function public.is_community_member(ws uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create or replace function public.my_member_id(ws uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select id from public.members
  where workspace_id = ws and user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.spaces         enable row level security;
alter table public.space_posts    enable row level security;
alter table public.space_comments enable row level security;
alter table public.flags          enable row level security;
alter table public.stripe_events  enable row level security;

-- members (Phase 0 gave the team wall policies): members can see
-- their own row, see fellow members of THEIR community (for author
-- names), and edit their own profile.
create policy "member reads own community" on public.members
  for select using (public.is_community_member(workspace_id) or user_id = auth.uid());
create policy "member edits own profile" on public.members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- spaces: members + team read; only the team shapes the rooms
create policy "community select" on public.spaces
  for select using (public.is_community_member(workspace_id) or public.has_workspace_access(workspace_id));
create policy "team insert" on public.spaces
  for insert with check (public.has_workspace_access(workspace_id));
create policy "team update" on public.spaces
  for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "team delete" on public.spaces
  for delete using (public.has_workspace_access(workspace_id));

-- posts: members see published (plus their own regardless of state,
-- so moderation never silently gaslights an author); team sees all
create policy "community select" on public.space_posts
  for select using (
    (public.is_community_member(workspace_id)
      and (status = 'published' or author_member_id = public.my_member_id(workspace_id)))
    or public.has_workspace_access(workspace_id)
  );
create policy "member insert" on public.space_posts
  for insert with check (
    public.is_community_member(workspace_id)
    and author_member_id = public.my_member_id(workspace_id)
    and status = 'published'
  );
create policy "author update" on public.space_posts
  for update using (author_member_id = public.my_member_id(workspace_id))
  with check (author_member_id = public.my_member_id(workspace_id));
create policy "team moderate" on public.space_posts
  for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "team delete" on public.space_posts
  for delete using (public.has_workspace_access(workspace_id));

-- comments: same shape
create policy "community select" on public.space_comments
  for select using (
    (public.is_community_member(workspace_id)
      and (status = 'published' or author_member_id = public.my_member_id(workspace_id)))
    or public.has_workspace_access(workspace_id)
  );
create policy "member insert" on public.space_comments
  for insert with check (
    public.is_community_member(workspace_id)
    and author_member_id = public.my_member_id(workspace_id)
    and status = 'published'
  );
create policy "author update" on public.space_comments
  for update using (author_member_id = public.my_member_id(workspace_id))
  with check (author_member_id = public.my_member_id(workspace_id));
create policy "team moderate" on public.space_comments
  for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "team delete" on public.space_comments
  for delete using (public.has_workspace_access(workspace_id));

-- flags: members file them; only the team reads the queue
create policy "member flags" on public.flags
  for insert with check (
    public.is_community_member(workspace_id)
    and reporter_member_id = public.my_member_id(workspace_id)
  );
create policy "team reads flags" on public.flags
  for select using (public.has_workspace_access(workspace_id));
create policy "team resolves flags" on public.flags
  for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));

-- stripe events: team read only; writes happen via the service role
create policy "team reads stripe events" on public.stripe_events
  for select using (workspace_id is not null and public.has_workspace_access(workspace_id));

-- ------------------------------------------------------------
-- JOINING — a logged-in user becomes a member (free tier). Creates
-- their contact in that workspace's spine; email consent is a
-- SEPARATE, explicit choice — joining never implies marketing email.
-- ------------------------------------------------------------
create or replace function public.join_community(
  p_workspace_slug text,
  p_display_name   text,
  p_email_consent  boolean default false
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_ws record;
  v_profile record;
  v_contact_id uuid;
  v_member_id uuid;
  v_name text := trim(p_display_name);
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if v_name = '' or length(v_name) > 100 then
    raise exception 'Pick a display name';
  end if;

  select id, slug into v_ws from public.workspaces where slug = p_workspace_slug;
  if v_ws is null then
    raise exception 'Community not found';
  end if;

  select id, email, full_name into v_profile from public.profiles where id = auth.uid();

  if exists (select 1 from public.members where workspace_id = v_ws.id and user_id = auth.uid()) then
    return (select id from public.members where workspace_id = v_ws.id and user_id = auth.uid());
  end if;

  insert into public.contacts (workspace_id, name, email, status, source, tags, consent_at, consent_note)
  values (
    v_ws.id,
    coalesce(nullif(v_profile.full_name, ''), v_name),
    lower(v_profile.email),
    'subscriber',
    'community-join',
    array['community'],
    case when p_email_consent then now() end,
    case when p_email_consent then 'Opted in to emails when joining the community' end
  )
  on conflict (workspace_id, email) do update
    set tags = (select array(select distinct t from unnest(contacts.tags || excluded.tags) as t)),
        consent_at = coalesce(contacts.consent_at, excluded.consent_at)
  returning id into v_contact_id;

  insert into public.members (workspace_id, contact_id, user_id, tier, display_name)
  values (v_ws.id, v_contact_id, auth.uid(), 'free', v_name)
  returning id into v_member_id;

  return v_member_id;
end;
$$;

grant execute on function public.join_community(text, text, boolean) to authenticated;
revoke execute on function public.join_community(text, text, boolean) from anon;

-- ------------------------------------------------------------
-- THE PAYWALL — records a Stripe payment (called by the webhook
-- route with the service role only). Idempotent per Stripe event.
-- Upgrades the member to paid and reflects the payment on the spine.
-- ------------------------------------------------------------
create or replace function public.record_stripe_payment(
  p_event_id       text,
  p_workspace_slug text,
  p_email          text,
  p_amount         numeric
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_ws record;
  v_contact record;
  v_outcome text;
begin
  select id into v_ws from public.workspaces where slug = p_workspace_slug;

  -- idempotency: seen this event before? do nothing.
  insert into public.stripe_events (id, workspace_id, type, email, amount, outcome)
  values (p_event_id, v_ws.id, 'checkout.session.completed', lower(p_email), p_amount, 'processing')
  on conflict (id) do nothing;
  if not found then
    return 'duplicate';
  end if;

  if v_ws is null then
    update public.stripe_events set outcome = 'unknown_workspace' where id = p_event_id;
    return 'unknown_workspace';
  end if;

  select * into v_contact from public.contacts
  where workspace_id = v_ws.id and email = lower(p_email);

  if v_contact is null then
    update public.stripe_events set outcome = 'no_matching_contact' where id = p_event_id;
    return 'no_matching_contact';
  end if;

  update public.contacts
  set status = 'paid', value = value + coalesce(p_amount, 0)
  where id = v_contact.id;

  update public.members
  set tier = 'paid'
  where workspace_id = v_ws.id and contact_id = v_contact.id;

  update public.stripe_events set outcome = 'upgraded' where id = p_event_id;
  return 'upgraded';
end;
$$;

revoke execute on function public.record_stripe_payment(text, text, text, numeric)
  from public, anon, authenticated;

-- ------------------------------------------------------------
-- STARTER SPACES — one welcoming room each, ready on day one
-- ------------------------------------------------------------
insert into public.spaces (workspace_id, slug, name, description, position)
select id, 'welcome', 'Welcome', 'Introduce yourself — at whatever pace suits you. There''s no catching up to do here.', 0
from public.workspaces
on conflict do nothing;

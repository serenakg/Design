-- ============================================================
-- PHASE 3 — EMAIL + FUNNELS
-- Sequences (welcome/nurture) and broadcasts, per workspace, in that
-- workspace's voice. The rules carry over:
--   · consent is the law: a contact with no consent_at is never
--     emailed — enforced in the queueing functions, and one-click
--     unsubscribe simply clears consent
--   · the approval gate guards email too: a sequence can't go active
--     and a broadcast can't be scheduled without can_publish sign-off
--   · everything is walled by workspace_id like every other table
-- Sending itself is done by a cron-called API route using Resend;
-- the queue functions below are service-role only.
-- ============================================================

-- ------------------------------------------------------------
-- SEQUENCES — automated series (welcome, nurture)
-- ------------------------------------------------------------
create table public.email_sequences (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null,
  trigger_event text not null default 'contact_created'
                check (trigger_event in ('contact_created', 'lead_magnet')),
  status        text not null default 'draft'
                check (status in ('draft', 'pending_approval', 'active', 'paused')),
  approved_by   uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  -- THE APPROVAL GATE: no sign-off, no automation.
  constraint sequence_approval_gate check (
    status <> 'active' or approved_by is not null
  )
);

create index email_sequences_workspace_idx on public.email_sequences (workspace_id, status);

create table public.sequence_emails (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  sequence_id  uuid not null references public.email_sequences (id) on delete cascade,
  position     int not null default 1,
  delay_hours  int not null default 0 check (delay_hours >= 0),
  subject      text not null,
  body         text not null default '',
  created_at   timestamptz not null default now(),
  unique (sequence_id, position)
);

-- ------------------------------------------------------------
-- ENROLMENTS — which contact is where in which sequence
-- ------------------------------------------------------------
create table public.sequence_enrolments (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  sequence_id      uuid not null references public.email_sequences (id) on delete cascade,
  contact_id       uuid not null references public.contacts (id) on delete cascade,
  current_position int not null default 0,
  last_email_at    timestamptz,
  enrolled_at      timestamptz not null default now(),
  completed_at     timestamptz,
  unique (sequence_id, contact_id)
);

create index sequence_enrolments_due_idx on public.sequence_enrolments (sequence_id)
  where completed_at is null;

-- ------------------------------------------------------------
-- BROADCASTS — one-off sends to a segment
-- ------------------------------------------------------------
create table public.broadcasts (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  subject        text not null,
  body           text not null default '',
  segment_status text not null default 'all'
                 check (segment_status in ('all', 'lead', 'subscriber', 'paid')),
  segment_tag    text not null default '',
  status         text not null default 'draft'
                 check (status in ('draft', 'pending_approval', 'scheduled', 'sending', 'sent')),
  scheduled_at   timestamptz,
  approved_by    uuid references public.profiles (id),
  created_by     uuid references public.profiles (id),
  created_at     timestamptz not null default now(),
  constraint broadcast_approval_gate check (
    status not in ('scheduled', 'sending', 'sent') or approved_by is not null
  )
);

create index broadcasts_workspace_idx on public.broadcasts (workspace_id, status);

-- ------------------------------------------------------------
-- EMAIL LOG — every send, skip, and failure. Never silent-fail.
-- ------------------------------------------------------------
create table public.email_log (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  contact_id        uuid references public.contacts (id) on delete set null,
  sequence_email_id uuid references public.sequence_emails (id) on delete set null,
  broadcast_id      uuid references public.broadcasts (id) on delete set null,
  to_email          text not null,
  subject           text not null,
  body              text not null default '',
  status            text not null default 'queued'
                    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped_no_consent')),
  error             text,
  resend_id         text,
  queued_at         timestamptz not null default now(),
  sent_at           timestamptz
);

create index email_log_workspace_idx on public.email_log (workspace_id, queued_at desc);
create index email_log_status_idx on public.email_log (status) where status in ('queued', 'sending');

-- ------------------------------------------------------------
-- FUNNEL LINK — a lead magnet can drop its claimants into a sequence:
-- landing page → capture → sequence → offer. That's the funnel.
-- ------------------------------------------------------------
alter table public.lead_magnets
  add column sequence_id uuid references public.email_sequences (id) on delete set null;

-- ------------------------------------------------------------
-- RLS — the wall, as everywhere
-- ------------------------------------------------------------
alter table public.email_sequences     enable row level security;
alter table public.sequence_emails     enable row level security;
alter table public.sequence_enrolments enable row level security;
alter table public.broadcasts          enable row level security;
alter table public.email_log           enable row level security;

create policy "wall select" on public.email_sequences for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.email_sequences for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.email_sequences for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.email_sequences for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.sequence_emails for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.sequence_emails for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.sequence_emails for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.sequence_emails for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.sequence_enrolments for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.sequence_enrolments for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.sequence_enrolments for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.sequence_enrolments for delete using (public.has_workspace_access(workspace_id));

create policy "wall select" on public.broadcasts for select using (public.has_workspace_access(workspace_id));
create policy "wall insert" on public.broadcasts for insert with check (public.has_workspace_access(workspace_id));
create policy "wall update" on public.broadcasts for update using (public.has_workspace_access(workspace_id)) with check (public.has_workspace_access(workspace_id));
create policy "wall delete" on public.broadcasts for delete using (public.has_workspace_access(workspace_id));

-- The log is read-only for the team; only the queue functions write it.
create policy "wall select" on public.email_log for select using (public.has_workspace_access(workspace_id));

-- ------------------------------------------------------------
-- APPROVAL GATE TRIGGER — extended to cover 'active' sequences and
-- broadcast scheduling. Same function guards posts + blog_posts.
-- ------------------------------------------------------------
create or replace function public.enforce_publish_rights()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status in ('published', 'scheduled', 'posted', 'active') then
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
    -- nested on purpose: only blog_posts has published_at, and SQL
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

create trigger email_sequences_publish_rights
  before insert or update on public.email_sequences
  for each row execute function public.enforce_publish_rights();

create trigger broadcasts_publish_rights
  before insert or update on public.broadcasts
  for each row execute function public.enforce_publish_rights();

-- ------------------------------------------------------------
-- AUTO-ENROLMENT — every new contact joins that workspace's active
-- 'contact_created' sequences. The right sequence, the right
-- workspace, automatically.
-- ------------------------------------------------------------
create or replace function public.enroll_new_contact()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.sequence_enrolments (workspace_id, sequence_id, contact_id)
  select new.workspace_id, s.id, new.id
  from public.email_sequences s
  where s.workspace_id = new.workspace_id
    and s.status = 'active'
    and s.trigger_event = 'contact_created'
  on conflict do nothing;
  return new;
end;
$$;

create trigger contacts_auto_enroll
  after insert on public.contacts
  for each row execute function public.enroll_new_contact();

-- ------------------------------------------------------------
-- LEAD MAGNET → SEQUENCE — claiming a magnet also enrols the contact
-- in the magnet's linked sequence (if one is set and active).
-- Recreates claim_lead_magnet from 0003 with the funnel hook added.
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
  v_contact_id uuid;
begin
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
        consent_note = coalesce(contacts.consent_note, excluded.consent_note)
  returning id into v_contact_id;

  -- The funnel hook: capture → sequence
  if v_magnet.sequence_id is not null then
    insert into public.sequence_enrolments (workspace_id, sequence_id, contact_id)
    select v_magnet.workspace_id, s.id, v_contact_id
    from public.email_sequences s
    where s.id = v_magnet.sequence_id and s.status = 'active'
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'title', v_magnet.title,
    'file_url', v_magnet.file_url
  );
end;
$$;

-- ------------------------------------------------------------
-- UNSUBSCRIBE — one click, no login, no dark patterns. Clearing
-- consent_at is all it takes: the queue functions skip contacts
-- without consent.
-- ------------------------------------------------------------
create or replace function public.unsubscribe_contact(p_contact_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  update public.contacts
  set consent_at = null,
      consent_note = 'Unsubscribed on ' || to_char(now(), 'YYYY-MM-DD')
  where id = p_contact_id;
  return found;
end;
$$;

grant execute on function public.unsubscribe_contact(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- QUEUE FUNCTIONS — service-role only (the cron route). Execute is
-- revoked from app roles below.
-- ------------------------------------------------------------

-- 1) Move due sequence steps into the log (or skip without consent).
create or replace function public.queue_due_sequence_emails()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  v_queued int := 0;
begin
  for r in
    select e.id as enrolment_id, e.workspace_id, e.contact_id,
           c.email as to_email, c.consent_at,
           se.id as sequence_email_id, se.position, se.subject, se.body
    from public.sequence_enrolments e
    join public.email_sequences s on s.id = e.sequence_id and s.status = 'active'
    join public.sequence_emails se on se.sequence_id = e.sequence_id
                                  and se.position = e.current_position + 1
    join public.contacts c on c.id = e.contact_id
    where e.completed_at is null
      and coalesce(e.last_email_at, e.enrolled_at)
          + make_interval(hours => se.delay_hours) <= now()
    order by e.enrolled_at
    limit 200
    for update of e skip locked
  loop
    insert into public.email_log
      (workspace_id, contact_id, sequence_email_id, to_email, subject, body, status)
    values
      (r.workspace_id, r.contact_id, r.sequence_email_id, r.to_email,
       r.subject, r.body,
       case when r.consent_at is null then 'skipped_no_consent' else 'queued' end);

    update public.sequence_enrolments
    set current_position = r.position,
        last_email_at = now(),
        completed_at = case when not exists (
          select 1 from public.sequence_emails nxt
          where nxt.sequence_id = sequence_enrolments.sequence_id
            and nxt.position > r.position
        ) then now() end
    where id = r.enrolment_id;

    if r.consent_at is not null then
      v_queued := v_queued + 1;
    end if;
  end loop;
  return v_queued;
end;
$$;

-- 2) Expand due broadcasts into the log — consented, matching contacts only.
create or replace function public.queue_due_broadcasts()
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  b record;
  v_queued int := 0;
begin
  for b in
    select * from public.broadcasts
    where status = 'scheduled' and scheduled_at <= now()
    for update skip locked
  loop
    insert into public.email_log
      (workspace_id, contact_id, broadcast_id, to_email, subject, body, status)
    select b.workspace_id, c.id, b.id, c.email, b.subject, b.body, 'queued'
    from public.contacts c
    where c.workspace_id = b.workspace_id
      and c.consent_at is not null
      and (b.segment_status = 'all' or c.status = b.segment_status)
      and (b.segment_tag = '' or b.segment_tag = any (c.tags));

    get diagnostics v_queued = row_count;
    update public.broadcasts set status = 'sending' where id = b.id;
  end loop;
  return v_queued;
end;
$$;

-- 3) Hand queued mail to the sender (flips queued → sending).
create or replace function public.take_queued_emails(p_limit int default 50)
returns table (
  log_id uuid,
  to_email text,
  contact_id uuid,
  contact_name text,
  subject text,
  body text,
  workspace_slug text,
  workspace_name text,
  brand_config jsonb,
  broadcast_id uuid
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with taken as (
    select l.id from public.email_log l
    where l.status = 'queued'
    order by l.queued_at
    limit p_limit
    for update skip locked
  )
  update public.email_log l
  set status = 'sending'
  from taken, public.workspaces w
  where l.id = taken.id
    and w.id = l.workspace_id
  returning l.id, l.to_email, l.contact_id,
            -- contact may be gone (GDPR erase) — the send still resolves
            coalesce((select c.name from public.contacts c where c.id = l.contact_id), ''),
            l.subject, l.body, w.slug, w.name, w.brand_config, l.broadcast_id;
end;
$$;

-- 4) Record the outcome. Never silent-fail: failures keep the error.
create or replace function public.finish_email(
  p_log_id uuid,
  p_ok boolean,
  p_resend_id text default null,
  p_error text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_broadcast uuid;
begin
  update public.email_log
  set status = case when p_ok then 'sent' else 'failed' end,
      resend_id = p_resend_id,
      error = p_error,
      sent_at = case when p_ok then now() end
  where id = p_log_id
  returning email_log.broadcast_id into v_broadcast;

  -- when a broadcast has nothing left in flight, mark it sent
  if v_broadcast is not null then
    update public.broadcasts b
    set status = 'sent'
    where b.id = v_broadcast
      and b.status = 'sending'
      and not exists (
        select 1 from public.email_log l
        where l.broadcast_id = v_broadcast and l.status in ('queued', 'sending')
      );
  end if;
end;
$$;

revoke execute on function public.queue_due_sequence_emails() from public, anon, authenticated;
revoke execute on function public.queue_due_broadcasts() from public, anon, authenticated;
revoke execute on function public.take_queued_emails(int) from public, anon, authenticated;
revoke execute on function public.finish_email(uuid, boolean, text, text) from public, anon, authenticated;

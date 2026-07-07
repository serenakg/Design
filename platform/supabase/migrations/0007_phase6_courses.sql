-- ============================================================
-- PHASE 6 — COURSES
-- Gated lessons + progress, sitting on top of community membership,
-- with access keyed to the contact record (enrolments.contact_id).
-- The tables exist since Phase 0; this opens them to members:
--   · members see PUBLISHED courses in their own community only
--   · paid_only courses need the paid tier (the Stripe paywall)
--   · members enrol themselves and own their progress
--   · publishing a course requires can_publish (rule #2, again)
--   · progress is private and shame-free: no deadlines, no streaks,
--     no expiry — DELIA Life-Centred
-- ============================================================

alter table public.courses
  add column paid_only boolean not null default false;

-- ------------------------------------------------------------
-- PUBLISH GATE — same rule as posts/blog/sequences/broadcasts:
-- nothing goes live without sign-off rights.
-- ------------------------------------------------------------
create or replace function public.enforce_course_publish()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.published and (tg_op = 'INSERT' or not old.published) then
    if auth.uid() is not null and not exists (
      select 1 from public.profiles where id = auth.uid() and can_publish
    ) then
      raise exception 'Publishing requires sign-off rights (can_publish)';
    end if;
  end if;
  return new;
end;
$$;

create trigger courses_publish_rights
  before insert or update on public.courses
  for each row execute function public.enforce_course_publish();

-- ------------------------------------------------------------
-- HELPER — the member's contact id in a workspace (the key that
-- ties course access to the contact record)
-- ------------------------------------------------------------
create or replace function public.my_contact_id(ws uuid)
returns uuid
language sql
security definer set search_path = public
stable
as $$
  select contact_id from public.members
  where workspace_id = ws and user_id = auth.uid();
$$;

create or replace function public.my_tier(ws uuid)
returns text
language sql
security definer set search_path = public
stable
as $$
  select tier from public.members
  where workspace_id = ws and user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- RLS OPENINGS FOR MEMBERS (team wall policies already exist)
-- ------------------------------------------------------------
create policy "member reads published courses" on public.courses
  for select using (
    public.is_community_member(workspace_id)
    and published
    and (not paid_only or public.my_tier(workspace_id) = 'paid')
  );

create policy "member reads published lessons" on public.lessons
  for select using (
    public.is_community_member(workspace_id)
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and c.published
        and (not c.paid_only or public.my_tier(lessons.workspace_id) = 'paid')
    )
  );

-- Enrolments: keyed to the contact record. Members enrol themselves
-- (only in courses they can see) and own their progress.
create policy "member reads own enrolment" on public.enrolments
  for select using (contact_id = public.my_contact_id(workspace_id));

create policy "member enrols self" on public.enrolments
  for insert with check (
    contact_id = public.my_contact_id(workspace_id)
    and exists (select 1 from public.courses c where c.id = course_id)
  );

create policy "member updates own progress" on public.enrolments
  for update using (contact_id = public.my_contact_id(workspace_id))
  with check (contact_id = public.my_contact_id(workspace_id));

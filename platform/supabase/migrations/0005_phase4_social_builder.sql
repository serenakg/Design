-- ============================================================
-- PHASE 4 — AI SOCIAL BUILDER
-- topic → AI caption (workspace voice) → brand graphic
--       → APPROVAL GATE → calendar → auto-post
-- The posts table and its approval gate (CHECK constraint + the
-- can_publish trigger) exist since Phase 0/2. This adds the
-- pipeline fields and each workspace's writing voice.
-- Auto-post rejection policy (per Rules of the House): retry once,
-- then alert the owner. Never silent-fail.
-- ============================================================

alter table public.posts
  add column topic        text not null default '',
  add column graphic_text text not null default '',
  add column post_error   text,
  add column retry_count  int not null default 0,
  add column posted_at    timestamptz;

create index posts_due_idx on public.posts (scheduled_at)
  where status = 'scheduled';

-- ------------------------------------------------------------
-- WORKSPACE VOICE — the AI writes captions in THIS voice, per
-- workspace. Owner can refine these in brand_config.voice later.
-- ------------------------------------------------------------
update public.workspaces
set brand_config = brand_config || jsonb_build_object(
  'voice',
  'Warm, direct, board-level authority without jargon. Speaks to founders and leadership teams as a trusted advisor. Confident, generous with insight, never salesy. First person singular. British/Irish English.'
)
where slug = 'serena';

update public.workspaces
set brand_config = brand_config || jsonb_build_object(
  'voice',
  'Empowering and plain-spoken, like a financially savvy friend. Talks about money and women''s health transitions without shame, jargon, or fear-mongering. Warm, practical, inclusive. First person plural (we). British/Irish English.'
)
where slug = 'femnest';

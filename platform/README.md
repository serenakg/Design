# The Platform — Serena Gasparini · FemNEST

An owned, all-in-one platform with **two walled workspaces** that never mix.
Built so far: **Phases 0–5: foundations, the contact spine, public
site + blog + lead magnets, email + funnels, the AI social builder,
and the communities (Delia + FemNEST)** of the
[7-phase build plan](../docs/handoff/2-build-plan.md), built to the
[Rules of the House](../docs/handoff/3-rules-of-the-house.md).

## What's built and enforced

| Non-negotiable | Where it lives |
|---|---|
| 🧱 Serena / FemNEST never mix | Row-level security on every table, keyed on `workspace_access` — tested (see below) |
| ✍️ Nothing publishes without sign-off | CHECK constraints on `posts` and `blog_posts` **plus** a trigger: only `can_publish` profiles can enter a publishing state, and `approved_by` is stamped from the real session — an editor cannot self-approve |
| 🔑 Owner holds every account | Nothing here creates accounts; the go-live steps below are done by the owner, under the owner's email |
| 💚 Health + money data is sacred | Consent timestamp + note on every contact; `gdpr_export_contact()` and `gdpr_delete_contact()` in the database; per-workspace private storage buckets |

Features live now: login · workspace switcher (violet Serena / pink FemNEST) ·
contact spine (add, edit, tag, filter, search, lead→subscriber→paid with € value) ·
per-contact GDPR export & erase · workspace-wide export · dashboard ·
**public site per workspace at `/p/<workspace>`** · blog with draft →
sign-off → publish workflow (Markdown) · lead magnets whose landing pages
create consented contacts in the right workspace's spine automatically ·
**email sequences** (welcome/nurture, auto-enrol on new contact or lead
magnet claim) · **broadcasts** to consent-only segments, with the same
sign-off gate · activity log where every send, skip, and failure is
visible · one-click unsubscribe · **AI social builder**: topic in → Claude
writes the caption in that workspace's voice → branded graphic → sign-off →
calendar → auto-post via a connector webhook (retry once, then alert the
owner — never silent-fail) · **two communities at `/c/serena` (Delia) and
`/c/femnest`**: spaces, member profiles (chosen name + optional pronouns),
posts with first-class content warnings, quiet report button + team
moderation queue, free/paid tiers with a Stripe paywall — and zero
engagement-bait: no streaks, no leaderboards, nothing punishes being offline.

## Go-live (owner does this, ~30 minutes)

Every account below is created under **the owner's email**. Devs are invited
as members afterwards — never owners.

1. **Supabase** — create a project at [supabase.com](https://supabase.com)
   (region: EU, e.g. Frankfurt — this data must stay in the EU).
2. In the Supabase **SQL Editor**, run the files in
   [`supabase/migrations/`](supabase/migrations/) in order
   (`0001…` through `0006…`).
3. **Vercel** — import this repo at [vercel.com](https://vercel.com), set the
   root directory to `platform/`, and add the two environment variables from
   [`.env.example`](.env.example) (values are in Supabase → Project Settings → API).
4. Open the deployed site, **create your account** (sign-up form on the login
   page), then back in the Supabase SQL Editor run:
   ```sql
   select public.setup_owner('your-email@example.com');
   ```
   This promotes you to owner and grants you both workspaces. It only works
   once, and can't be called from the app.
5. **Backups** — in Supabase → Database → Backups, confirm daily backups are on.
6. **Resend** (email) — create an account at [resend.com](https://resend.com)
   under the owner's email, verify your sending domain, and add the Phase 3
   environment variables from [`.env.example`](.env.example) to Vercel
   (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
   `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`). The included
   [`vercel.json`](vercel.json) runs the sender every 10 minutes.
   Per the build plan: keep Kit running in parallel until this is proven.
7. **Anthropic** (AI captions) — create an API key at
   [console.anthropic.com](https://console.anthropic.com) under the owner's
   email and add `ANTHROPIC_API_KEY` to Vercel. For auto-posting at go-live,
   point `SOCIAL_WEBHOOK_URL` at a Make/Zapier/Buffer webhook (or a custom
   Meta/LinkedIn integration) — until then, approved posts wait on the
   calendar. This replaces Buffer only when proven.
8. **Stripe** (paid membership) — in the owner's Stripe account, create a
   Payment Link per workspace with **metadata `workspace_slug` = `serena` or
   `femnest`** (payments without it are logged, never guessed at), paste the
   link into that workspace's `brand_config.membership_payment_link`, add a
   webhook for `checkout.session.completed` pointing at
   `/api/webhooks/stripe`, and set `STRIPE_WEBHOOK_SECRET` in Vercel.
   Sliding-scale pricing = multiple payment links at different amounts.
9. Add every login to NordPass and switch on 2FA (Supabase + Vercel especially).

**Done-when check (from the brief):** sign in, add a contact, refresh — it's
still there, at your own URL. Create a second (dev) account, grant it one
workspace in Supabase (`workspace_access` table), and confirm it cannot see
the other.

## Local development

```bash
cp .env.example .env.local   # fill in from the owner's Supabase project
npm install
npm run dev
```

## Verification that the wall holds

The migrations were run against a clean PostgreSQL 16 with RLS tests proving:

- a user granted only Serena sees **zero** FemNEST rows, and cannot insert
  into FemNEST even with its raw workspace id (contacts and blog posts alike);
- publishing (blog `published`, social `scheduled`/`posted`) is blocked for
  anyone without `can_publish`, and `approved_by` is stamped from the actual
  session — the gate is database-enforced, not a UI habit;
- anonymous visitors see **only** published posts, active lead magnets, and
  brand-safe workspace columns — zero contacts, zero drafts, zero raw
  workspace rows;
- claiming a lead magnet creates a consented `lead` contact in the right
  workspace (idempotent on repeat claims, tags merged), and is refused
  without consent or for inactive magnets;
- GDPR export returns everything held on a contact; GDPR erase removes the
  contact and all linked memberships/enrolments;
- non-owners cannot call `setup_owner()` or grant themselves workspace access;
- email: new contacts auto-enrol in the right workspace's active sequences
  only; contacts without consent are logged as skipped, never sent; delays
  are respected; sequences can't be activated and broadcasts can't be
  scheduled without sign-off; broadcasts expand to consented, matching
  contacts only; one-click unsubscribe clears consent for good; the queue
  functions reject app-role callers (service-role only).

## What's next (one phase at a time)

Phase 4 — AI social builder
with the approval gate · Phase 5 — community (Delia / FemNEST) · Phase 6 —
courses · Phase 7 — team invites + per-workspace publish permissions.

Every phase ships only when it passes all five DELIA checks
(Diverse · Emotionally Safe · Life-Centred · Inclusive · Accessible).

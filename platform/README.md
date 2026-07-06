# The Platform — Serena Gasparini · FemNEST

An owned, all-in-one platform with **two walled workspaces** that never mix.
This is **Phase 0 (foundations) + Phase 1 (the contact spine)** of the
[7-phase build plan](../docs/handoff/2-build-plan.md), built to the
[Rules of the House](../docs/handoff/3-rules-of-the-house.md).

## What's built and enforced

| Non-negotiable | Where it lives |
|---|---|
| 🧱 Serena / FemNEST never mix | Row-level security on every table, keyed on `workspace_access` — tested (see below) |
| ✍️ Nothing publishes without sign-off | `approval_gate` CHECK constraint on `posts`: no `scheduled`/`posted` status without `approved_by` |
| 🔑 Owner holds every account | Nothing here creates accounts; the go-live steps below are done by the owner, under the owner's email |
| 💚 Health + money data is sacred | Consent timestamp + note on every contact; `gdpr_export_contact()` and `gdpr_delete_contact()` in the database; per-workspace private storage buckets |

Features live now: login · workspace switcher (violet Serena / pink FemNEST) ·
contact spine (add, edit, tag, filter, search, lead→subscriber→paid with € value) ·
per-contact GDPR export & erase · workspace-wide export · dashboard.

## Go-live (owner does this, ~30 minutes)

Every account below is created under **the owner's email**. Devs are invited
as members afterwards — never owners.

1. **Supabase** — create a project at [supabase.com](https://supabase.com)
   (region: EU, e.g. Frankfurt — this data must stay in the EU).
2. In the Supabase **SQL Editor**, run the two files in
   [`supabase/migrations/`](supabase/migrations/) in order
   (`0001…` then `0002…`).
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
6. Add every login to NordPass and switch on 2FA (Supabase + Vercel especially).

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
  into FemNEST even with its raw workspace id;
- a post cannot reach `scheduled`/`posted` without `approved_by` (the gate is
  a database constraint, not a UI habit);
- GDPR export returns everything held on a contact; GDPR erase removes the
  contact and all linked memberships/enrolments;
- non-owners cannot call `setup_owner()` or grant themselves workspace access.

## What's next (one phase at a time)

Phase 2 — public site + blog + lead magnets writing into the spine with
consent · Phase 3 — email + funnels (Resend) · Phase 4 — AI social builder
with the approval gate · Phase 5 — community (Delia / FemNEST) · Phase 6 —
courses · Phase 7 — team invites + per-workspace publish permissions.

Every phase ships only when it passes all five DELIA checks
(Diverse · Emotionally Safe · Life-Centred · Inclusive · Accessible).

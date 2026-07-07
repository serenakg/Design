# 🛠️ Technical Build Brief — for Fable
### The engineering spec. Build from this.

> This is the *how-to-build* doc. Read alongside the Rules of the House (the non-negotiables) and the Build Plan (the stages). This one translates them into a stack, a schema, and a sequence.

---

## 🎯 In one line

An owned, all-in-one platform with **two separate workspaces** (Serena Gasparini + FemNEST). Website, blog, email, funnels, AI social builder, community, courses — all writing to one contact spine, per workspace.

---

## 🧱 Architecture — the shape

**One spine. Many front doors. Two walled workspaces.**

```
        WORKSPACE SWITCHER (Notion-style)
                  │
        ┌─────────┴──────────┐
     SERENA               FEMNEST
     (violet)             (pink)
     own data             own data
        │                    │
   ┌────┴────────────────────┴────┐
   │  CONTACT SPINE (per workspace) │
   └────┬────────────────────┬─────┘
        │                     │
  Website · Blog · Email · Funnels · Social · Community · Courses
```

**Wall rule:** every table is scoped by `workspace_id`. A query for one workspace can never return the other's rows. This is the #1 architectural constraint.

---

## ⚙️ Recommended stack

Pick anything equivalent — this is a sensible default, not a mandate.

| Layer | Tool | Why |
|-------|------|-----|
| **Frontend** | Next.js (React) | Prototypes are already React |
| **Hosting** | Vercel | Free tier, one-click deploy |
| **Database** | Supabase (Postgres) | Free tier, built-in auth + storage |
| **Auth** | Supabase Auth | Comes free with the DB |
| **File storage** | Supabase Storage | Videos, lead magnets, images |
| **Payments** | Stripe | Standard, sliding-scale-friendly |
| **Email sending** | Resend | Near-free, simple API |
| **AI (captions)** | Anthropic API | For the social builder |

**Cost to go live: ~€0/month** until real payment volume.

---

## 🔐 Foundations — build these FIRST (before any stage)

The build plan lists these late. **They're not late. They're the floor.**

1. **Auth** — login for owner, team, members. Row-level security scoped to `workspace_id`.
2. **File storage** — set up the bucket early. Everything else uploads to it.
3. **GDPR baseline** — consent field on every contact, data-export function, delete function. FemNEST holds health data (special category) — design for it now, not later.
4. **Backups** — automatic daily. Supabase does this; confirm it's on.

---

## 🗄️ Core data model (starter schema)

Every table carries `workspace_id`. Row-level security enforces the wall.

**`workspaces`**
- id · name · brand_colour · brand_config · created_at

**`contacts`** (the spine)
- id · **workspace_id** · name · email · status (lead/subscriber/paid) · source · value · tags[] · consent_at · joined_at

**`users`** (team + owner)
- id · email · role (owner/admin/editor) · workspace_access[] · can_publish (bool)

**`posts`** (social)
- id · **workspace_id** · caption · media_url · platforms[] · status (draft/**pending_approval**/scheduled/posted) · scheduled_at · approved_by

**`members`** (community)
- id · **workspace_id** · contact_id (FK) · tier · joined_at

**`courses`** / **`lessons`** / **`enrolments`**
- scoped by workspace_id · enrolment keyed to contact_id

**Note the `pending_approval` status** — that's the approval gate, baked into the data, not bolted on.

---

## 🚦 Build sequence

### 🔩 Phase 0 — Foundations
Auth · storage · GDPR baseline · backups · the two-workspace wall.
**Done when:** two users log in, each sees only their permitted workspace.

### ✅ Phase 1 — Spine (make the prototype real)
Contacts table live in Supabase. Add/edit/filter/tag persists.
**Done when:** add a contact, refresh, it's still there, at a real URL.

### 🌐 Phase 2 — Website + Blog + Lead magnets
Public site per workspace · blog · lead-magnet form → writes to spine with consent.
**Done when:** freebie download creates a contact automatically.

### 📧 Phase 3 — Email + Funnels
Resend integration · welcome + nurture sequences · funnel = page → capture → sequence → offer.
**Done when:** a new contact triggers the right sequence in the right workspace's voice.

### 🎨 Phase 4 — AI Social Builder
```
topic → AI caption (workspace voice) → AI/brand graphic
      → APPROVAL GATE → calendar → auto-post
```
- Steps 1–5: fully buildable
- **Step 6 (auto-post):** needs Meta/LinkedIn/Threads APIs — only works deployed. Build the pipeline, wire posting last.
- Handle post rejection: retry once, then alert owner. Never silent-fail.
**Done when:** topic in → approved post scheduled, per workspace.

### 🏘️ Phase 5 — Community
Spaces · profiles · paywall (Stripe from Phase 1) · Delia (Serena) + FemNEST community, separate.
**DELIA build rules apply hard here:** no engagement-bait, safe moderation tools, no offline-punishing mechanics.

### 🎓 Phase 6 — Courses
Gated lessons · progress tracking · access keyed to contact record.

### 👥 Phase 7 — Team polish
Per-workspace invites · publish vs. draft permissions · finalise the approval flows.

---

## 💚 The DELIA build standard (applies to EVERY phase)

Not a feature. The standard every screen is measured against. Before shipping anything, it must pass all five:

- **D — Diverse** → forms/journeys for the full spectrum, no assumed-majority defaults
- **E — Emotionally Safe** → no shame mechanics, safe moderation, careful with health+money data
- **L — Life-Centred** → nothing punishes being offline
- **I — Inclusive** → sliding-scale pricing, multiple entry points
- **A — Accessible** → WCAG standard, works on a cheap phone on slow wifi

**If a feature fails one pillar, it's not done.**

---

## 🚫 Non-negotiables (from Rules of the House)

1. 🧱 **Serena / FemNEST never mix** — enforced by `workspace_id` + row-level security
2. ✍️ **Nothing publishes without approval** — the `pending_approval` status is mandatory
3. 🔑 **Owner holds every account** — all keys under owner's email, devs are members not owners
4. 💚 **Health + money data is sacred** — GDPR special-category handling from day one

---

## ✅ Fable's day-one checklist

- [ ] Set up all accounts under **owner's email**
- [ ] Build Phase 0 foundations before any feature
- [ ] Enforce the workspace wall with row-level security
- [ ] Bake the approval gate into the posts table
- [ ] Design GDPR-first (health data)
- [ ] Backups on from day one
- [ ] Every feature passes the 5 DELIA checks before ship

---

## 📦 What ships with this brief

1. This technical brief
2. The build plan (7 stages, plain language)
3. Rules of the house (DELIA + non-negotiables)
4. Account ownership list (fill in first)
5. Two working prototypes (spine + workspace switcher) — the reference build

*Everything Fable needs to build it your way.*

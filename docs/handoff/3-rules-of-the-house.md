# 📋 Rules of the House
### The non-negotiables for anyone building this platform

> Read this before you write a line of code. The build plan says *what* to build. This says *how it has to be built* — and what can never be got wrong.

---

## 🎯 What this platform is

Two separate workspaces, one owner:

- **Serena Gasparini** — consultancy. Three service lines (Fractional · Advisory + Board · Speaking + Workshops). **Delia** is the community inside it.
- **FemNEST** — the start-up giving women financial freedom. Maps 50+ female health/life transitions to financial outcomes. Community-first, B2B2C, pilot stage, MVP Spring 2027.

**They never mix.** Different data, different brand, different world. This is rule #1 below.

---

## 🧭 The design philosophy — The DELIA Model™

**This is the part most dev teams skip. Don't.**

Everything built here follows The DELIA Model™ — the framework this whole business runs on. It's not a feature or a page. It's *how every screen, form, email, and community space gets designed.* Build against these five, at every stage:

### D — Diverse
Design for the **full spectrum** of women, not the assumed majority.
- Forms don't assume one kind of user (name fields, pronouns, life stage)
- Nothing hard-codes a "typical" journey

### E — Emotionally Safe
Spaces where women feel safe to show up.
- Community: content warnings standard, swift + compassionate moderation tools, **no engagement-bait mechanics** (no shame-y streaks, no public "hot seats")
- FemNEST touches health + money — the two most vulnerable topics. Handle with care.

### L — Life-Centred
Built around **real lives, not idealised availability.**
- No mechanics that punish being offline
- Timing, reminders, digests respect that these women have full lives

### I — Inclusive
Barriers removed **by design, not as an afterthought.**
- Sliding-scale / tiered pricing possible in the payment layer
- Multiple time zones, multiple entry points

### A — Accessible
Genuinely reachable — in **format, timing, language, and cost.**
- WCAG accessibility as a build standard, not a patch (keyboard nav, contrast, screen readers)
- Works on a cheap phone on slow wifi, not just a new laptop

**👉 Test for the team:** before shipping any feature, ask *"does this pass all five?"* If a screen fails one, it's not done.

---

## 🚫 The 4 hard rules (never break these)

**1. 🧱 Serena and FemNEST never mix**
Separate data. Separate branding. A contact, post, or payment in one must never appear in the other. This is the wall the whole thing is built around.

**2. ✍️ Nothing publishes without sign-off**
No post, email, or community broadcast goes out without explicit approval. Build the **approval gate as a literal step** in every publishing flow — not an honour system.

**3. 🔑 The owner holds every key**
Stripe, Supabase, Vercel, domain, all API keys — set up under the **owner's email**, owner as admin. A dev never owns the accounts. Ever. Hand-off = full transfer, no lock-in.

**4. 💚 Health + money data is sacred**
FemNEST handles special-category health data under GDPR. This shapes the database design from day one — not a compliance patch at the end. (See legal section.)

---

## 🔴 What the plan is MISSING (add before building)

These aren't in the build plan yet. A team needs them:

### 🔐 Auth & accounts
Everyone logs in — owner, team, members. This is **foundational, move it early**, not Stage 7.

### 📦 File storage
Course videos, lead magnets, images, uploads all need a home (and it costs at scale). Pick this early.

### ⚖️ GDPR / data protection
EU-based · two databases of women's personal data · **FemNEST = health data (special category).**
- Consent tracking built in
- Right-to-be-forgotten / data export possible
- A privacy policy + data processing plan **before** the database is designed

### 💾 Backups + on-call
- Automatic daily backups
- A plan for "the site is down at 11pm — who fixes it?"
- Owning your platform = owning the 2am problem. Decide who holds it.

---

## 🟡 Decisions only the OWNER makes (don't let a dev guess)

| Decision | Why it matters |
|----------|----------------|
| **How strict is data separation?** Two separate databases, or one with a wall? | Affects cost + security |
| **What happens when auto-post is rejected?** (IG/LinkedIn APIs reject sometimes) | Retry? Alert? Silent fail? |
| **Who migrates the existing data in?** (Buffer, Kit, contacts) | Someone has to move it, and when |
| **Pricing tiers / sliding scale** | Ties to the Inclusive + Accessible DELIA pillars |

---

## 📦 The hand-off pack

Give the team all four:

1. ✅ **The build plan** — the 7 stages
2. ✅ **The spine + workspace-switcher prototypes** — working proof of the foundation
3. ✅ **This doc** — the rules + DELIA philosophy
4. ⬜ **Owner's account list** — every login, all under owner's email (make this before kickoff)

---

## ✅ The team's day-one checklist

- [ ] Read the DELIA Model™ section — understand it's the *design standard*, not decoration
- [ ] Confirm the Serena / FemNEST wall in the architecture
- [ ] Build auth early, not late
- [ ] Design the database GDPR-first (health data special handling)
- [ ] Set up every account under the owner's email
- [ ] Build the approval gate into every publish flow
- [ ] Set up backups from day one
- [ ] Run every feature through the 5 DELIA questions before shipping

---

*The build plan tells them what to make. This tells them the standard it has to meet. Both go in the hand-off.*

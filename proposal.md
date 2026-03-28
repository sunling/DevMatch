DevMatch — Developer Vibe Matcher
Hackathon Project — Final Deliverable

Core Concept
A GitHub-powered vibe matching platform that goes beyond skill overlap to understand *how* developers work — their personality, coding style, and collaboration preferences — then connects them at real-world events. Built end-to-end with Qoder and InsForge.

What started as "match developers by shared skills" evolved into something deeper: a personality-aware matchmaking system that analyzes GitHub activity to infer developer archetypes and surfaces *why* two people would click, not just that they both write TypeScript.

## What We Delivered

### Core Vibe Matching Engine
- **GitHub OAuth login** with automatic profile population (repos, languages, bio)
- **AI-powered personality analysis** — analyzes repo patterns to assign developer archetypes:
  - The Architect (system design focus)
  - The Explorer (diverse tech stack)
  - The Specialist (deep expertise)
  - The Community Builder (open source contributor)
- **Multi-factor match scoring** — combines skill overlap, complementary skills, location proximity, and personality compatibility into a single vibe score
- **"Why you matched" labels** — every match card explains the connection ("You both love Go and TypeScript", "Complementary: Frontend meets Backend")

### Event Sessions (Beyond Original Scope)
Originally scoped as "Out" — we built it anyway because it solves the core problem: matching at real events.
- **Create events** from Luma or Meetup links — metadata (title, date, description) auto-scraped from Open Graph tags and JSON-LD
- **Join codes** — 6-character alphanumeric codes (no ambiguous characters) for attendees to join a session
- **Event-scoped matching** — see your top vibe matches among *only the people at your event*, not the entire platform
- **CSV import** — event organizers can bulk-import attendees by GitHub username
- **Shareable links** — copy join code or direct link to share with attendees

### Project Board (Beyond Original Scope)
- Post projects seeking collaborators
- Apply to join projects with a message
- Browse open projects across the community

### Profile & Settings (Beyond Original Scope)
- **Personality cards** — visual display of your developer archetype with traits
- **Profile setup wizard** — guided onboarding for new users
- **Settings page** — manage preferences and profile details
- **Individual profile pages** — `/profile/:id` with full skill breakdown and GitHub links

## Technical Architecture

### Frontend — Next.js 15 + Tailwind CSS
| Route | Purpose |
|-------|---------|
| `/login` | GitHub OAuth entry + feature cards |
| `/dashboard` | Profile card + match feed grid + nav |
| `/profile/:id` | Developer profile with skills & personality |
| `/events` | Event listing + create/join modals |
| `/events/:id` | Event detail + scoped matches + participants |
| `/settings` | User preferences |

### Backend — InsForge
| Resource | Details |
|----------|---------|
| **Auth** | GitHub OAuth via InsForge, auto-provisions user on first login |
| **Database** | 6 tables: `users`, `skills`, `events`, `event_participants`, `projects`, `project_applications` |
| **Edge Functions** | 3 serverless functions: `analyze-github`, `matches`, `events` |
| **AI Gateway** | Skill categorization + personality archetype inference |

### API Routes (Next.js)
| Endpoint | Purpose |
|----------|---------|
| `POST /api/analyze-github` | Fetch repos, extract languages, store skills |
| `GET /api/github-user` | Look up GitHub user profile |
| `POST /api/parse-event` | Scrape Luma/Meetup metadata from URL |

### Edge Functions (InsForge)
| Function | Actions |
|----------|---------|
| `analyze-github` | Fetch repos → extract languages → categorize via AI → store skills |
| `matches` | Score all users (or event-scoped subset) → return ranked matches with explanations |
| `events` | `create`, `list`, `get`, `lookup`, `join`, `import` — full event session lifecycle |

### Matching Algorithm
| Factor | Points | Logic |
|--------|--------|-------|
| Shared skills | +15 each | Exact overlap (e.g., both use Go) |
| Complementary skills | +10 each | Frontend ↔ Backend pairing |
| Location match | +10 flat | Same city bonus |
| Personality compatibility | weighted | Archetype synergy scoring |

Returns top matches sorted by score with `sharedSkills[]` and archetype info surfaced in the UI.

## The Qoder + InsForge Story

Every layer of the stack runs through these tools — this wasn't bolted on, it was built *with* them.

**InsForge handled:**
- GitHub OAuth — configured and running, zero boilerplate
- Database — 6 tables with foreign keys, cascading deletes, unique constraints
- Edge Functions — 3 serverless functions deployed and running (analyze-github, matches, events)
- AI Gateway — personality archetype inference and skill categorization
- REST API — auto-generated PostgREST endpoints for all tables

**Qoder handled:**
- Full Next.js + Tailwind frontend — all pages, components, and client-side logic
- InsForge MCP integration — Qoder understood the backend schema and built UI against it directly
- Edge function authoring — wrote and deployed serverless functions through MCP tools
- Database schema design — created tables with proper relationships via SQL
- Merge conflict resolution — handled concurrent development across 3 developers
- Documentation — auto-generated architecture docs as features were built

**The pitch line:** "We didn't build infrastructure — we described what we wanted and the tools built it. Our time went entirely into product decisions, not setup."

## Demo Flow (3 Minutes)

**0:00–0:20 — Hook**
"Every developer here has been to a meetup and spent the first 20 minutes figuring out who to even talk to. We built a vibe matcher — powered by your GitHub profile, not a self-reported form."

**0:20–1:00 — Login + Profile**
Live GitHub OAuth. Profile auto-populates with skills and personality archetype.
"We analyzed your repos and figured out you're an Explorer — diverse tech stack, always trying new things. No form to fill out."

**1:00–1:40 — Match Feed**
Show developer cards ranked by vibe score.
"Here's Sarah — 78% match. You both work in Go and TypeScript, you're both in Seattle, and your archetypes are complementary. That's why she's at the top."

**1:40–2:20 — Event Sessions**
Create an event from a Luma link. Show the join code. Open the event page.
"At tonight's meetup, attendees join with a code. Now you see your top matches from *only the people in the room* — not the entire platform."

**2:20–2:50 — The Qoder + InsForge Callout**
- "GitHub OAuth and the skill extraction pipeline — one prompt in InsForge."
- "The matching engine with personality scoring — another prompt. InsForge provisioned the database, hosted the functions, and routed the AI calls."
- "The entire frontend — Qoder generated it, already wired to the InsForge backend through MCP."

**2:50–3:00 — Close**
"Code & Coffee has 3,500 members. This is live. The event feature we just showed you? That was scoped as 'out' — we built it anyway because the tools made it possible."

## Judging Criteria Alignment

| Criteria | How We Score |
|----------|-------------|
| **Qoder & InsForge** | Every layer — OAuth, DB (6 tables), AI gateway, 3 edge functions, full frontend — built through the tools. We can narrate exactly which prompt built which feature. |
| **Technical Execution** | GitHub API + AI personality inference + multi-factor matching + event-scoped filtering + metadata scraping. Real complexity across the full stack. |
| **Demo & Presentation** | Full flow in under 3 min including live event creation. Pre-seeded with real profiles. |
| **Real World Impact** | Built for Code & Coffee's 3,500 members. Event sessions solve the real "who should I talk to?" problem at every meetup. |
| **Innovation** | Personality archetypes from GitHub activity — not self-reported skills. Event-scoped matching is a novel twist on developer networking. |

## What Was Scoped "Out" That We Built Anyway

| Original "Out" | What We Delivered |
|----------------|-------------------|
| ❌ Event RSVP integration | Event Sessions with join codes, metadata scraping, scoped matching, CSV import |
| (not listed) | Project Board with applications |
| (not listed) | Personality archetype system |
| (not listed) | Settings & profile management |

Still out: Real-time chat, swipe gestures, admin dashboard.
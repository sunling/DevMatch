# DevMatch

> Your code writes your dating profile. GitHub-powered vibe matching for developer communities.

[![Built with Qoder](https://img.shields.io/badge/Built%20with-Qoder-blue)](https://qoder.dev)
[![Powered by InsForge](https://img.shields.io/badge/Powered%20by-InsForge-purple)](https://insforge.dev)

## The Problem

You walk into a meetup with 50 developers. You have no idea who works in your stack, who's looking for collaborators, or who you'd actually vibe with. You default to whoever's standing nearest and hope for the best.

DevMatch fixes this. Sign in with GitHub, and your repos do the talking. We extract your actual tech stack, assign you a developer personality archetype, and match you with compatible developers — scored, ranked, and explained.

No forms. No self-reported skills. Just code.

## How Vibe Matching Works

DevMatch doesn't ask what you know — it reads what you build.

### 1. Skill Extraction

When you sign in, we analyze your last 10 GitHub repos. An AI pipeline (InsForge AI Gateway + GPT-4o-mini) categorizes your languages into four domains:

| Domain | Example Skills |
|--------|---------------|
| **Frontend** | React, Vue, Angular, TypeScript, Next.js, Tailwind |
| **Backend** | Node.js, Python, Django, Go, Java, PostgreSQL, Redis |
| **DevOps** | AWS, Docker, Kubernetes, Terraform, CI/CD |
| **AI/ML** | TensorFlow, PyTorch, Machine Learning, OpenAI |

### 2. Personality Archetypes

Based on your skill distribution, you're assigned one of 8 developer archetypes:

| Archetype | Rarity | Who You Are |
|-----------|--------|-------------|
| Frontend Artisan | Rare | Lives in components and design systems |
| Systems Architect | Rare | Backend-first, infrastructure-minded |
| Full Stack Wizard | Epic | Comfortable anywhere in the stack |
| DevOps Engineer | Rare | Pipelines, containers, and uptime |
| Mobile Developer | Rare | Native and cross-platform builder |
| Game Creator | Legendary | Unity, Unreal, and interactive worlds |
| AI Specialist | Epic | Models, data, and machine intelligence |
| Polyglot Developer | Epic | Writes production code in 3+ categories |

Personality is auto-calculated by a database trigger whenever your skills change. The rarity system (Common / Rare / Epic / Legendary) makes profiles feel unique.

### 3. Match Scoring

Every developer is scored against you using three factors:

| Factor | Points | Logic |
|--------|--------|-------|
| Shared skills | +15 each | You both use React? That's 15 points. |
| Complementary skills | +10 each | You do frontend, they do backend? Bonus. |
| Location match | +10 flat | Same city and not "Remote". |

Your top 10 matches are returned, sorted by score. Each match card shows the exact shared skills so you know *why* you matched — not just *that* you matched.

### 4. Event-Scoped Matching

Global matches are useful, but the real power is at events. Create an Event Session from a Luma or Meetup link, share the 6-character join code, and matching runs **scoped to that event's attendees only**.

"Who should I talk to at *this* meetup?" — answered before you walk in the door.

## Features

### Core Matching
- **Auto skill extraction** from GitHub repos via AI categorization
- **Personality archetypes** with rarity tiers (Common through Legendary)
- **Scored compatibility** with transparent "why you matched" labels
- **Real-time notifications** when a compatible developer joins (WebSocket)

### Event Sessions
- **Create from links** — paste a Luma or Meetup URL, metadata auto-fills
- **Join by code** — 6-character code displayed at the meetup (project it, put it on a sticker)
- **Scoped matches** — only see matches among event attendees
- **CSV import** — organizers can bulk-import attendees by GitHub username
- **Share link** — one-click copy of join code or event URL

### Project Board
- **Post projects** — define what you're building and what skills you need
- **Smart matching** — algorithm finds developers with matching or related skills
- **Apply to join** — developers apply with an optional message
- **Skill relationships** — knows that React developers probably know JavaScript

### Profile & Settings
- **GitHub Matcher** — search any GitHub username and see their matches (no login required)
- **Profile pages** — full skill breakdown, personality card, shared skill highlighting
- **Settings** — edit display name, toggle mentor and event organizer status

## Quick Start

```bash
git clone https://github.com/Dani-DEV28/DevMatch.git
cd DevMatch
npm install
```

Create a `.env` file:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-app.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
GITHUB_TOKEN=ghp_...  # optional, increases GitHub API rate limit
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For UI development without GitHub OAuth:

```bash
npm run dev:bypass
```

This enables a "Dev Bypass" button on the login page that loads mock data.

## Architecture

```
                          DevMatch
  ┌──────────────────────────────────────────────────┐
  │                   Next.js 15                      │
  │                                                   │
  │  /login ── /dashboard ── /events ── /projects     │
  │  /profile/[id] ── /events/[id] ── /settings       │
  │                                                   │
  │  API Routes:                                      │
  │  /api/analyze-github  (AI skill categorization)   │
  │  /api/github-user     (GitHub profile proxy)      │
  │  /api/parse-event     (Luma/Meetup metadata)      │
  └───────────────────┬──────────────────────────────┘
                      │
              ┌───────┴────────┐
              │  InsForge BaaS │
              │                │
              │  PostgreSQL    │──── users, skills, events,
              │  Auth (OAuth)  │     event_participants,
              │  AI Gateway    │     projects, project_applications
              │  Edge Functions│
              │  WebSocket     │
              └────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────┴───┐  ┌─────┴────┐  ┌───┴────┐
    │matches │  │  events   │  │projects│
    │function│  │ function  │  │function│
    └────────┘  └──────────┘  └────────┘
    + match-github-user, setup-user, project-matches
```

## Edge Functions

| Function | Purpose |
|----------|---------|
| `matches` | Core matching algorithm. Accepts optional `eventId` to scope to event participants. |
| `match-github-user` | Public GitHub user analysis — no login required. Extracts skills, calculates personality, finds matches. |
| `setup-user` | Initializes user profile after OAuth. Fetches repos, extracts languages, stores skills. |
| `events` | Event CRUD, join by code, lookup, participant management, CSV import. |
| `projects` | Project board CRUD, applications, collaborator management. |
| `project-matches` | Finds developers matching a project's required skills using skill relationship mapping. |

## Database

6 tables, all auto-provisioned by InsForge:

| Table | Purpose |
|-------|---------|
| `users` | GitHub profiles + personality archetype fields |
| `skills` | Extracted skill categories with repo counts |
| `events` | Event sessions with join codes and metadata |
| `event_participants` | Users joined to events |
| `projects` | Collaboration board postings |
| `project_applications` | Applications to join projects |

A database trigger (`skills_update_personality`) auto-calculates personality type whenever skills are inserted, updated, or deleted.

## Project Structure

```
src/
  app/
    login/              GitHub OAuth + GitHubMatcher
    dashboard/          Profile card + match feed + real-time toasts
    events/             Event listing + create/join modals
    events/[id]/        Event detail + scoped matches + CSV import
    profile/[id]/       Developer profile with shared skill highlighting
    projects/           Project board
    settings/           User preferences
    api/
      analyze-github/   AI-powered skill extraction
      github-user/      GitHub API proxy
      parse-event/      Luma/Meetup metadata scraper
  components/
    GitHubMatcher       Public GitHub user search + matching
    PersonalityCard     Archetype display with rarity badge
    ProjectBoard        Full project collaboration UI
    SetupProfileButton  GitHub token-based profile setup
    RealtimeToast       Live match + activity notifications
  hooks/
    useRealtime         WebSocket subscription for match events
  lib/
    insforge            SDK client + shared TypeScript types
    dev-auth            Development bypass authentication
    mock-data           9 mock users + skills + matches
insforge/
  functions/
    matches/            Core matching algorithm
    match-github-user/  Public GitHub analysis
    setup-user/         Profile initialization
    events/             Event session management
    projects/           Project board API
    project-matches/    Skill-based project matching
```

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 15 + Tailwind CSS 3.4 | App Router, SSR, client components |
| Icons | lucide-react | Consistent iconography |
| Fonts | Geist Sans + Geist Mono | Clean, modern typography |
| Backend | InsForge BaaS | PostgreSQL, Auth, AI, Edge Functions, WebSocket |
| Auth | GitHub OAuth (PKCE) | Automatic session management |
| AI | InsForge AI Gateway (GPT-4o-mini) | Skill categorization |
| Real-time | InsForge WebSocket | Match and activity notifications |

## The Qoder + InsForge Story

This application was built in 5 hours by a 3-person team. Every layer runs through Qoder and InsForge:

**InsForge handled:**
- GitHub OAuth — configured via one prompt, zero boilerplate
- Database — 6 tables auto-provisioned with triggers and indexes
- Edge Functions — matching algorithm, event management, project board
- AI Gateway — skill categorization routed through InsForge's model layer
- WebSocket — real-time match notifications

**Qoder handled:**
- Full Next.js frontend — generated from prompts, connected to InsForge via MCP
- Feature implementation — Event Sessions, Project Board, personality system
- Code consolidation — merged 3 developers' independent work into one unified app
- Documentation — auto-generated architecture docs as we built

The pitch: "We didn't build infrastructure — we described what we wanted and the tools built it. Our 5 hours went entirely into product decisions, not setup."

## Deployed For

Code & Coffee — a 3,500-member developer community. DevMatch is built for real meetups, not demos.

## Team

- **Dev 1** — Auth, GitHub integration, skill extraction pipeline
- **Dev 2** — Matching algorithm, project board, edge functions
- **Dev 3** — Frontend UI/UX, event sessions, codebase consolidation

## License

MIT

---

**Built with [Qoder](https://qoder.dev) + [InsForge](https://insforge.dev)**

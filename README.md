# DevMatch

> Vision-first developer matching. Find collaborators who share your values, not just your stack.

[![Built with Qoder](https://img.shields.io/badge/Built%20with-Qoder-blue)](https://qoder.dev)
[![Powered by InsForge](https://img.shields.io/badge/Powered%20by-InsForge-purple)](https://insforge.dev)

## The Problem

You walk into a meetup with 50 developers. You have no idea who shares your vision, who's looking for collaborators, or who you'd actually vibe with. You default to whoever's standing nearest and hope for the best.

DevMatch fixes this. Sign in with GitHub, answer a few vibe check questions, and discover developers who align with your values, work style, and dream projects — not just your tech stack.

Vision-first. Values-based. Actually human.

## How Vision-First Matching Works

DevMatch goes beyond skills — we match based on values, vision, and vibe.

### 1. Vibe Check

Answer 5 quick questions about your work style:
- What problems bore you?
- What's your natural team role?
- Your preferred shipping timeline?
- Most overhyped tech?
- Ideal collaboration style?

These responses create your "Digital DNA" — a behavioral fingerprint for matching.

### 2. Project Visions

Share your dream project — what you'd build with unlimited resources. This becomes the centerpiece of your profile and helps find collaborators who share your passion.

### 4. Multi-Factor Matching

Every match is scored using:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Vibe Alignment** | 40% | Shared values from vibe check responses |
| **Vision Resonance** | 35% | Similar domain interests and dream projects |
| **Digital DNA** | 25% | Behavioral signals from GitHub activity |

Each match shows *why* you matched with detailed breakdowns.

## Features

### Core Matching
- **Vibe Check** — 5-question onboarding to capture your work style and values
- **Project Visions** — share your dream project to find like-minded collaborators
- **Digital DNA** — behavioral analysis of your GitHub activity patterns
- **Multi-factor scoring** — vibe + vision + behavior for better matches
- **Real-time notifications** when compatible developers join (WebSocket)

### Event Sessions
- **Create from links** — paste a Luma or Meetup URL, metadata auto-fills
- **Join by code** — 6-character code displayed at the meetup
- **Scoped matches** — only see matches among event attendees
- **CSV import** — organizers can bulk-import attendees by GitHub username
- **Share link** — one-click copy of join code or event URL

### Profile & Settings
- **Enhanced Profile Pages** — Digital DNA, vibe check results, project visions
- **GitHub Matcher** — search any GitHub username and see their matches (no login required)
- **Settings** — edit bio, dream project, availability, project status, and vibe check responses
- **Social Links** — add LinkedIn and Google Scholar profiles

## Architecture

```
                          DevMatch
  ┌──────────────────────────────────────────────────┐
  │                   Next.js 15                      │
  │                                                   │
  │  /login ── /dashboard ── /events ── /profile      │
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
              │  PostgreSQL    │──── users, vibe_check_responses,
              │  Auth (OAuth)  │     user_taste_profiles, events,
              │  AI Gateway    │     event_participants, project_visions
              │  Edge Functions│
              │  WebSocket     │
              └────────────────┘
                      │
         ┌────────────┼─────────────────────────┐
         │            │                         │
    ┌────┴────────┐ ┌─┴──────────┐      ┌──────┴──────┐
    │taste-based  │ │  events    │      │ match-github│
    │matches      │ │  function  │      │ user        │
    │function     │ │            │      │             │
    └─────────────┘ └────────────┘      └─────────────┘
    + setup-user
```

## Edge Functions

| Function | Purpose |
|----------|---------|
| `taste-based-matches` | Vision-first matching algorithm using vibe check + archetype + Digital DNA. Accepts optional `eventId`. |
| `match-github-user` | Public GitHub user analysis — no login required. Extracts behavioral signals, finds matches. |
| `setup-user` | Initializes user profile after OAuth. Creates taste profile and default vibe check. |
| `events` | Event CRUD, join by code, lookup, participant management, CSV import. |

## Database

10 tables, all auto-provisioned by InsForge:

| Table | Purpose |
|-------|---------|
| `users` | GitHub profiles + vision fields + vibe check data |
| `vibe_check_responses` | User's 5 vibe check answers |
| `user_taste_profiles` | Digital DNA behavioral signals |
| `project_visions` | User's dream project postings |
| `vision_resonances` | Matches between compatible visions |
| `events` | Event sessions with join codes and metadata |
| `event_participants` | Users joined to events |
| `projects` | Legacy project board postings |
| `project_applications` | Applications to join projects |
| `skills` | Legacy extracted skill categories |

## Project Structure

```
src/
  app/
    login/              GitHub OAuth + GitHubMatcher
    dashboard/          Profile card + match feed + vibe check modal
    events/             Event listing + create/join modals
    events/[id]/        Event detail + scoped matches + CSV import
    profile/[id]/       Enhanced profile with personality, DNA, visions
    settings/           Edit profile, vibe check, and preferences
    api/
      analyze-github/   AI-powered skill extraction
      analyze-github-behavior/  Digital DNA analysis
      github-user/      GitHub API proxy
      parse-event/      Luma/Meetup metadata scraper
  components/
    GitHubMatcher       Public GitHub user search + matching
    PersonalityCard     Archetype display with rarity badge
    DigitalDNA          Behavioral signals visualization
    VibeCheck           5-question onboarding flow
    VisionCard          Project vision display
    VisionProfileSetup  Archetype and vision setup
    CreateVisionCard    Create new project vision
    SynergyRadar        Match compatibility radar chart
    SocialLinks         LinkedIn/Google Scholar integration
    SetupProfileButton  GitHub token-based profile setup
    RealtimeToast       Live match + activity notifications
  hooks/
    useRealtime         WebSocket subscription for match events
  lib/
    insforge            SDK client + shared TypeScript types
    archetypes          Archetype definitions and helpers
    dev-auth            Development bypass authentication
    mock-data           Mock users + matches for testing
edge-functions/
  taste-based-matches.js  Core vision-first matching algorithm
scripts/
  seed-demo-data.js   Demo user data definitions
  insert-demo-data.js Database seeding script
```

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend | Next.js 15 + React 19 + Tailwind CSS 3.4 | App Router, SSR, client components |
| Icons | lucide-react | Consistent iconography |
| Backend | InsForge BaaS | PostgreSQL, Auth, AI, Edge Functions, WebSocket |
| Auth | GitHub OAuth (PKCE) | Automatic session management |
| AI | InsForge AI Gateway | Behavioral analysis |
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

## Development

### Quick Start

```bash
git clone https://github.com/Dani-DEV28/DevMatch.git
cd DevMatch
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-app.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
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

### Demo Data

Seed the database with demo users for testing:

```bash
node scripts/insert-demo-data.js
```

This creates 6 demo users with complete profiles, vibe checks, and project visions.

## License

MIT

---

**Built with [Qoder](https://qoder.dev) + [InsForge](https://insforge.dev)**

# DevMatch

> GitHub-powered matchmaking for developer communities. Built with Qoder + InsForge.

[![Built with Qoder](https://img.shields.io/badge/Built%20with-Qoder-blue)](https://qoder.dev)
[![Powered by InsForge](https://img.shields.io/badge/Powered%20by-InsForge-purple)](https://insforge.dev)

## What is DevMatch?

DevMatch analyzes developers' GitHub profiles to find compatible collaborators for networking and hackathon teams. No forms to fill out — your actual code does the talking.

**Live Demo:** [devmatch-demo.vercel.app](https://devmatch-demo.vercel.app)

![DevMatch Dashboard](https://i.imgur.com/demo-screenshot.png)

## The Problem

Networking at tech events is awkward and random. You spend 20 minutes figuring out who to talk to, only to find out you have nothing in common.

## The Solution

1. **Sign in with GitHub** — We auto-extract your skills from your repos
2. **See your matches** — AI-scored compatibility based on shared tech stacks
3. **Connect instantly** — View profiles, see shared skills, start collaborating

## Tech Stack

| Layer | Technology | Provisioned By |
|-------|-----------|----------------|
| Frontend | Next.js 15 + Tailwind CSS | Qoder |
| Backend | InsForge BaaS | InsForge |
| Auth | GitHub OAuth | InsForge |
| Database | PostgreSQL | InsForge |
| Realtime | WebSocket (Socket.IO) | InsForge |
| AI Gateway | Skill categorization | InsForge |

## Key Features

- **Auto Skill Extraction** — Analyzes your last 10 GitHub repos
- **AI-Powered Matching** — Scores compatibility based on shared + complementary skills
- **Live Notifications** — Real-time alerts when compatible developers join
- **Personality Profiles** — Archetype classification (Builder, Explorer, etc.)
- **Event Integration** — RSVP to events and see who's attending

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Dani-DEV28/DevMatch.git
cd DevMatch

# Install dependencies
npm install

# Set up environment variables
cp env.example .env
# Edit .env with your InsForge credentials

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
NEXT_PUBLIC_INSFORGE_BASE_URL=https://your-app.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
```

## How It Was Built

This entire application was built in **5 hours** by a 3-person team using Qoder and InsForge:

| Feature | How It Was Built | Time |
|---------|-----------------|------|
| GitHub OAuth | One Quest Mode prompt in InsForge | 5 min |
| Database Schema | Auto-provisioned by InsForge | 0 min |
| Skill Extraction API | Edge function via Quest Mode | 10 min |
| Matching Algorithm | Edge function via Quest Mode | 15 min |
| Frontend UI | Qoder generated all pages | 30 min |
| Realtime Notifications | InsForge WebSocket + DB trigger | 20 min |

**Total infrastructure time: ~80 minutes** instead of days of setup.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│  InsForge   │────▶│  PostgreSQL │
│  Frontend   │◀────│    BaaS     │◀────│   Database  │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌─────────┐   ┌──────────┐
              │ WebSocket│   │  AI      │
              │ Realtime │   │ Gateway  │
              └─────────┘   └──────────┘
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   │   ├── dashboard/    # Main match feed
│   │   ├── profile/[id]/ # User profile view
│   │   ├── events/       # Event listings
│   │   └── settings/     # User preferences
│   ├── components/       # React components
│   ├── hooks/            # Custom hooks (useRealtime)
│   └── lib/              # Utilities & InsForge client
├── insforge/
│   └── functions/        # Edge functions
└── README.md
```

## Team

- **Dev 1** — Auth & GitHub Integration
- **Dev 2** — Matching Algorithm & Edge Functions
- **Dev 3** — Frontend & UI/UX

Built for Code & Coffee — 3,500 member developer community.

## Next Steps

- [ ] Real-time chat between matches
- [ ] Event RSVP with pre-event matching
- [ ] Team formation for hackathons
- [ ] Organization profiles

## License

MIT

---

**Built with ❤️ using [Qoder](https://qoder.dev) + [InsForge](https://insforge.dev)**

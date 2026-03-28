# DevMatch -- Schema & Endpoint Contracts

Backend: InsForge (PostgreSQL) at `https://wy95uqan.us-east.insforge.app`
Auth: InsForge OAuth (GitHub provider enabled)

---

## Database Schema

### `users`

| Column                   | Type   | Nullable | Default            | Notes              |
| ------------------------ | ------ | -------- | ------------------ | ------------------ |
| `id`                     | uuid   | NO       | `gen_random_uuid()` | PK                 |
| `github_id`              | text   | NO       | --                  | Unique index        |
| `name`                   | text   | NO       | --                  |                    |
| `avatar_url`             | text   | YES      | --                  |                    |
| `bio`                    | text   | YES      | --                  |                    |
| `location`               | text   | YES      | --                  |                    |
| `html_url`               | text   | YES      | --                  |                    |
| `personality_type`       | text   | YES      | --                  | Auto-set by trigger |
| `personality_title`      | text   | YES      | --                  | Auto-set by trigger |
| `personality_description`| text   | YES      | --                  | Auto-set by trigger |
| `personality_rarity`     | text   | YES      | --                  | Auto-set by trigger |
| `skill_breakdown`        | jsonb  | YES      | --                  | Auto-set by trigger |

**Indexes:** `users_pkey` (id), `users_github_id_key` (github_id, unique)
**Triggers:** `skills_update_personality` -- fires on skills table changes, updates personality columns
**RLS:** Disabled

### `skills`

| Column       | Type    | Nullable | Default            | Notes                              |
| ------------ | ------- | -------- | ------------------ | ---------------------------------- |
| `id`         | uuid    | NO       | `gen_random_uuid()` | PK                                 |
| `user_id`    | uuid    | YES      | --                  | FK -> users.id (ON DELETE CASCADE) |
| `skill_name` | text    | NO       | --                  | e.g. "Frontend", "Backend"         |
| `skill_count`| integer | YES      | `1`                | Number of repos in this category   |

**Indexes:** `skills_pkey` (id)
**FK:** `skills_user_id_fkey` -> `users.id` (CASCADE delete)
**Triggers:** `skills_update_personality` fires AFTER INSERT/UPDATE/DELETE, executes `trigger_update_personality()`

### `events`

| Column             | Type        | Nullable | Default            | Notes                               |
| ------------------ | ----------- | -------- | ------------------ | ----------------------------------- |
| `id`               | uuid        | NO       | `gen_random_uuid()` | PK                                  |
| `event_url`        | text        | YES      | --                  | Original Luma/Meetup/other URL      |
| `event_name`       | text        | NO       | --                  |                                     |
| `event_date`       | timestamptz | YES      | --                  |                                     |
| `event_description`| text        | YES      | --                  |                                     |
| `platform`         | text        | YES      | `'other'`          | `luma`, `meetup`, or `other`        |
| `host_user_id`     | uuid        | YES      | --                  | FK -> users.id (ON DELETE SET NULL) |
| `join_code`        | text        | NO       | --                  | Unique, 6-char alphanumeric         |
| `created_at`       | timestamptz | YES      | `now()`            |                                     |

**Indexes:** `events_pkey` (id), `events_join_code_key` (join_code, unique), `idx_events_host` (host_user_id), `idx_events_join_code` (join_code)
**FK:** `events_host_user_id_fkey` -> `users.id` (SET NULL on delete)

### `event_participants`

| Column     | Type        | Nullable | Default            | Notes                               |
| ---------- | ----------- | -------- | ------------------ | ----------------------------------- |
| `id`       | uuid        | NO       | `gen_random_uuid()` | PK                                  |
| `event_id` | uuid        | NO       | --                  | FK -> events.id (ON DELETE CASCADE) |
| `user_id`  | uuid        | NO       | --                  | FK -> users.id (ON DELETE CASCADE)  |
| `joined_at`| timestamptz | YES      | `now()`            |                                     |

**Indexes:** `event_participants_pkey` (id), `event_participants_event_id_user_id_key` (event_id + user_id, unique), `idx_event_participants_event` (event_id), `idx_event_participants_user` (user_id)

### `projects`

| Column                | Type     | Nullable | Default            | Notes                  |
| --------------------- | -------- | -------- | ------------------ | ---------------------- |
| `id`                  | uuid     | NO       | `gen_random_uuid()` | PK                     |
| `title`               | text     | NO       | --                  |                        |
| `description`         | text     | NO       | --                  |                        |
| `owner_id`            | uuid     | NO       | --                  | FK -> users.id         |
| `skills_needed`       | text[]   | YES      | --                  | Array of skill names   |
| `status`              | text     | YES      | `'open'`           | open/in_progress/completed/closed |
| `collaborators_max`   | integer  | YES      | `3`                |                        |
| `collaborators_current`| integer | YES      | `0`                |                        |
| `created_at`          | timestamptz | YES   | `now()`            |                        |

### `project_applications`

| Column       | Type        | Nullable | Default            | Notes                    |
| ------------ | ----------- | -------- | ------------------ | ------------------------ |
| `id`         | uuid        | NO       | `gen_random_uuid()` | PK                       |
| `project_id` | uuid       | NO       | --                  | FK -> projects.id        |
| `user_id`    | uuid        | NO       | --                  | FK -> users.id           |
| `message`    | text        | YES      | --                  | Applicant's message      |
| `status`     | text        | YES      | `'pending'`        | pending/accepted/rejected |
| `created_at` | timestamptz | YES      | `now()`            |                          |

---

## Auth Flow

1. Client calls `insforge.auth.signInWithOAuth({ provider: "github", redirectTo: "/dashboard" })`
2. Browser redirects: App -> GitHub -> InsForge backend -> `/dashboard?insforge_code=...`
3. SDK exchanges `insforge_code` for session (PKCE flow, automatic)
4. Dashboard extracts GitHub numeric ID from `profile.avatar_url` (`/u/(\d+)/`), fetches full profile via `GET /api/github-user?id={numericId}`, upserts into `users` table

---

## Next.js API Routes

### `POST /api/analyze-github`

Fetches a user's last 10 GitHub repos, categorizes their languages into skill areas using InsForge AI Gateway (GPT-4o-mini), and stores the results.

**Request:**

```json
{ "github_id": "12345678" }
```

**Response (200):**

```json
{
  "skills": [
    { "skill_name": "Frontend", "skill_count": 4 },
    { "skill_name": "Backend", "skill_count": 3 },
    { "skill_name": "DevOps", "skill_count": 2 },
    { "skill_name": "AI/ML", "skill_count": 1 }
  ]
}
```

**Error Responses:**

| Status | Condition |
| ------ | --------- |
| 400 | Missing `github_id` |
| 404 | User not found in database |
| 422 | No languages found in repos |
| 500 | AI categorization parse failure or DB insert error |
| 502 | GitHub API failure |

### `GET /api/github-user?id={numericId}`

Server-side proxy for GitHub API. Returns the full public profile for a GitHub user by numeric ID.

### `POST /api/parse-event`

Scrapes metadata from a Luma, Meetup, or other event URL. Extracts title, description, date, and platform from Open Graph tags, JSON-LD, and platform-specific patterns.

**Request:**

```json
{ "url": "https://lu.ma/your-event" }
```

**Response (200):**

```json
{
  "success": true,
  "title": "Code & Coffee Seattle - April 2026",
  "description": "Monthly developer meetup...",
  "date": "2026-04-11T10:00",
  "platform": "luma",
  "url": "https://lu.ma/your-event"
}
```

---

## Edge Functions

### `matches`

Core matching algorithm. Accepts optional `eventId` to scope matching to event participants only.

**Request:** `{ userId, eventId? }`

**Scoring:** Shared skills (+15 each) + complementary skills (+10 each, cross-category) + location bonus (+10 if same city). Returns top 10 sorted by score.

**Response:**

```json
{
  "matches": [{
    "userId": "uuid",
    "name": "string",
    "avatar": "url",
    "skills": ["Frontend", "Backend"],
    "matchScore": 85,
    "sharedSkills": ["TypeScript"],
    "personality": { "type": "full_stack", "title": "Full Stack Wizard", "rarity": "epic" }
  }]
}
```

### `match-github-user`

Public GitHub user analysis without login. Fetches 30 repos, extracts languages, calculates personality, and matches against all database users.

**Request:** `{ githubUsername }`

### `setup-user`

Initializes user profile after OAuth. Fetches repos, extracts languages, stores skills. Personality auto-calculated by database trigger.

**Request:** `{ githubToken, userData }`

### `events`

Event session management. 6 actions:

| Action | Body | Purpose |
|--------|------|---------|
| `list` | `{}` | List all events with host info and participant counts |
| `get` | `{ eventId }` | Single event with host, participants, and user details |
| `lookup` | `{ joinCode }` | Find event by 6-char code |
| `create` | `{ eventName, eventUrl?, eventDate?, eventDescription?, platform, hostUserId? }` | Create event with auto-generated join code. Host auto-joins. |
| `join` | `{ eventId, userId }` | Join an event. Idempotent. |
| `import` | `{ eventId, githubUsernames[] }` | Bulk-add users by GitHub username. Returns matched/notFound lists. |

### `projects`

Project board CRUD. Actions: `list`, `get`, `create`, `apply`, `application` (accept/reject), `my` (user's projects).

### `project-matches`

Finds developers matching a project's skill requirements. Uses skill relationship mapping (e.g., React -> JavaScript, TypeScript, Next.js).

**Request:** `{ skills[], excludeOwner? }`

---

## SDK Client

```typescript
import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
```

All SDK operations return `{ data, error }`. Database inserts require array format: `[{...}]`.

## Notes

- GitHub API calls from `/api/analyze-github` use `GITHUB_TOKEN` for higher rate limits (5,000/hr vs 60/hr unauthenticated).
- The `skills_update_personality` trigger auto-fires when skills change -- updates personality columns on `users`.
- `skill_breakdown` (jsonb) on `users` is populated by the trigger, not by application code.
- Event join codes are 6 characters using `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous characters: 0/O, 1/I/L).
- The `matches` edge function accepts an optional `eventId` parameter. When provided, it only scores participants within that event.

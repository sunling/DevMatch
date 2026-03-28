# DevMatch — Schema & Endpoint Contracts

Backend: InsForge (PostgreSQL) at `https://wy95uqan.us-east.insforge.app`
Auth: InsForge OAuth (GitHub provider enabled)

---

## Database Schema

### `users`

| Column                   | Type   | Nullable | Default            | Notes              |
| ------------------------ | ------ | -------- | ------------------ | ------------------ |
| `id`                     | uuid   | NO       | `gen_random_uuid()` | PK                 |
| `github_id`              | text   | NO       | —                  | Unique index        |
| `name`                   | text   | NO       | —                  |                    |
| `avatar_url`             | text   | YES      | —                  |                    |
| `bio`                    | text   | YES      | —                  |                    |
| `location`               | text   | YES      | —                  |                    |
| `html_url`               | text   | YES      | —                  |                    |
| `personality_type`       | text   | YES      | —                  |                    |
| `personality_title`      | text   | YES      | —                  |                    |
| `personality_description`| text   | YES      | —                  |                    |
| `personality_rarity`     | text   | YES      | —                  |                    |
| `skill_breakdown`        | jsonb  | YES      | —                  |                    |

**Indexes:** `users_pkey` (id), `users_github_id_key` (github_id, unique)
**RLS:** Disabled

### `skills`

| Column       | Type    | Nullable | Default            | Notes                              |
| ------------ | ------- | -------- | ------------------ | ---------------------------------- |
| `id`         | uuid    | NO       | `gen_random_uuid()` | PK                                 |
| `user_id`    | uuid    | YES      | —                  | FK -> users.id (ON DELETE CASCADE) |
| `skill_name` | text    | NO       | —                  | e.g. "Frontend", "Backend"         |
| `skill_count`| integer | YES      | `1`                | Number of repos in this category   |

**Indexes:** `skills_pkey` (id)
**FK:** `skills_user_id_fkey` -> `users.id` (CASCADE delete)
**Triggers:** `skills_update_personality` fires AFTER INSERT/UPDATE/DELETE, executes `trigger_update_personality()`
**RLS:** Disabled

---

## Auth Flow

1. Client calls `insforge.auth.signInWithOAuth({ provider: "github", redirectTo: "/dashboard" })`
2. Browser redirects: App -> GitHub -> InsForge backend -> `/dashboard?insforge_code=...`
3. SDK exchanges `insforge_code` for session (PKCE flow, automatic)
4. Dashboard extracts GitHub numeric ID from `profile.avatar_url`, fetches full profile via `GET https://api.github.com/user/{id}`, upserts into `users` table

---

## Endpoints

### `POST /api/analyze-github`

Fetches a user's last 10 GitHub repos, categorizes their languages into skill areas using InsForge AI Gateway, and stores the results.

**Request:**

```json
{
  "github_id": "12345678"
}
```

`github_id` is the GitHub numeric user ID (stored as text in the `users` table).

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

**Behavior:**
- Looks up user in `users` table by `github_id`
- Fetches GitHub login via `GET https://api.github.com/user/{github_id}`
- Fetches repos via `GET https://api.github.com/users/{login}/repos?sort=pushed&per_page=10`
- Extracts primary language from each repo
- Sends languages to InsForge AI Gateway (`openai/gpt-4o-mini`) for categorization
- Categories: `Frontend`, `Backend`, `DevOps`, `AI/ML`
- Deletes existing `skills` rows for this user, inserts new ones

**Error Responses:**

| Status | Body                                              | Condition                        |
| ------ | ------------------------------------------------- | -------------------------------- |
| 400    | `{ "error": "github_id is required" }`            | Missing `github_id` in body     |
| 404    | `{ "error": "User not found" }`                   | No user with that `github_id`   |
| 422    | `{ "error": "No languages found in recent repositories" }` | All 10 repos have `language: null` |
| 500    | `{ "error": "AI categorization failed to return valid JSON" }` | AI response parse failure |
| 500    | `{ "error": "Failed to store skills: ..." }`      | DB insert error                  |
| 502    | `{ "error": "Failed to fetch GitHub user" }`      | GitHub API `/user/{id}` failed   |
| 502    | `{ "error": "Failed to fetch repositories" }`     | GitHub API `/repos` failed       |

---

## SDK Client Setup

```typescript
import { createClient } from "@insforge/sdk";

const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_BASE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
```

## Notes

- GitHub API calls are unauthenticated (60 req/hr rate limit). Add a `GITHUB_TOKEN` if needed.
- The `skills_update_personality` trigger auto-fires when skills change — updates personality columns on the `users` table.
- `skill_breakdown` (jsonb) on `users` is populated by the trigger, not by application code.

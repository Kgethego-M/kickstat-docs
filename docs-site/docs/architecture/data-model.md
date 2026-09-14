---
sidebar_position: 3
---

# Data Model

:::caution Keep this in sync
This reflects the schema as of the migrations in `backend/migrations/` at
the time of writing. Migrations are the source of truth — if this page and
the migrations folder disagree, trust the migrations, and please update this
page (or flag it for someone to).
:::

## Entity-relationship diagram

```mermaid
erDiagram
  USERS ||--o| SQUADS : "owns (coach)"
  SQUADS ||--o{ USERS : "has (assistants)"
  SQUADS ||--o{ ATHLETES : has
  ATHLETES ||--o| USERS : "may log in as"
  SQUADS ||--o{ EVENTS : schedules
  EVENTS ||--o{ EVENT_TEAMS : "joined by"
  SQUADS ||--o{ EVENT_TEAMS : participates
  EVENTS ||--o{ FIXTURES : contains
  SQUADS ||--o{ FIXTURES : "plays (home)"
  SQUADS ||--o{ FIXTURES : "plays (away)"
  EVENTS ||--o{ LOG_ENTRIES : records
  FIXTURES ||--o{ LOG_ENTRIES : records
  ATHLETES ||--o{ LOG_ENTRIES : "attributed to"
  USERS ||--o{ LOG_ENTRIES : logs
  SQUADS ||--o{ INVITES : "invites into"
  USERS ||--o{ INVITES : sends
  ATHLETES ||--o| INVITES : "links existing roster row"

  USERS {
    serial id PK
    varchar clerk_id UK
    varchar role "coach or assistant"
    integer squad_id FK "set for assistants"
  }
  SQUADS {
    serial id PK
    integer coach_id FK "UK — one squad per coach"
    varchar name
    integer min_roster_size
    boolean onboarded
  }
  ATHLETES {
    serial id PK
    integer squad_id FK
    varchar name
    varchar position
    integer squad_number
    date date_of_birth
    integer user_id FK "set once athlete accepts invite"
  }
  EVENTS {
    serial id PK
    integer squad_id FK
    varchar event_type "match or training"
    varchar format "match or league"
    varchar status "scheduled, live, completed, cancelled"
    timestamp event_date
    integer required_teams
    integer created_by FK
  }
  EVENT_TEAMS {
    serial id PK
    integer event_id FK
    integer squad_id FK
    varchar role
    integer seed_order
  }
  FIXTURES {
    serial id PK
    integer event_id FK
    integer home_squad_id FK
    integer away_squad_id FK
    varchar status
    timestamp event_date
  }
  LOG_ENTRIES {
    serial id PK
    integer event_id FK
    integer fixture_id FK "null for simple events"
    integer athlete_id FK "null = opponent action"
    varchar action_type
    integer value
    integer minute
    integer logged_by FK
    timestamp deleted_at "soft delete = undo"
  }
  INVITES {
    serial id PK
    varchar email
    integer squad_id FK
    integer invited_by FK
    varchar token UK
    varchar status "pending or accepted"
    varchar role "assistant or athlete"
    integer athlete_id FK "only for role=athlete"
  }
```

Two relationships worth calling out since they're easy to misread from
the diagram alone:

- **`SQUADS ||--o{ FIXTURES`** appears twice (home and away) — a fixture
  always references two different squads, both via the same
  `squads.id` foreign key pattern, just in two separate columns
  (`home_squad_id`, `away_squad_id`).
- **`ATHLETES ||--o| INVITES`** is optional and only set when
  `invites.role = 'athlete'` — it links an invite to an *existing*
  roster row (so accepting it attaches login access to that athlete's
  existing stats history) rather than creating a disconnected account.
  Assistant invites don't use this field at all.

---
## Design rationale

### Why a relational model?

The sport coaching domain is inherently relational:
- A **coach** owns exactly one **squad**, and a squad has many **athletes**.
- **Events** belong to a squad and contain **log entries** attributed to specific athletes.
- **Fixtures** connect two squads (home and away) within a **league event**.

PostgreSQL was chosen over alternatives (MongoDB, SQLite) because:
1. **Referential integrity** — foreign keys and cascade deletes ensure that removing a squad automatically cleans up its athletes, events, and log entries.
2. **Complex queries** — standings calculations (points, goal difference, goals for) require JOINs and aggregations that are natural in SQL but awkward in document stores.
3. **Concurrency** — multiple assistants logging simultaneously (advanced tier) requires transaction support.

### Key design decisions

| Decision | Motivation |
|----------|------------|
| `squads.coach_id` is unique | A coach owns exactly one squad. This prevents duplicate squads and simplifies ownership lookups. |
| `athletes.user_id` is nullable and optional | Athletes exist on the roster before they have an account. When they accept an invite, `user_id` is set to link them. |
| `log_entries.deleted_at` for soft deletes | "Undo" doesn't destroy data — it timestamps the row as deleted. This preserves audit history and allows recovery. |
| `invites.athlete_id` is nullable | Assistant invites don't link to a roster row. Only athlete invites do, so accepting the invite attaches login to the existing stats. |
| `events.status` is a string, not an enum | Allows adding new statuses (e.g., `postponed`) without a migration. |
| Statistics are computed on read | Avoiding a separate `stats` table means the log is the single source of truth. Stats can never drift out of sync. |
| `fixtures` are separate from `events` | A league event contains many fixtures. Keeping them in separate tables allows each fixture to have its own log, status, and date. |

## Tables

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `clerk_id` | varchar(255), unique, not null | Links to the Clerk-hosted account |
| `role` | varchar(20), not null, default `'coach'` | `'coach'` or `'assistant'` |
| `squad_id` | integer | Set for assistants (see `fk_users_squad`); a coach's squad is instead found via `squads.coach_id` |
| `created_at` | timestamp | |

### `squads`

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `coach_id` | integer, not null, references `users`, `ON DELETE CASCADE` | **Unique** — a coach owns exactly one squad |
| `name` | varchar | Defaults to `'My Squad'` on self-heal creation |
| `created_at` | timestamp | |

### `athletes`

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `squad_id` | integer, not null, references `squads`, `ON DELETE CASCADE` | |
| `name` | varchar(100), not null | |
| `position` | varchar(50) | |
| `squad_number` | integer | |
| `date_of_birth` | date | |
| `contact_info` | varchar(255) | |
| `created_at` / `updated_at` | timestamp | |

### `events`

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `squad_id` | integer, not null, references `squads`, `ON DELETE CASCADE` | |
| `title` | varchar(150) | Free-text title (calendar-form events) |
| `opponent` | varchar(100) | Set for matches |
| `event_type` | varchar(20), not null, default `'match'` | `'match'` or `'training'` |
| `event_date` | timestamp, not null | |
| `location` | varchar(255) | |
| `duration_minutes` | integer, not null, default `90` | Used by the auto-transition sweep |
| `status` | varchar(20), not null, default `'scheduled'` | `'scheduled'` → `'live'` → `'completed'`, or `'cancelled'` |
| `created_by` | integer, not null, references `users` | |
| `created_at` / `updated_at` | timestamp | |

### `log_entries`

The core of live event tracking — one row per logged action.

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `event_id` | integer, not null, references `events`, `ON DELETE CASCADE` | |
| `athlete_id` | integer, references `athletes`, `ON DELETE SET NULL` | `null` = action attributed to the opponent (e.g. their goal) |
| `action_type` | varchar(30), not null | e.g. `'goal'`, `'yellow_card'`, `'red_card'`, `'penalty'`, `'save'` |
| `is_scoring` | boolean, not null, default `false` | Whether this action contributes to the result |
| `value` | integer, not null, default `1` | Points/goals contributed if scoring |
| `minute` | integer | |
| `notes` | varchar(255) | |
| `logged_by` | integer, not null, references `users` | Who made the entry |
| `logged_at` | timestamp, not null, default `now()` | |
| `updated_at` | timestamp | |
| `deleted_at` | timestamp | **Soft delete** — set on "undo"; the row is kept for audit history but excluded from live views |

### `invites`

| Column | Type | Notes |
|---|---|---|
| `id` | serial, PK | |
| `email` | varchar(255), not null | |
| `squad_id` | integer, not null, references `squads`, `ON DELETE CASCADE` | |
| `invited_by` | integer, not null, references `users` | |
| `token` | varchar(255), not null, unique | Used to build the invite link |
| `status` | varchar(20), not null, default `'pending'` | `'pending'` or `'accepted'` |
| `created_at` | timestamp | |

## Foreign key summary

```
users ──┐
        ├─(coach_id, unique)── squads ──(squad_id)── athletes
        │                         │
        │                         ├─(squad_id)── events ──(event_id)── log_entries
        │                         │                                        │
        │                         └─(squad_id)── invites                   │
        │                                                                  │
        └──(squad_id, nullable, ON DELETE SET NULL)                        │
        └──(created_by / logged_by / invited_by, on events/log_entries/invites)
                                                        athletes ──(athlete_id, ON DELETE SET NULL)┘
```

## Statistics are derived, not stored

Per-athlete and per-event statistics (goals, cards, appearances, result) are
computed on read from `log_entries`, not stored as separate columns —
keeping the log the single source of truth and avoiding stats drifting out
of sync with the entries they're supposed to summarise.

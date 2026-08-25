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

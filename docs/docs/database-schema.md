---
sidebar_position: 4
---

# Database Schema

## Entity Relationship Diagram

```
users
  id (PK)
  clerk_id (unique)
  role  ── 'coach' | 'assistant'
  squad_id (FK → squads.id)
  created_at

squads
  id (PK)
  coach_id (FK → users.id, unique)
  name
  created_at

athletes
  id (PK)
  squad_id (FK → squads.id)
  name
  position
  squad_number
  date_of_birth
  contact_info
  created_at
  updated_at

events
  id (PK)
  squad_id (FK → squads.id)   ← the creating coach's squad
  title
  opponent
  event_type  ── 'match' | 'training'
  format      ── 'match' | 'training' | 'league' | 'tournament'
  required_teams
  event_date
  location
  duration_minutes
  status      ── 'scheduled' | 'open' | 'full' | 'live' | 'completed' | 'cancelled'
  created_by (FK → users.id)
  created_at
  updated_at

event_teams                   ← teams participating in a league/tournament
  id (PK)
  event_id (FK → events.id)
  squad_id (FK → squads.id)
  role        ── 'participant'
  seed_order
  joined_at

fixtures                      ← generated fixtures within a league/tournament
  id (PK)
  event_id (FK → events.id)
  home_squad_id (FK → squads.id)
  away_squad_id (FK → squads.id)
  event_date
  status      ── 'scheduled' | 'live' | 'completed'
  created_at
  updated_at

log_entries                   ← individual live actions (goals, cards, etc.)
  id (PK)
  event_id (FK → events.id)
  fixture_id (FK → fixtures.id, nullable)
  athlete_id (FK → athletes.id, nullable)  ← null = opposition action
  action_type   ── 'goal' | 'assist' | 'shot_on_target' | 'save' | 'yellow_card' | ...
  is_scoring    ── boolean (counts toward the score)
  value         ── default 1
  minute
  notes
  logged_by (FK → users.id)
  logged_at
  updated_at
  deleted_at    ← soft delete for undo

invites
  id (PK)
  email
  squad_id (FK → squads.id)
  invited_by (FK → users.id)
  token (unique)
  status      ── 'pending' | 'accepted'
  created_at
```

## Table Details

### users

Stores application users. Created either by the Clerk webhook (`user.created`) or lazily by `getOrCreateUserId()` on first API request.

| Column | Type | Notes |
|--------|------|-------|
| `clerk_id` | varchar(255) | Unique Clerk user ID |
| `role` | varchar(20) | `'coach'` (default) or `'assistant'` |
| `squad_id` | integer | FK to the squad the user belongs to |

### squads

One squad per coach. Created automatically on sign-up.

### athletes

Athletes belong to a single squad. Only coaches can write to this table.

### events

Covers both simple matches/training sessions and multi-team leagues/tournaments. The `format` column determines behaviour:

- `'match'` or `'training'` — simple two-sided event
- `'league'` or `'tournament'` — creates `event_teams` entries and generates `fixtures`

### event_teams

Join table between events and squads for multi-team events. Populated when a squad joins a league.

### fixtures

Auto-generated when a league becomes full. The schedule is a full round-robin (each pair plays home and away). The `home_squad_id` coach is responsible for logging live actions.

### log_entries

Single table for all live actions — both simple events and fixtures. When `fixture_id IS NULL`, the entry belongs to a simple event. When `athlete_id IS NULL`, the action is attributed to the opposition.

Undo is implemented as a soft delete (`deleted_at` timestamp). Queries filter `WHERE deleted_at IS NULL`.

### invites

Tokens used to invite assistants. When a new user signs up with a matching email, the Clerk webhook assigns them the assistant role and links them to the squad.

## Migrations

Migrations are managed with `node-pg-migrate` and run in order:

| Migration | Description |
|-----------|-------------|
| `1786017376273_add-users-table` | users table |
| `1786353345993_add-squads-table` | squads table |
| `1786353348932_add-athletes-table` | athletes table |
| `1786525267645_add-unique-constraint-squads-coach-id` | unique index on squads.coach_id |
| `1786526180569_add-invites-table` | invites table |
| `1786564700000_create-events` | events table |
| `1786564701000_create-log-entries` | log_entries table |
| `1786700000000_add-title-location-to-events` | title and location columns |
| `1786750000000_add-duration-to-events` | duration_minutes column |
| `1786860000000_add-fk-users-squad` | FK constraint users.squad_id → squads.id |
| `1787000000000_add-event-format-and-teams` | format, required_teams, event_teams table |
| `1787000001000_add-fixtures-table` | fixtures table |
| `1787000002000_add-fixture-id-to-log-entries` | fixture_id FK on log_entries |

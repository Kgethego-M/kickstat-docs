---
sidebar_position: 5
---

# API Reference

All endpoints are prefixed with `/api`. Every endpoint (except `/api/webhooks`) requires a valid Clerk JWT in the `Authorization: Bearer <token>` header.

## Squads

### `GET /api/squads/mine`

Returns the authenticated user's squad.

**Response `200`**
```json
{ "id": 1, "name": "Red Lions FC", "coach_id": 3, "created_at": "..." }
```

---

### `PATCH /api/squads/mine`

Update the squad name. **Coach only.**

**Request body**
```json
{ "name": "New Squad Name" }
```

**Response `200`** — updated squad object.

---

## Athletes

### `GET /api/athletes`

Returns all athletes in the authenticated user's squad.

**Response `200`**
```json
[
  { "id": 1, "name": "Jane Smith", "position": "Forward", "squad_number": 9, ... }
]
```

---

### `POST /api/athletes`

Add a new athlete to the squad. **Coach only.**

**Request body**
```json
{
  "name": "Jane Smith",
  "position": "Forward",
  "squad_number": 9,
  "date_of_birth": "2002-05-14",
  "contact_info": "jane@example.com"
}
```

**Response `201`** — created athlete object.

---

### `PATCH /api/athletes/:id`

Update an athlete. **Coach only.**

**Request body** — any subset of the fields above.

**Response `200`** — updated athlete object.

---

### `DELETE /api/athletes/:id`

Remove an athlete from the squad. **Coach only.**

**Response `204`** — no body.

---

## Events

### `GET /api/events`

Returns all events visible to the authenticated user:
- Events created by the user's squad
- Events the user's squad has joined (`event_teams`)
- Open leagues and tournaments (status `open`)

**Response `200`**
```json
[
  {
    "id": 1,
    "title": "Winter League 2026",
    "format": "league",
    "status": "open",
    "required_teams": 4,
    "event_date": "2026-09-01T14:00:00Z",
    ...
  }
]
```

---

### `POST /api/events`

Create a new event.

**Request body**
```json
{
  "title": "Winter League 2026",
  "opponent": null,
  "event_type": "match",
  "format": "league",
  "required_teams": 4,
  "event_date": "2026-09-01T14:00:00Z",
  "location": "City Stadium",
  "duration_minutes": 90
}
```

`format` values: `"match"`, `"training"`, `"league"`, `"tournament"`

**Response `201`** — created event object. For leagues/tournaments, the creating squad is automatically added as the first participant.

---

### `GET /api/events/:id`

Returns a single event with its participants and fixtures (if league/tournament).

**Response `200`**
```json
{
  "id": 1,
  "title": "...",
  "teams": [...],
  "fixtures": [...]
}
```

---

### `POST /api/events/:id/join`

Join a league or tournament as a participant. Creates an `event_teams` row. If the event becomes full, fixtures are auto-generated (round-robin).

**Response `200`** — `{ "message": "Joined", "fixtures_generated": true }`

---

### `PATCH /api/events/:id`

Update event status or details. **Coach only.**

**Request body**
```json
{ "status": "cancelled" }
```

**Response `200`** — updated event object.

---

### `GET /api/events/:id/log`

Returns all non-deleted log entries for an event.

**Response `200`**
```json
[
  { "id": 5, "action_type": "goal", "minute": 23, "athlete_id": 9, ... }
]
```

---

### `POST /api/events/:id/log`

Add a live action to an event.

**Request body**
```json
{
  "athlete_id": 9,
  "action_type": "goal",
  "minute": 23,
  "notes": "",
  "is_scoring": true,
  "value": 1
}
```

`action_type` values: `goal`, `assist`, `shot_on_target`, `shot_off_target`, `save`, `yellow_card`, `red_card`, `foul_committed`, `foul_won`, `tackle`, `interception`, `clearance`, `corner`, `free_kick`, `penalty_scored`, `penalty_missed`, `own_goal`, `substitution`

**Response `201`** — created log entry.

---

### `PATCH /api/events/:eventId/log/:entryId`

Edit a log entry (e.g. correct the minute).

**Response `200`** — updated entry.

---

### `DELETE /api/events/:eventId/log/:entryId`

Soft-delete a log entry (undo). Sets `deleted_at` timestamp.

**Response `204`** — no body.

---

## Fixtures

### `PATCH /api/fixtures/:id`

Update a fixture's status. Only the home squad's coach/assistant may log actions.

**Request body**
```json
{ "status": "live" }
```

`status` values: `"live"`, `"completed"`

**Response `200`** — updated fixture object.

---

### `GET /api/fixtures/:id/log`

Returns all non-deleted log entries for a fixture.

**Response `200`** — array of log entries.

---

### `POST /api/fixtures/:id/log`

Add a live action to a fixture.

**Request body** — same shape as `POST /api/events/:id/log`.

**Response `201`** — created log entry.

---

### `PATCH /api/fixtures/:fixtureId/log/:entryId`

Edit a fixture log entry.

**Response `200`** — updated entry.

---

### `DELETE /api/fixtures/:fixtureId/log/:entryId`

Soft-delete a fixture log entry (undo).

**Response `204`** — no body.

---

## Invites

### `POST /api/invites`

Generate an invite link for an assistant. **Coach only.**

**Request body**
```json
{ "email": "assistant@example.com" }
```

**Response `201`**
```json
{ "invite_url": "http://localhost:5173/invite/<token>" }
```

---

## Webhooks

### `POST /api/webhooks/clerk`

Receives Clerk webhook events. Not called by the frontend directly.

**Events handled:**
- `user.created` — creates a `users` row; if a pending invite matches the email, assigns `role = 'assistant'` and links the squad
- `user.deleted` — removes the user row

Requires a valid `svix-signature` header (Clerk webhook secret).

---

## Error responses

All errors follow a consistent shape:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Validation error (missing/invalid fields) |
| `401` | Missing or invalid JWT |
| `403` | Authenticated but insufficient role |
| `404` | Resource not found |
| `500` | Unexpected server error |

---

## External Data

Pro fixture data is sourced from [football-data.org](https://www.football-data.org/). Both endpoints require a valid Bearer token and `FOOTBALL_DATA_API_KEY` set in the backend environment. Responses are cached in memory for **5 minutes** to respect the free-tier rate limit (10 req/min).

### Supported league codes

| Code | League |
|------|--------|
| `PL` | Premier League |
| `PD` | La Liga |
| `BL1` | Bundesliga |
| `SA` | Serie A |
| `FL1` | Ligue 1 |
| `CL` | UEFA Champions League |

---

### `GET /api/external/fixtures?league=CODE`

Returns the 20 most recent and upcoming fixtures for the specified league.

**Query params**

| Param | Required | Description |
|-------|----------|-------------|
| `league` | Yes | One of the supported league codes above |

**Response `200`**
```json
[
  {
    "id": 123456,
    "source": "football-data",
    "league": "PL",
    "leagueName": "Premier League",
    "homeTeam": "Arsenal FC",
    "awayTeam": "Chelsea FC",
    "kickoff": "2026-08-22T14:00:00Z",
    "status": "SCHEDULED",
    "score": { "home": null, "away": null },
    "matchday": 3
  }
]
```

`status` values from football-data.org: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, `POSTPONED`, `SUSPENDED`, `CANCELLED`.

**Error responses**

| Status | Cause |
|--------|-------|
| `400` | Unknown league code |
| `503` | `FOOTBALL_DATA_API_KEY` not configured, or upstream unreachable |

---

### `GET /api/external/standings?league=CODE`

Returns the current league table. Returns an empty array for `CL` (Champions League has no simple table).

**Response `200`**
```json
[
  {
    "position": 1,
    "team": "Arsenal FC",
    "crest": "https://crests.football-data.org/57.png",
    "played": 3,
    "won": 3,
    "drawn": 0,
    "lost": 0,
    "goalDifference": 7,
    "points": 9
  }
]
```

**Error responses** — same as `/fixtures`.

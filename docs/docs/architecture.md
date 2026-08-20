---
sidebar_position: 3
---

# System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│   React 19 + Vite (SPA)  ←→  Clerk (auth UI components)    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS (JWT Bearer token)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Backend (Node.js)                  │
│                                                              │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │  /api/squads│  │/api/     │  │/api/     │  │/api/    │  │
│  │  /api/      │  │athletes  │  │events    │  │fixtures │  │
│  │  invites    │  │          │  │          │  │         │  │
│  └─────────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                              │
│  @clerk/express middleware — verifies JWT on every request   │
└────────────────────┬────────────────────────────────────────┘
                     │ pg Pool (connection pooling)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               PostgreSQL 16 Database                         │
│                                                              │
│  users  squads  athletes  events  event_teams                │
│  fixtures  log_entries  invites                              │
└─────────────────────────────────────────────────────────────┘
                     ▲
┌────────────────────┴────────────────────────────────────────┐
│             Clerk (external auth provider)                   │
│   - user.created webhook → auto-create user row              │
│   - JWT signed with Clerk secret → verified by backend       │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

The frontend is a **React Single-Page Application** using React Router for client-side routing.

### Key directories

```
frontend/src/
├── components/
│   ├── Layout.jsx          # App shell: sidebar + main content area
│   └── ProtectedRoute.jsx  # Redirects unauthenticated users to /
├── lib/
│   ├── api.js              # Shared fetch wrapper (attaches JWT, throws on error)
│   └── actions.js          # Shared action type constants (goal, assist, etc.)
└── pages/
    ├── Home.jsx            # Landing page (sign in / sign up)
    ├── Dashboard.jsx       # Overview + invite assistant
    ├── Roster.jsx          # Athlete list + add/edit/delete form
    ├── Events.jsx          # Event list + create event form
    ├── EventDetail.jsx     # Match detail OR league detail (standings, fixtures)
    ├── LiveMatch.jsx       # Live logging view (quick-action buttons + timeline)
    ├── Live.jsx            # Redirect to the active live event
    ├── AccountSettings.jsx # Squad name + Clerk UserProfile widget
    └── InviteAccept.jsx    # Landing page for invite links
```

### Routing

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | Home | No |
| `/dashboard` | Dashboard | Yes |
| `/roster` | Roster | Yes |
| `/events` | Events | Yes |
| `/events/:id` | EventDetail | Yes |
| `/live` | Live | Yes |
| `/live/:id` | LiveMatch (simple event) | Yes |
| `/live/fixture/:fixtureId` | LiveMatch (league fixture) | Yes |
| `/settings` | AccountSettings | Yes |
| `/invite/:token` | InviteAccept | No |

## Backend Architecture

The backend is an **Express REST API** with PostgreSQL accessed via the `pg` connection pool.

### Key files

```
backend/src/
├── app.js                  # Express app, CORS, middleware registration, auto-transition sweep
├── middleware/
│   └── auth.js             # Clerk middleware (real in production, stub in test)
└── routes/
    ├── _squad.js           # Shared helpers: getOrCreateUserId, getOwnedSquadId
    ├── squads.js           # GET/PATCH /api/squads/mine
    ├── athletes.js         # CRUD /api/athletes (coach-only writes)
    ├── events.js           # Events + league logic + log entries
    ├── fixtures.js         # Fixture live logging
    ├── invites.js          # Assistant invite creation
    └── webhooks.js         # Clerk user.created/user.deleted webhook handler
```

### Authentication flow

1. User signs in via Clerk in the browser → receives a JWT
2. Frontend attaches `Authorization: Bearer <token>` to every API request
3. `@clerk/express` middleware verifies the JWT on every route
4. Route handlers call `getAuth(req).userId` to get the Clerk user ID
5. `getOrCreateUserId()` lazily creates a `users` row if the webhook hasn't fired yet

### Auto-transition sweep

A background interval runs every 60 seconds and automatically:
- Sets `events.status = 'live'` when `event_date <= now()`
- Sets `events.status = 'completed'` when `event_date + duration_minutes <= now()`
- Does the same for league `fixtures`

## Role-Based Access Control

| Action | Coach | Assistant |
|--------|-------|-----------|
| View roster | Yes | Yes |
| Add/edit/delete athletes | Yes | No (403) |
| Create events | Yes | Yes |
| Start/end events | Yes | Yes |
| Log live actions (simple match) | Yes | Yes |
| Log live actions (fixture) | Home team only | Home team only |
| Invite assistants | Yes | No (403) |
| Rename squad | Yes | No (403) |

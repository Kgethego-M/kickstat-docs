---
sidebar_position: 7
---

# Roadmap

## What's Built (Sprint 1 — Aug 2026)

This is the current production-ready feature set delivered in Sprint 1.

### Authentication & Roles
- [x] Clerk-powered sign-up and sign-in
- [x] Automatic Coach role on new registration
- [x] Invite-link flow for assigning the Assistant role
- [x] JWT verification on every API request
- [x] Clerk webhook integration for user provisioning

### Squad Management
- [x] One squad auto-created per Coach on sign-up
- [x] Squad rename from Account Settings
- [x] Assistant invitation via tokenised email links

### Roster Management
- [x] Full CRUD for athletes (name, position, squad number, DOB, contact info)
- [x] Coach-only write access; assistants have read-only view

### Events
- [x] Create events: simple match, training session, league, tournament
- [x] Event statuses: `scheduled → open → full → live → completed`
- [x] Auto-transition sweep (runs every 60 seconds based on event date/duration)
- [x] Manual status control (start, cancel, complete)

### League & Tournament
- [x] Multi-team join flow with `required_teams` threshold
- [x] Auto-generated round-robin fixtures when a league becomes full
- [x] Per-fixture live logging (home team only)
- [x] Standings table (auto-calculated from completed fixtures)
- [x] Open leagues visible to all coaches for discovery and joining

### Live Logging
- [x] 19 action types: goal, assist, shot on/off target, save, cards, fouls, etc.
- [x] Opposition toggle (log actions against the away side)
- [x] Minute and notes fields per entry
- [x] Soft-delete undo (restores immediately in the timeline)
- [x] Edit existing log entries
- [x] Real-time score derived from `is_scoring` entries

### Athlete Stats
- [x] Per-athlete stats page (total goals, assists, cards, etc. across all events)

### CI/CD
- [x] Gitea Actions pipeline: lint → build → migrate → test
- [x] 30+ integration tests (Vitest + Supertest)

---

## Planned (Sprint 2+)

The following features are identified in the project brief and backlog for future sprints.

### External API Integration *(Sprint 2 — required by brief)*
- [ ] Integrate a live football data API (e.g. [API-Football](https://www.api-football.com/) or [football-data.org](https://www.football-data.org/)) to:
  - Pull fixture schedules and results for professional leagues
  - Display league tables from real competitions alongside user-created ones
  - Optionally seed squad rosters from the external league data

### Notifications *(Sprint 2)*
- [ ] Email notification when an invite is accepted
- [ ] In-app notification when a league becomes full and fixtures are generated
- [ ] Push notification (PWA) when a live event starts

### Advanced Stats *(Sprint 3)*
- [ ] Heat maps for goal and shot positions
- [ ] Per-event performance ratings for athletes
- [ ] Season aggregate stats (filter by date range or competition)
- [ ] Export stats to CSV/PDF

### Video & Media *(Sprint 3)*
- [ ] Attach a video clip link to a log entry
- [ ] Photo gallery per event

### Public League Pages *(Sprint 4)*
- [ ] Publicly shareable league standings page (no sign-in required)
- [ ] Embeddable widget for club websites

### Mobile App *(Sprint 4)*
- [ ] React Native or PWA packaging for iOS and Android
- [ ] Offline-capable live logging with sync on reconnect

---

## Known Limitations (Sprint 1)

| Area | Limitation |
|------|-----------|
| External API | No external data source integrated yet (Sprint 2 item) |
| Webhooks locally | Clerk webhooks require a public tunnel (ngrok/Cloudflare) to work on `localhost` |
| Real-time sync | Live log updates require a manual page refresh; no WebSocket yet |
| Opponent team | Opponent in simple matches is a free-text string, not a linked squad |
| Fixture schedule | Round-robin only; no bracket/knockout format yet |

---
sidebar_position: 5
---

# Roadmap

The project is delivered in four sprints, each with a clear goal and set of user stories.

## Sprint 0 — Project Setup & Foundation

**Dates:** 24 March 2026 – 30 March 2026

**Goal:** Establish the repository, CI/CD pipeline, tech stack, and initial database schema.

**Deliverables:**
- Gitea repository with branch protection rules
- Self-hosted `act_runner` on Oracle Linux 9
- Initial PostgreSQL schema (users, squads, athletes)
- Hello-world frontend and backend running locally
- README and getting-started guide

## Sprint 1 — Authentication, Squad Setup & Roster Management

**Dates:** 06 April 2026 – 13 April 2026

**Goal:** Deliver core onboarding and squad management features.

**User Stories:**
- US1 — Coach & assistant registration and login
- US2 — Password reset & account deletion
- US21 — Coach self-service sign-up
- US22 — First-login setup flow
- US23 — Invited assistant sign-up
- US24 — Athlete email invites
- US26 — Assistant role permission boundary
- US3 — Add athletes to roster
- US4 — Edit or remove athlete
- US-I1 — CI/CD pipeline
- US-I2 — Public documentation site

**Metrics:**
- 37 backend tests passing
- 65% statement coverage
- Clean lint on frontend and backend
- All Sprint 1 stories merged to `main`

## Sprint 2 — Events, Fixtures & Live Match Logging

**Dates:** 14 April 2026 – 28 April 2026 *(planned)*

**Goal:** Enable coaches to schedule events, generate fixtures, and log live match actions.

**User Stories:**
- US5 — Create match or training event
- US6 — Edit or cancel event
- US13 — Start live event logging
- US14 — Log scoring actions
- US15 — Log disciplinary actions
- US16 — Undo log entry
- US18 — Venue weather forecast
- League/tournament auto-scheduling

**Deliverables:**
- Full event CRUD with status transitions
- Live match logging UI
- Auto-generated fixtures for leagues/tournaments
- Weather widget on event pages

## Sprint 3 — Statistics, Notifications & Advanced Features

**Dates:** 29 April 2026 – 12 May 2026 *(planned)*

**Goal:** Deliver athlete statistics, notifications, and league standings.

**Planned Features:**
- Athlete stats dashboard (goals, cards, appearances)
- Season-level comparisons
- In-app notifications for event reminders
- Staff dashboard for facility/trade management
- Listing filters and stock management

## Sprint 4 — Polish, Bug Fixes & Deployment Prep

**Dates:** 13 May 2026 – 22 May 2026 *(planned)*

**Goal:** Fix post-assessment bugs, improve coverage, and prepare for deployment.

**Planned Features:**
- Bug fixes from Sprint 3 demo feedback
- Coverage improvement push
- Production deployment to cloud host
- Final documentation updates

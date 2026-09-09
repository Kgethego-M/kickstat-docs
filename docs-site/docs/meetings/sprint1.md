# Sprint 1 Meetings — Sport Coaching Tool

**Course:** COMS3011A
**Team:** bug-off

---

## Sprint Planning Meeting

**Date:** 02/08/2026
**Time:** 14:00
**Duration:** 90 minutes
**Location:** WSS (In Person)
**Type:** Sprint Planning

**Attendees:**
- Lindokuhle
- Kgethego
- Mmaphefo
- Tasmiya
- Kgotlelelo

**Absentees:** None

**Description:** Initial sprint planning session focused on understanding project scope, confirming the tech stack, and dividing Sprint 1 work across the team.

**Discussion Points:**
1. Reviewed the COMS3011A project brief and Sport Coaching Tool requirements
2. Evaluated technology stack (React + Vite, Express, PostgreSQL, Clerk)
3. Discussed the key requirements all projects must meet (CI/CD, hand-written API, non-monolithic architecture, documentation site)
4. Broke down Sprint 1 into epics: Auth & Roles (E1), Roster Management (E2), Event Management (E3), Infrastructure & CI/CD (E4)
5. Assigned epics to individual team members

**Decisions Made:**
- Clerk will be used for authentication (established library, satisfies "no custom auth" requirement)
- PostgreSQL will be used for the database, managed via `node-pg-migrate`
- Sprint 1 will focus on authentication, roles, roster management, and initial event management
- Gitea Actions will be used for CI/CD, self-hosted runner to be set up

**Next Meeting:**
- **Date:** 07/08/2026
- **Time:** 19:30
- **Location:** WhatsApp (Online)
- **Purpose:** Standup — progress updates and blockers

---

## Standup Meeting 1

**Date:** 07/08/2026
**Time:** 19:30
**Duration:** 20 minutes
**Location:** WhatsApp (Online)
**Type:** Daily Scrum

**Updates:**
- **Tasmiya:** Set up backend project structure, integrated Clerk authentication middleware, built the `users` table migration and webhook route to sync Clerk signups to Postgres
- **Kgethego:** Began CI/CD pipeline setup on Gitea Actions
- **Lindokuhle:** Started roster management backend (squads and athletes tables)
- **Mmaphefo:** Investigating event management data model
- **Kgotlelelo:** Researching weather API options for event venue integration

**Blockers:**
- Repo write permissions not yet granted to team members — flagged to the org owner for resolution
- Port conflicts with local dev servers (AirPlay Receiver on macOS occupying port 5000)

**Next Steps:**
- Resolve repo permissions before continuing feature work
- Continue backend scaffolding once unblocked

---

## Standup Meeting 2

**Date:** 08/08/2026
**Time:** 20:00
**Duration:** 20 minutes
**Location:** WhatsApp (Online)
**Type:** Daily Scrum

**Updates:**
- **Tasmiya:** Repo permissions resolved. Auth flow working end-to-end (signup, login, password reset, account deletion via Clerk UserProfile + webhook cleanup). Route guards implemented on frontend.
- **Kgethego:** CI pipeline (`ci.yml`) added — frontend lint/build and backend lint/test jobs defined, Postgres service container configured
- **Lindokuhle:** Roster management (add/edit/remove athletes) working, shared design system started
- **Mmaphefo:** Event management data model in progress
- **Kgotlelelo:** Weather API selected, initial integration in progress

**Blockers:**
- CI workflows stuck on "Waiting" — no active Gitea Actions runner registered
- Two team members independently started roster management on branches with the same name, causing a later merge conflict

**Next Steps:**
- Investigate and resolve the CI runner issue
- Coordinate roster management work to avoid duplicate effort going forward
- Continue event management and live logging features

---

## Backlog Refinement

**Date:** 12/08/2026
**Time:** 19:00
**Duration:** 30 minutes
**Location:** WhatsApp (Online)
**Type:** Backlog Refinement

**Discussion:**
1. Reviewed Sprint 1 progress against the user story backlog
2. Tasmiya demonstrated the full auth + roles + invites flow (coach signup, squad auto-creation, assistant invite via link, correct role assignment) running locally
3. Reconciled the roster management merge conflict between two independently developed branches — combined into a single `feature/roster-management` branch, including a fix for a duplicate-squad-creation race condition
4. Kgethego and Tasmiya confirmed the CI/CD runner was non-functional; escalated to tutor, who confirmed the team is responsible for setting up its own runner
5. Reviewed acceptance criteria for US1–US6 (auth, roster) — confirmed passing via manual and automated testing
6. Identified outstanding items for the remainder of Sprint 1: live event logging, dashboard/stats, weather API integration, documentation site, Initial Design & Dev Plan document

**Decisions Made:**
- Auth, roles, invites, and roster management confirmed complete and merged
- Tasmiya to set up a self-hosted CI runner (Oracle Cloud free tier) since no shared runner exists
- Documentation site and Design & Dev Plan document to be prioritised given their weighting in the Milestone 1 rubric
- All team members to check task ownership before starting new work, to avoid further duplicate-branch conflicts

**Next Meeting:**
- **Date:** TBD, before Milestone 1 submission (25/08/2026)
- **Purpose:** Sprint Review / Retrospective

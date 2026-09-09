---
sidebar_position: 2
---

# Feature Rationale

This page explains why each major feature exists and what user problem it solves. Every feature ties back to a user story in the backlog.

## E1 · Auth & Roles

### Coach self-service sign-up (US21)

**Why:** Coaches are the primary users. Requiring an admin to create accounts would block adoption. Self-service sign-up lets a coach start using the tool immediately, while Clerk handles password security, email verification, and password reset flows so the team does not build a custom auth system.

**What it does:** A visitor signs up via Clerk and is automatically assigned the `coach` role. A squad is created and linked to them on first use.

### First-login setup flow (US22)

**Why:** A coach with no athletes has nothing useful to see on a dashboard. The setup flow turns an empty state into an onboarding action, guiding the coach to name their squad and add the first athlete before they reach the main app.

**What it does:** When a coach has zero athletes, the dashboard redirects to a setup screen prompting for squad name and first athlete details.

### Invited assistant sign-up (US23)

**Why:** Coaches need help on match day but do not want to share their own login. Invited assistants get their own account, linked automatically to the coach's squad, with a restricted role.

**What it does:** The coach enters an assistant's email on the dashboard. An invite token is created and emailed. When the assistant signs up via the invite link, their account is assigned the `assistant` role and linked to the inviting squad.

### Athlete email invites (US24)

**Why:** Athletes benefit from seeing their own stats, but they should not see the full squad or be able to edit data. Linking an athlete's roster row to their login gives them a personalised view without creating duplicate records.

**What it does:** When adding an athlete, the coach can optionally enter an email. An invite is created and, once accepted, the athlete's user row is linked to their roster record.

### Assistant role permission boundary (US26)

**Why:** Trust is a real concern. Coaches must be able to delegate match-day logging without worrying that an assistant can delete athletes or change squad details.

**What it does:** Backend route guards reject any roster write attempt from a user whose role is not `coach`. The frontend also hides add/edit/remove controls for assistants.

### Account deletion (US2)

**Why:** Users have a right to remove their data. Account deletion must clean up local records and the Clerk identity record.

**What it does:** The user confirms deletion in Settings. The backend deletes invites, log entries, user row, and calls Clerk's API to delete the Clerk user.

## E2 · Roster Management

### Add athletes to roster (US3)

**Why:** The roster is the foundation of the app. Without it, there are no athletes to log events against and no stats to derive.

**What it does:** A coach fills in name, position, squad number, date of birth, and contact info. The athlete is stored under the coach's squad.

### Edit or remove athlete (US4)

**Why:** Details change — players switch positions, numbers get reused, contact info is updated. Coaches need full control over their squad data.

**What it does:** Coaches can edit any athlete in their squad or remove them entirely. Backend ownership checks prevent coaches from modifying another squad's athletes.

## E3 · Event Management

### Create match or training event (US5)

**Why:** Match and training schedules are central to a coach's week. Recording them in the app makes them visible to assistants and athletes and provides the context for live logging.

**What it does:** A coach creates an event with title, type, opponent (for matches), date, time, location, and duration.

### Edit or cancel event (US6)

**Why:** Plans change. Coaches need to update times or cancel events without losing historical records.

**What it does:** Events can be edited or marked as cancelled. Cancelled events cannot accept new log entries.

### Live event logging (US13–US16)

**Why:** Memory fades quickly during a match. Logging actions as they happen produces more accurate records and lets assistants and coaches see the state of play in real time.

**What it does:** During a live event, users log actions (goal, yellow card, red card, penalty, save, substitution) against an athlete or the opponent. Entries can be undone via soft delete.

### Venue weather forecast (US18)

**Why:** Outdoor sports depend on weather. Showing the forecast at the venue helps coaches decide whether to proceed, postpone, or change kit.

**What it does:** The app geocodes the venue name and fetches current weather and a short forecast from a public weather API.

## E4 · Infrastructure & Documentation

### CI/CD pipeline (US-I1)

**Why:** With multiple developers contributing, automated lint and test checks catch regressions before they reach `main`.

**What it does:** Every push and PR runs frontend lint/build and backend lint/test against a fresh PostgreSQL service container.

### Public documentation site (US-I2)

**Why:** Stakeholders, tutors, and future team members need a single place to understand the product, architecture, and how to run it.

**What it does:** This Docusaurus site documents the product vision, user stories, acceptance tests, architecture, and development guides.

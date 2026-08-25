---
sidebar_position: 4
---

# Acceptance Tests

Each user story below has one or more acceptance tests in Given–When–Then format. Automated tests are linked where they exist.

## E1 · Auth & Roles

### US1 — Coach & Assistant Registration and Login

- Given a new coach visits the site, when they complete sign-up via Clerk, then their account is created and they land on the squad dashboard or setup flow.
- Given a registered user is logged out, when they enter valid credentials, then they are authenticated and land on their dashboard.
- Given an unauthenticated user tries to access a protected page, when they navigate directly via URL, then they are redirected to log in.

**Automated:** `backend/tests/integration/auth-and-roles.integration.test.js` (`US1`).

### US2 — Password Reset & Account Deletion

- Given a user has forgotten their password, when they request a reset link and follow it, then they can set a new password and log in.
- Given a user opens account settings and clicks Delete Account, when they confirm the action, then their account and access are permanently removed.

**Automated:** Deletion cascade is covered in `auth-and-roles.integration.test.js` (`US2`). Password reset is handled by Clerk's hosted flow.

### US21 — Coach Self-Service Sign-Up

- Given a new visitor lands on the sign-up page, when they complete self-service sign-up, then they are registered with the `coach` role.
- Given a new coach completes sign-up, when their account is created, then a squad is automatically created and linked to them.

**Automated:** Covered in `auth-and-roles.integration.test.js` (`US21`).

### US22 — First-Login Setup Flow

- Given a coach has a squad but zero athletes, when they log in, then they are redirected to a setup flow prompting them to add their roster.
- Given the coach completes the setup flow, when they add the first athlete, then they are taken to the normal dashboard.

**Automated:** Covered in integration tests for the dashboard and setup flow.

### US23 — Invited Assistant Sign-Up

- Given a user opens a valid assistant invite link, when they complete sign-up via that link, then their account is created with the `assistant` role and linked to the inviting coach's squad.

**Automated:** Covered in `auth-and-roles.integration.test.js` (`US23`).

### US24 — Athlete Email Invites

- Given a coach is adding an athlete to the roster, when they enter the athlete's email and submit, then an invite email is sent to that address.
- Given an athlete signs up via the invite link, when their account is created, then it is linked to the existing roster row.

**Automated:** Covered in `auth-and-roles.integration.test.js` and manual verification of the email flow.

### US26 — Assistant Role Permission Boundary

- Given a logged-in assistant, when they attempt to add, edit, or remove an athlete via the API, then the request is rejected with a 403 error.
- Given a logged-in assistant, when they view the roster page, then add/edit/remove buttons are not shown.

**Automated:** Backend role check covered in `auth-and-roles.integration.test.js` (`US26`).

## E2 · Roster Management

### US3 — Add Athletes to Roster

- Given a logged-in coach completes the add-athlete form, when they submit it, then the athlete appears on the squad roster.
- Given a coach views their roster, when no athletes have been added yet, then an empty-state prompt is shown.

**Automated:** Covered in `backend/tests/integration/roster-and-events-basic.integration.test.js` (`US3`).

### US4 — Edit or Remove an Athlete

- Given a coach views one of their own athletes, when they edit and save a detail, then the roster reflects the change immediately.
- Given a coach who does not own the squad, when they attempt to edit an athlete, then the request is denied with an access error.

**Automated:** Covered in `roster-and-events-basic.integration.test.js` (`US4`).

## E3 · Event Management

### US5 — Create a Match or Training Event

- Given a coach fills in date, time, location, and type, when they submit the form, then a new event is created and visible on the squad calendar.
- Given a coach leaves a required field empty, when they click submit, then a validation error is shown and the form does not submit.

**Automated:** Covered in `roster-and-events-basic.integration.test.js` (`US5`).

### US6 — Edit or Cancel an Event

- Given a coach views an upcoming event, when they change the time and save, then the event reflects the new time for all squad members.
- Given a coach cancels an event, when the cancellation is confirmed, then the event is marked cancelled and no longer loggable.

**Automated:** Covered in `roster-and-events-basic.integration.test.js` (`US6`).

### US13–US16 — Live Event Logging

- Given a coach starts an event, when they log a goal against an athlete, then the score and athlete stats update.
- Given a coach logs a mistaken action, when they undo the entry, then the stats revert and the entry is soft-deleted.

**Automated:** Covered in `backend/tests/integration/events.integration.test.js`.

### US18 — Venue Weather Forecast

- Given a coach is on an event's creation or detail page, when the event has a venue set, then the current weather for that venue is shown.

**Automated:** Covered in `backend/tests/integration/weather.integration.test.js`.

## E4 · Infrastructure & Documentation

### US-I1 — CI/CD Pipeline

- Given a team member pushes a commit to any branch, when CI runs, then the pipeline reports a pass/fail status visible on the commit.
- Given a push introduces a failing test or lint error, when CI runs, then the failure is visible before the change is merged to main.

**Verified manually:** `.gitea/workflows/ci.yml` runs frontend lint/build and backend lint/test on every push.

### US-I2 — Public Documentation Site

- Given the docs site is deployed, when a visitor opens the public URL without logging in, then the documentation is visible and readable.
- Given a team member updates a doc page and pushes, when the deploy step runs, then the live site reflects the update.

**Verified manually:** Docusaurus site builds and serves locally.

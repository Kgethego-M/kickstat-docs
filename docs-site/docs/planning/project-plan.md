---
sidebar_position: 1
---

# Project Plan

## Project Overview

**Product:** Kickstat — Sport Coaching Tool  
**Course:** COMS3011A  
**Team:** bug-off  
**Duration:** 26 July 2026 – 23 October 2026  
**Methodology:** Scrum / Agile with 2-week sprints  
**Work Tracker:** Gitea Issues and Projects

## Vision

Give every sports coach a simple, role-aware platform to manage their squad, schedule events, and log match data in real time — replacing notebooks and spreadsheets with accurate, shareable, derived statistics.

## Objectives

1. Deliver a working MVP by the end of Sprint 1 that supports coach onboarding, roster management, and role-based access.
2. Add event scheduling and live match logging by the end of Sprint 2.
3. Add statistics, notifications, and league/tournament support by the end of Sprint 3.
4. Polish, fix bugs, and deploy by the end of Sprint 4.


## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | React + Vite | Component-based UI, fast dev server |
| Backend | Node.js + Express | Hand-written routes, lightweight |
| Database | PostgreSQL | Relational data, referential integrity |
| Auth | Clerk | Secure, hosted auth with email verification |
| Migrations | node-pg-migrate | Version-controlled schema changes |
| Testing | Vitest + Supertest | Fast integration tests against real DB |
| CI/CD | Gitea Actions + act_runner | Self-hosted, private repo CI |
| Docs | Docusaurus | Same JS toolchain as the app |

## Methodology: Scrum

We use Scrum because requirements evolve as stakeholders give feedback. Short sprints let us deliver working features frequently and adapt quickly.

### Ceremonies

| Ceremony | Frequency | Purpose |
|---|---|---|
| Sprint Planning | Start of sprint | Select backlog items, estimate, assign tasks |
| Daily Standup | Daily (async on WhatsApp) | Share progress and blockers |
| Backlog Refinement | Mid-sprint | Review progress, clarify acceptance criteria |
| Sprint Review | End of sprint | Demo working features to stakeholders |
| Sprint Retrospective | End of sprint | Reflect and improve process |

### Definition of Done

A user story is done when:

1. The feature is implemented and manually tested locally.
2. Automated acceptance tests pass (where applicable).
3. Code is linted and builds successfully.
4. Code is reviewed and merged to `main`.
5. Relevant documentation is updated.

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Clerk webhook unavailable locally | Invited users created as coaches | Frontend invite-accept flow bypasses webhook in dev |
| Merge conflicts near deadlines | Delayed delivery | Merge to `main` frequently, rebase daily |
| Test database drift | Failing CI | Migrations run fresh on every CI job |
| Self-hosted runner downtime | CI blocked | Document runner recovery steps |

## Milestones

| Milestone | Date | Deliverable |
|---|---|---|
| Sprint 0 end | 26 July 2026 – 1 August 2026 | Repo, CI runner, initial schema |
| Sprint 1 end | 25 August 2026 | Auth, roster, invites, permissions |
| Sprint 2 end | 15 September 2026 | Events, live logging, fixtures, weather |
| Sprint 3 end | 29 September 2026 | Stats, notifications, leagues |
| Sprint 4 end | 11 October 2026 | Polish, bug fixes, deployment |

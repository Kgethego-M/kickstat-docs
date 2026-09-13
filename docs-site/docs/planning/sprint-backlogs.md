---
sidebar_position: 2
---

# Sprint Backlogs

This page contains the sprint backlogs for Kickstat. Story points follow the scale: 1 trivial, 2 small, 3 standard, 5 large, 8 very large.

## Sprint 0 — Project Setup & Foundation

**Dates:** 24 March 2026 – 30 March 2026  
**Goal:** Establish repository, CI/CD, tech stack, and initial schema.

| Story ID | Story | Task | Assignee | SP |
|---|---|---|---|---|
| INF-01 | Repository setup | Create Gitea repo and branch protection | Kgethego | 1 |
| INF-02 | CI/CD runner | Set up act_runner on Oracle Linux 9 | Tasmiya | 5 |
| INF-03 | Frontend skeleton | Initialise Vite React app with routing | Lindokuhle | 2 |
| INF-04 | Backend skeleton | Initialise Express app with health route | Mmaphefo | 2 |
| INF-05 | Initial schema | Create users, squads, athletes migrations | Mmaphefo | 3 |
| INF-06 | README | Write getting-started guide | Kgotlelelo | 2 |
|  |  | **Total** |  | **15** |

## Sprint 1 — Authentication, Squad Setup & Roster Management

**Dates:** 06 April 2026 – 13 April 2026  
**Goal:** Deliver core onboarding and squad management features.

| Story ID | Story | Task | Assignee | SP |
|---|---|---|---|---|
| US1 | Coach & assistant login | Clerk auth middleware (backend + frontend) | Tasmiya | 3 |
| US21 | Coach self-service sign-up | Auto-create squad on first API call | Tasmiya | 2 |
| US22 | First-login setup flow | Build setup UI and redirect logic | Lindokuhle | 3 |
| US23 | Assistant invite | Create invite token + email + accept flow | Tasmiya | 3 |
| US24 | Athlete email invite | Add email to athlete + athlete invite flow | Tasmiya | 3 |
| US26 | Assistant permission boundary | Backend role checks + hide UI controls | Mmaphefo | 3 |
| US3 | Add athletes | Roster add form + backend route | Lindokuhle | 2 |
| US4 | Edit/remove athlete | Edit/delete form + ownership checks | Mmaphefo | 2 |
| US2 | Account deletion | Danger-zone UI + backend cleanup | Kgotlelelo | 3 |
| US-I1 | CI/CD pipeline | Configure `.gitea/workflows/ci.yml` | Kgethego | 3 |
| US-I2 | Documentation site | Scaffold Docusaurus and initial pages | Kgotlelelo | 3 |
|  |  | **Total** |  | **30** |

## Sprint 2 — Events, Fixtures & Live Match Logging

**Dates:** 26 August 2026 – 15 September 2026
**Goal:** Enable coaches to schedule events, generate fixtures, log live match actions, and meet all Milestone 2 rubric criteria.

| Story ID | Story | Task | Assignee | SP | Status |
|---|---|---|---|---|---|
| US5 | Create event | Event form + backend route | Lindokuhle | 3 | Done |
| US6 | Edit/cancel event | Update/cancel endpoints + UI | Mmaphefo | 2 | Done |
| US6-B | Cancelled event logging block | Reject logs on cancelled events | [name] | 1 | To Do |
| US13 | Start live event | Event status transition to live | Mmaphefo | 2 | Done |
| US14 | Log scoring actions | Goals, penalties, saves endpoints | Lindokuhle | 3 | Done |
| US15 | Log disciplinary actions | Yellow/red card endpoints | Lindokuhle | 2 | Done |
| US16 | Undo log entry | Soft-delete log entry | Mmaphefo | 2 | Done |
| US18 | Weather forecast | Venue geocoding + Open-Meteo integration | Kgethego | 3 | Done |
| US19 | League/tournament fixtures | Round-robin fixture generation | Mmaphefo | 5 | Done |
| US20 | Event team join | Other squads join open events | Kgethego | 3 | Done |
| US26 | Assistant permission boundary | Backend role checks + hide UI controls | [name] | 3 | To Do |
| T-01 | Frontend test framework | Vitest + React Testing Library setup | [name] | 3 | In Progress |
| T-02 | API documentation | OpenAPI spec + Swagger UI | [name] | 2 | To Do |
| D-01 | Deploy docs site | Docusaurus to Netlify/Cloudflare | [name] | 2 | To Do |
| F-01 | User testing session | Recruit 3-5 users, document feedback | [name] | 3 | To Do |
|  |  | **Total** |  | **40** |  |

## Sprint 3 — Statistics, Notifications & Advanced Features

**Dates:** 29 April 2026 – 12 May 2026 *(planned)*  
**Goal:** Deliver athlete statistics, notifications, and league standings.

| Story ID | Story | Task | Assignee | SP |
|---|---|---|---|---|
| US27 | Athlete stats dashboard | Aggregate goals, cards, appearances | Lindokuhle | 3 |
| US28 | Season comparisons | Compare stats across events | Kgotlelelo | 3 |
| US29 | Event notifications | Reminders before events | Kgethego | 3 |
| US30 | League standings | Standings table from fixtures | Mmaphefo | 3 |
| US31 | Top scorers chart | Chart of leading goal scorers | Lindokuhle | 2 |
| US32 | Public squad page | View-only public squad profile | Kgethego | 3 |
|  |  | **Total** |  | **17** |

## Sprint 4 — Polish, Bug Fixes & Deployment Prep

**Dates:** 13 May 2026 – 22 May 2026 *(planned)*  
**Goal:** Fix post-assessment bugs, improve coverage, and deploy.

| Story ID | Story | Task | Assignee | SP |
|---|---|---|---|---|
| FIX-01 | Bug fixes | Address demo feedback | All | 5 |
| FIX-02 | Coverage push | Add missing tests to reach 75%+ | Kgotlelelo | 5 |
| DEP-01 | Deploy frontend | Static site deployment | Kgethego | 2 |
| DEP-02 | Deploy backend | Managed Node.js deployment | Mmaphefo | 3 |
| DOC-01 | Final docs | Update all documentation | Tasmiya | 3 |
|  |  | **Total** |  | **18** |

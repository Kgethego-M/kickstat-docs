---
slug: /
sidebar_position: 1
---

# Kickstat — Overview

**Kickstat** is a full-stack sport coaching tool built for COMS3011A at the University of the Witwatersrand. It allows coaches and assistants to manage squads, schedule matches and leagues, log live match data, and track player statistics across tournaments.

## Who is it for?

| Role | Capabilities |
|------|-------------|
| **Coach** | Create squad, manage roster, create events and leagues, log live data, invite assistants |
| **Assistant** | Log live match data, view roster and events |

## Key Features

- **Squad & Roster Management** — add athletes with position, number, DOB, and contact info
- **Match Scheduling** — schedule matches and training sessions with auto status transitions
- **Live Match Logging** — log goals, assists, shots, saves, cards, substitutions in real time; edit or undo entries
- **Leagues & Tournaments** — multi-team round-robin leagues with auto-schedule generation, live standings, and top scorer/assister charts
- **Role-Based Access** — coaches manage data; assistants log live actions only
- **Invite System** — coaches invite assistants via unique invite links

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router, Clerk |
| Backend | Node.js, Express, PostgreSQL |
| Auth | Clerk |
| Testing | Vitest, Supertest |
| CI/CD | Gitea Actions |

## Navigation

- [Getting Started](./getting-started) — how to run the project locally
- [Architecture](./architecture) — system design and component overview
- [Database Schema](./database-schema) — full ER diagram and table definitions
- [API Reference](./api-reference) — all backend endpoints
- [UI Design](./ui-design) — page layout and design decisions
- [Roadmap](./roadmap) — what's built and what's planned

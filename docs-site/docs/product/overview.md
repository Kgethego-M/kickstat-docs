---
sidebar_position: 1
---

# Product Overview

## Product Name

**Kickstat** — a sport coaching tool for managing squads, events, and live-match data.

## The Problem

Sports coaches and their assistants currently track squad information across a mix of notebooks, spreadsheets, and messaging apps. This leads to:

- **Fragmented athlete records** — player history, contact details, and performance data are stored in different places.
- **No live match visibility** — scoring moments, penalties, and substitutions are written down after the fact, increasing the risk of errors and missed detail.
- **No safe way to delegate** — giving an assistant access often means sharing full control of the roster, which coaches are reluctant to do.
- **Manual statistics** — goals, cards, appearances, and other metrics are calculated by hand after each match.

## The Solution

Kickstat gives coaches a single platform to manage their squad from registration through to match-day logging and season-long statistics.

### Core Users

| User | Role | What They Need |
|---|---|---|
| **Coach** | Primary admin | Create and manage the squad, schedule events, log live match data, invite assistants and athletes. |
| **Assistant** | Helper | View the roster, view events, and help log live actions during a match — without being able to change the roster. |
| **Athlete** | Squad member | View personal stats, see upcoming fixtures, and understand their own contribution over a season. |

### Key Features

| Feature | Why It Matters |
|---|---|
| **First-login squad setup** | A new coach lands in a guided flow that creates their squad and adds the first athlete immediately, removing setup friction. |
| **Roster management** | Coaches can add, edit, and remove athletes with details like position, squad number, date of birth, and contact info all in one place. |
| **Athlete email invites** | Coaches can invite athletes by email so each athlete gets their own login linked to their existing roster record. |
| **Assistant permission boundary** | Assistants can view the roster and help log events, but cannot add, edit, or remove athletes — protecting squad data. |
| **Event scheduling** | Coaches create matches and training sessions with date, time, location, and type; events can be edited or cancelled. |
| **Live event logging** | During a match, coaches and assistants log goals, cards, penalties, saves, and substitutions in real time. |
| **Derived statistics** | Per-athlete and per-event stats are calculated automatically from log entries, so stats never drift out of sync. |
| **Weather integration** | Outdoor event planning shows current weather for the venue, helping coaches decide on cancellations or kit changes. |
| **Account deletion** | Users can delete their account permanently, with backend cleanup of dependent records and Clerk user removal. |

## Scope Tiers

Following the course brief, features are organised into three tiers:

| Tier | Standard |
|---|---|
| **Basic** | Roster and event management, live logging of scoring moments and penalties, derived per-athlete/per-event statistics, dashboard. |
| **Intermediate** | Multi-user accounts with roles and permissions, fixtures with other squads, season-level statistics, external service integration (weather), notifications. |
| **Advanced** | Multi-squad leagues and tournaments, public squad pages, automated scheduling suggestions, real-time collaborative logging across devices. |

## Success Metrics

- Coaches can set up a squad and add athletes within the first login.
- Assistants can log match events but cannot modify the roster.
- Athletes can view accurate, up-to-date personal stats after each match.
- All data changes are traceable and revertible (soft deletes, audit history).

---
sidebar_position: 2
---

# UI/UX Design

This page describes the screen-level design of Kickstat and the user flows that connect them.

## Information Architecture

```
Home / Landing
├── Sign Up / Log In (Clerk)
├── Dashboard
│   ├── Setup flow (first login, no athletes)
│   ├── Squad overview
│   ├── Live event card
│   └── Invite assistant form
├── Roster
│   ├── Athlete list
│   ├── Add athlete form
│   └── Edit athlete form
├── Events
│   ├── Event list
│   ├── Create event form
│   ├── Event detail
│   └── Live match logging
├── Athlete Stats
│   └── Personal performance dashboard
└── Settings
    ├── Account (Clerk profile)
    └── Danger zone — delete account
```

## Key Screens

### 1. Home / Landing

**Purpose:** Explain the product and drive sign-up.

**Contents:**
- Product name and tagline
- Three benefit bullets (roster, live logging, stats)
- Sign up / log in buttons

### 2. First-Login Setup

**Purpose:** Onboard a new coach before they see the dashboard.

**Contents:**
- Squad name input
- First athlete form (name, position, number)
- "Finish setup" button

**Why:** A coach with no athletes has nothing useful to see. The setup flow turns an empty state into progress.

### 3. Dashboard

**Purpose:** Central hub for the coach.

**Contents:**
- Welcome heading
- Upcoming events list
- Live event card (if an event is in progress)
- Invite assistant section
- Quick link to roster

**Role-aware:** Athletes see their stats dashboard; assistants see a read-only squad view.

### 4. Roster

**Purpose:** Manage squad members.

**Contents:**
- Athlete table or cards
- "Add athlete" button (coach only)
- Edit / remove actions per row (coach only)
- Empty state when no athletes exist

**Role-aware:** Assistants see the same list but without action buttons.

### 5. Events

**Purpose:** Schedule matches and training.

**Contents:**
- Calendar or list of events
- "Create event" button (coach only)
- Event cards showing date, time, location, type, status
- Cancel action (coach only)

### 6. Live Match

**Purpose:** Log actions in real time during an event.

**Contents:**
- Scoreboard
- Timer / minute input
- Athlete selector
- Action buttons: Goal, Penalty, Yellow Card, Red Card, Save, Substitution
- Recent log entries list with undo option

**Why:** Logging as actions happen is more accurate than post-match reconstruction.

### 7. Athlete Stats

**Purpose:** Show personal performance.

**Contents:**
- Athlete profile header
- Summary stats: appearances, goals, assists, cards
- Recent events table
- Season trend chart (future)

### 8. Settings

**Purpose:** Manage account and preferences.

**Contents:**
- Clerk UserProfile component for name/email/password
- Danger zone with delete account confirmation

## User Flows

### Coach Sign-Up Flow

1. Land on home page
2. Click "Sign up" — Clerk modal opens
3. Complete email verification
4. Redirect to first-login setup
5. Enter squad name and first athlete
6. Land on dashboard

### Assistant Invite Flow

1. Coach enters assistant email on dashboard
2. System creates invite token and sends email
3. Assistant clicks link and signs up via Clerk
4. Frontend calls `POST /api/invites/:token/accept`
5. Assistant lands on dashboard with read-only roster access

### Athlete Invite Flow

1. Coach adds athlete with email in roster
2. System creates invite linked to athlete row
3. Athlete signs up via invite link
4. Athlete's user_id is set on the athlete row
5. Athlete lands on their stats page

### Live Match Logging Flow

1. Coach creates an event
2. At match time, event transitions to `live`
3. Coach/assistant open the live match view
4. Select athlete and action; system records log entry
5. Stats update immediately
6. Mistakes can be undone (soft delete)

## Responsive Behaviour

| Breakpoint | Layout |
|---|---|
| < 768px | Single column, hamburger menu, stacked cards |
| 768px – 1024px | Sidebar collapses to icons, two-column cards |
| > 1024px | Full sidebar, multi-column dashboard |

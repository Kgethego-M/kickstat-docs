---
sidebar_position: 2
---

# Process View

The process view shows how the main user flows interact across the frontend, backend, Clerk, and database.

## Coach Sign-Up & Setup

```mermaid
sequenceDiagram
    actor Coach
    participant React as React Frontend
    participant Clerk as Clerk
    participant API as Express API
    participant DB as PostgreSQL

    Coach->>React: Click Sign Up
    React->>Clerk: Open sign-up modal
    Coach->>Clerk: Enter email + password
    Clerk-->>React: Session token
    React->>API: GET /api/account/me
    API->>DB: getOrCreateUser + create squad
    DB-->>API: user + squad
    API-->>React: role=coach, athletes=[]
    React->>React: Redirect to setup flow
    Coach->>React: Enter squad name + first athlete
    React->>API: POST /api/athletes
    API->>DB: INSERT athlete
    DB-->>API: athlete row
    API-->>React: success
    React->>React: Redirect to dashboard
```

## Assistant Invite Flow

```mermaid
sequenceDiagram
    actor Coach
    actor Assistant
    participant React as React Frontend
    participant API as Express API
    participant Clerk as Clerk
    participant Email as Email Service
    participant DB as PostgreSQL

    Coach->>React: Enter assistant email, click Invite
    React->>API: POST /api/invites
    API->>DB: INSERT invite (assistant, pending)
    API->>Email: send invite email
    API-->>React: invite link
    Email-->>Assistant: invite email
    Assistant->>React: Open invite link
    React->>Clerk: Sign up via modal
    Clerk-->>React: Session token
    React->>API: POST /api/invites/:token/accept
    API->>DB: UPDATE users SET role=assistant, squad_id=...
    API->>DB: UPDATE invites SET status=accepted
    API-->>React: role=assistant
    React->>React: Redirect to dashboard
```

## Athlete Invite Flow

```mermaid
sequenceDiagram
    actor Coach
    actor Athlete
    participant React as React Frontend
    participant API as Express API
    participant Clerk as Clerk
    participant Email as Email Service
    participant DB as PostgreSQL

    Coach->>React: Add athlete with email
    React->>API: POST /api/athletes
    API->>DB: INSERT athlete + invite (athlete, pending)
    API->>Email: send invite email
    API-->>React: athlete created
    Email-->>Athlete: invite email
    Athlete->>React: Open invite link
    React->>Clerk: Sign up via modal
    Clerk-->>React: Session token
    React->>API: POST /api/invites/:token/accept
    API->>DB: UPDATE users SET role=athlete, squad_id=...
    API->>DB: UPDATE athletes SET user_id=...
    API->>DB: UPDATE invites SET status=accepted
    API-->>React: role=athlete, athleteId
    React->>React: Redirect to athlete stats
```

## Live Match Logging

```mermaid
sequenceDiagram
    actor Coach
    participant React as React Frontend
    participant API as Express API
    participant DB as PostgreSQL

    Coach->>React: Open live event
    React->>API: GET /api/events/:id
    API->>DB: SELECT event + logs
    DB-->>API: event data
    API-->>React: event + logs
    Coach->>React: Select athlete + action
    React->>API: POST /api/events/:id/logs
    API->>DB: INSERT log_entry
    API->>DB: SELECT updated logs
    API-->>React: updated event + stats
    React->>React: Update scoreboard + log list
    Coach->>React: Click Undo on a log
    React->>API: DELETE /api/events/:id/logs/:logId
    API->>DB: UPDATE log_entry SET deleted_at=now()
    API-->>React: updated event + stats
```

## Account Deletion

```mermaid
sequenceDiagram
    actor User
    participant React as React Frontend
    participant Clerk as Clerk
    participant API as Express API
    participant DB as PostgreSQL

    User->>React: Settings → Delete Account
    React->>User: Confirm with "DELETE"
    User->>React: Confirm
    React->>API: DELETE /api/account/me
    API->>DB: BEGIN
    API->>DB: DELETE invites, logs, events
    API->>DB: DELETE athletes, squad
    API->>DB: DELETE users
    API->>Clerk: DELETE /users/:clerkId
    API->>DB: COMMIT
    API-->>React: success
    React->>Clerk: signOut
    Clerk-->>React: signed out
    React->>React: Redirect to home
```

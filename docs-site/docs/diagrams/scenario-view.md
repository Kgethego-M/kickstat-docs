---
sidebar_position: 5
---

# Scenario View

The scenario view shows the main use cases from each user's perspective.

## Use Case Diagram

```mermaid
graph LR
    subgraph Actors
        C[Coach]
        A[Assistant]
        H[Athlete]
    end

    subgraph Kickstat
        UC1[Sign up / Log in]
        UC2[Set up squad]
        UC3[Manage roster]
        UC4[Invite assistant]
        UC5[Invite athlete]
        UC6[Schedule event]
        UC7[Log live match actions]
        UC8[View athlete stats]
        UC9[Delete account]
        UC10[Cancel event]
    end

    C --> UC1
    C --> UC2
    C --> UC3
    C --> UC4
    C --> UC5
    C --> UC6
    C --> UC7
    C --> UC8
    C --> UC9
    C --> UC10

    A --> UC1
    A --> UC7
    A --> UC8

    H --> UC1
    H --> UC8
    H --> UC9
```

## Use Case Descriptions

### Coach use cases

| Use Case | Description | Priority |
|---|---|---|
| Set up squad | Create squad and add first athlete on first login | Must have |
| Manage roster | Add, edit, and remove athletes | Must have |
| Invite assistant | Send an invite email to an assistant | Must have |
| Invite athlete | Send an invite email to an athlete | Must have |
| Schedule event | Create matches and training sessions | Must have |
| Log live match actions | Record goals, cards, saves, substitutions | Must have |
| Cancel event | Mark an event as cancelled | Should have |
| Delete account | Remove account and all data | Must have |

### Assistant use cases

| Use Case | Description | Priority |
|---|---|---|
| View roster | See the squad list without editing | Must have |
| Log live match actions | Help record actions during a match | Must have |
| View athlete stats | See athlete performance data | Should have |

### Athlete use cases

| Use Case | Description | Priority |
|---|---|---|
| View personal stats | See own appearances, goals, cards | Must have |
| Delete account | Remove their own account | Should have |

---
sidebar_position: 1
---

# Design System

The Kickstat design system keeps the interface consistent, readable, and role-aware across all screens.

## Design Principles

1. **Clarity first** — every screen has a clear heading, a short description, and one primary action.
2. **Role-aware surfaces** — coaches see full controls; assistants and athletes see only what they need.
3. **Mobile-first** — the app is usable on a phone on the sideline, then scales up to desktop.
4. **Feedback is visible** — loading, success, and error states are shown inline so users always know what happened.

## Colour Palette

| Token | Value | Usage |
|---|---|---|
| `--color-primary` | Deep navy / slate `#1e293b` | Header, sidebar, primary text |
| `--color-accent` | Gold `#d4af37` | Primary buttons, active states, highlights |
| `--color-background` | Off-white `#f8fafc` | Page background |
| `--color-surface` | White `#ffffff` | Cards, forms, modals |
| `--color-success` | Green `#22c55e` | Success messages, live indicators |
| `--color-error` | Red `#ef4444` | Errors, destructive actions |
| `--color-warning` | Amber `#f59e0b` | Warnings, pending states |

## Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Page title | System sans-serif / Inter | 28px | 700 |
| Eyebrow label | System sans-serif | 12px | 600 uppercase |
| Section heading | System sans-serif | 20px | 600 |
| Body | System sans-serif | 16px | 400 |
| Caption / helper | System sans-serif | 14px | 400 |
| Button | System sans-serif | 14px | 600 |

## Components

### Buttons

| Variant | Appearance | Use |
|---|---|---|
| `btn-gold` | Gold background, dark text | Primary action (Save, Add, Invite) |
| `btn-ghost` | Transparent with border | Secondary action (Cancel, Done) |
| `btn-danger` | Red background or text | Destructive action (Delete, Remove) |

### Cards

- White surface with subtle shadow
- Consistent padding (`1.5rem`)
- Rounded corners (`0.75rem`)
- Optional header with title and action button

### Forms

- Labels above inputs
- Inline validation messages
- Required fields marked
- Disabled submit while saving

### Tables

- Striped rows for readability
- Action buttons in the last column (only for coaches)
- Responsive: on mobile, rows collapse into cards

## Layout

### Desktop

- Fixed sidebar on the left (180px)
- Top header with squad name and user menu
- Main content area with page header and content cards

### Mobile

- Hamburger menu replaces sidebar
- Stacked cards and full-width buttons
- Floating action button for primary actions

## Accessibility

- Focus rings on all interactive elements
- Colour is never the only indicator of status
- Form inputs have associated labels
- Buttons have descriptive text

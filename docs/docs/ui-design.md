---
sidebar_position: 6
---

# UI Design

## Design Principles

- **Mobile-first layout** — the sidebar collapses on small screens; action buttons are large touch targets
- **Minimal navigation depth** — every main feature is one click from the sidebar
- **Inline forms** — adding athletes, creating events, and inviting assistants all happen on the same page without a modal overlay
- **Real-time feedback** — live logging updates the timeline immediately; errors surface inline, not in alerts

---

## Page Breakdown

### Home (`/`)

Landing page shown to unauthenticated users.

- Hero section with the Kickstat logo and tagline
- Sign In / Sign Up buttons (Clerk-hosted UI)
- No navigation sidebar visible

---

### Dashboard (`/dashboard`)

First page after sign-in.

**Coach view:**
- Squad name and welcome message
- Invite assistant section — email input + generated invite link with copy button
- Quick-links to Roster, Events, and Live

**Assistant view:**
- Same layout minus the invite section (hidden for non-coaches)

---

### Roster (`/roster`)

Manage athletes on the squad.

- Athlete cards showing name, position, and squad number
- **Add athlete** form at the bottom (inline, expands on click)
- Each card has **Edit** and **Delete** actions (coach only — assistants see read-only)
- Empty state message when the roster is empty

**Fields per athlete:**
| Field | Type |
|-------|------|
| Name | Text |
| Position | Text |
| Squad number | Number |
| Date of birth | Date |
| Contact info | Text |

---

### Events (`/events`)

List and create events.

- Event cards with title, format badge, status badge, date, and location
- Status badge colours: `scheduled` (grey), `open` (blue), `live` (red), `completed` (green), `cancelled` (dark)
- **Create Event** form above the list — format selector shows extra fields for league/tournament (`required_teams`)
- Clicking a card navigates to **Event Detail**

---

### Event Detail (`/events/:id`)

**Simple match/training:**
- Event metadata (title, date, location, opponent, duration)
- Score display (derived from `log_entries` where `is_scoring = true`)
- **Start live** button when status is `scheduled` — navigates to Live Match
- Log entry timeline (if completed)

**League/tournament:**
- Standings table (wins/draws/losses/points, auto-calculated from completed fixtures)
- Fixtures list with home/away squads, date, and status
- **Start live** button per fixture (home squad coach/assistant only)
- **Join** button when event is `open` and the user's squad hasn't joined yet

---

### Live Match (`/live/:id` and `/live/fixture/:fixtureId`)

Real-time action logging view.

**Layout:**
- Score header (home : away) — updates on every log
- Quick-action button grid:
  - Goal, Assist, Shot on Target, Shot Off Target, Save
  - Yellow Card, Red Card, Foul Committed, Foul Won
  - Tackle, Interception, Clearance, Corner, Free Kick
  - Penalty Scored, Penalty Missed, Own Goal, Substitution
- Each button opens a mini-form to select the athlete and optionally the minute
- **Opposition** toggle — logs the action against the away team instead
- Scrollable timeline of logged actions (newest first), each with an **Undo** button
- **End fixture / End match** button (red) — sets status to `completed` and navigates to the summary
- **Summary** link — navigates to Event Detail without ending

---

### Live Redirect (`/live`)

If there is a currently live event or fixture for the user's squad, this page redirects straight to the correct Live Match URL. If nothing is live, it shows a "No live event right now" message.

---

### Account Settings (`/settings`)

- Squad name field with **Save** button (coach only)
- Clerk `<UserProfile />` widget for email, password, connected accounts, and MFA

---

### Invite Accept (`/invite/:token`)

Public page — no authentication required.

- Validates the invite token via `GET /api/invites/:token`
- Shows the squad name and inviting coach
- **Accept invite** button — on click, redirects to Clerk sign-up with the email pre-filled
- After sign-up the Clerk webhook fires, matches the email to the pending invite, and assigns `role = 'assistant'`

---

## Component Structure

```
frontend/src/
├── components/
│   ├── Layout.jsx          # Sidebar navigation + <Outlet>
│   │   └── Layout.css
│   └── ProtectedRoute.jsx  # Wraps routes that require auth
├── lib/
│   ├── api.js              # apiRequest(path, options) — attaches JWT, throws on non-2xx
│   └── actions.js          # ACTION_TYPES array used by Live Match buttons
└── pages/
    ├── Home.jsx / Home.css
    ├── Dashboard.jsx / Dashboard.css
    ├── Roster.jsx / Roster.css
    ├── Events.jsx / Events.css
    ├── EventDetail.jsx / EventDetail.css
    ├── LiveMatch.jsx / LiveMatch.css
    ├── Live.jsx / Live.css
    ├── AccountSettings.jsx / AccountSettings.css
    └── InviteAccept.jsx
```

---

## Styling

- Plain CSS per component — no CSS framework
- CSS custom properties for colours and spacing defined in `index.css`
- Responsive breakpoints at `768px` (tablet) and `480px` (mobile)
- Dark sidebar with light main content area
- Status and format badges use colour-coded pill spans

---

## Accessibility

- All interactive elements are `<button>` or `<a>` (keyboard accessible)
- Form labels are associated with inputs via `htmlFor`
- Error messages rendered in `role="alert"` regions
- Sufficient colour contrast ratio (≥ 4.5:1) for text elements

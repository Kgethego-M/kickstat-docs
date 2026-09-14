[![codecov](https://codecov.io/gh/mmmaphefo/sport-coaching-tool/graph/badge.svg?token=jLHQL40tsX)](https://codecov.io/gh/mmmaphefo/sport-coaching-tool)

 # Kickstat — Sport Coaching Tool

A full-stack web application for sports coaches and assistants to manage squads, schedule events, log live match data, and run multi-team leagues and tournaments.

![CI](https://sdpm.ms.wits.ac.za/bug-off/sport-coaching-tool/actions/workflows/ci.yml/badge.svg)

## Features

### Squad Management
- Create and manage your squad with athlete rosters
- Track athlete details: name, position, squad number, date of birth, contact info
- Role-based access: coaches can manage the roster, assistants can view only

### Event Scheduling
- Schedule matches and training sessions
- Set date/time, location, duration, and opponent
- Auto-transition: events automatically go live at the scheduled time and end when the duration expires

### Live Match Logging (US13 / US14 / US15)
- Log live actions during a match: goals, assists, shots on target, saves, yellow/red cards, substitutions, penalties
- Record actions for your squad (select an athlete) or the opposition (no athlete selected)
- **Edit** or **Undo** log entries in real time
- View the final score, goal scorers with minutes, and card history after the match

### Leagues & Tournaments
- Create a league or tournament event with a name and required number of teams
- Other coaches join the event until it's full
- Auto-generates a **round-robin schedule** (home and away — 2 fixtures per pair)
- **Live standings table** sorted by standard football rules: points (3/1/0), goal difference, goals for
- **Top scorers** and **top assisters** charts across all fixtures
- Home team's coach or assistant logs live data for each fixture

### Role-Based Access
- **Coach**: full access to roster management, event creation, live logging, and settings
- **Assistant**: can log live data and view the roster, but cannot add/edit/delete athletes
- Assistants are invited by coaches via unique invite links

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, React Router, Clerk (auth UI) |
| **Backend** | Node.js, Express, PostgreSQL, node-pg-migrate |
| **Authentication** | Clerk (sign up, sign in, password reset, account deletion) |
| **Testing** | Vitest, Supertest (integration tests) |
| **CI/CD** | Gitea Actions (lint, build, test on every push) |
| **Linting** | ESLint |

## Project Structure

```
sport-coaching-tool/
├── backend/
│   ├── migrations/          # PostgreSQL schema migrations
│   ├── src/
│   │   ├── middleware/      # Auth middleware (Clerk)
│   │   ├── routes/          # Express route handlers
│   │   └── app.js           # Express app entry
│   └── tests/
│       └── integration/     # Vitest integration tests
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── lib/             # API client, action constants
│   │   ├── pages/           # Route-level page components
│   │   ├── App.jsx          # Router configuration
│   │   └── main.jsx         # React entry point
│   └── index.html
├── .gitea/workflows/
│   └── ci.yml               # CI pipeline configuration
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** 22+
- **PostgreSQL** 16+
- **Clerk** account (free tier works) — [dashboard.clerk.com](https://dashboard.clerk.com)

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd sport-coaching-tool
```

### 2. Set up the database

```sh
createdb sportcoach
# Or use psql:
# CREATE DATABASE sportcoach;
```

### 3. Configure environment variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://<user>@localhost:5432/sportcoach
PORT=3000
NODE_ENV=development
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000
```

### 4. Run migrations

```sh
cd backend
npm install
npx node-pg-migrate up
```

### 5. Start the servers

```sh
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Sign up

- Register with any email via Clerk
- You'll automatically be assigned the **Coach** role and a squad will be created
- To add assistants: use the "Invite an Assistant" section on the Dashboard

## Running Tests

```sh
cd backend
npm test          # Run all integration tests
npm run lint      # Lint backend code

cd frontend
npm run lint      # Lint frontend code
npm run build     # Production build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/squads/mine` | Get the logged-in user's squad |
| PATCH | `/api/squads/mine` | Update squad name |
| GET | `/api/athletes` | List all athletes in the squad |
| POST | `/api/athletes` | Add an athlete (coach only) |
| PATCH | `/api/athletes/:id` | Update an athlete (coach only) |
| DELETE | `/api/athletes/:id` | Remove an athlete (coach only) |
| GET | `/api/events` | List events (own + joined + open leagues) |
| POST | `/api/events` | Create an event or league |
| GET | `/api/events/:id` | Event detail with timeline and results |
| PATCH | `/api/events/:id` | Update event (title, status, etc.) |
| POST | `/api/events/:id/join` | Join an open league/tournament |
| POST | `/api/events/:id/logs` | Log a live action (US13) |
| PATCH | `/api/events/:id/logs/:logId` | Edit a log entry (US14) |
| DELETE | `/api/events/:id/logs/:logId` | Undo a log entry (US14) |
| GET | `/api/fixtures/:id` | Fixture detail with timeline |
| PATCH | `/api/fixtures/:id` | Update fixture status |
| POST | `/api/fixtures/:id/logs` | Log a fixture action |
| PATCH | `/api/fixtures/:id/logs/:logId` | Edit a fixture log entry |
| DELETE | `/api/fixtures/:id/logs/:logId` | Undo a fixture log entry |
| POST | `/api/invites` | Create an assistant invite (coach only) |

## Deployment

Production runs on free-tier hosting:

| Service | Host | URL |
|---------|------|-----|
| Frontend | Cloudflare Pages | [kickstat.pages.dev](https://kickstat.pages.dev) |
| Backend | Render | [kickstat-api-i2rc.onrender.com](https://kickstat-api-i2rc.onrender.com) |
| Database | Neon (Frankfurt) | — |

Every push to `main` on Gitea runs CI and, when green, auto-deploys:
the commit is synced to the [GitHub mirror](https://github.com/TasmiyaChoonara/sport-coaching-tool)
(which triggers the Render backend deploy with migrations) and the frontend
is published to Cloudflare Pages via `wrangler`. Manual `wrangler pages deploy`
is only needed for out-of-band fixes.

> The Render free tier sleeps after ~15 min of inactivity; the first request
> afterwards takes about a minute to wake up.

### Deployment inventory

Third-party services used by the app: **Clerk** (auth), **Resend** (invite/reminder
emails), **football-data.org** (external fixtures API).

CI auto-deploy is wired through three secrets stored in Gitea
(Settings → Actions → Secrets — values are never committed to the repo):

| Secret | What it is |
|--------|------------|
| `GH_PAT` | GitHub fine-grained token (Contents: Read and write on the fork) — lets CI push to the GitHub mirror. **Expires Dec 13, 2026 — renew and update before then** |
| `CLOUDFLARE_API_TOKEN` | Cloudflare custom token (Account → Cloudflare Pages → Edit) — lets CI run `wrangler pages deploy` |
| `CLOUDFLARE_ACCOUNT_ID` | 32-char Cloudflare account ID |

Environment variables configured on the Render service: `DATABASE_URL` (Neon
direct connection string — pooling **off**, no `-pooler` host, migrations break
on the pooled URL), `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`,
`CLERK_WEBHOOK_SECRET`, `FRONTEND_URL` (= https://kickstat.pages.dev, drives
CORS), `RESEND_API_KEY`, `EMAIL_FROM`, `FOOTBALL_DATA_API_KEY`.

Key deployment files in this repo:

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint: service definition, build/start commands (migrations then `node src/app.js`), health check |
| `frontend/.env.production` | `VITE_API_URL` + `VITE_CLERK_PUBLISHABLE_KEY`, baked into the bundle at build time |
| `frontend/public/_redirects` | SPA fallback (`/* /index.html 200`) |
| `wrangler.jsonc` | Cloudflare Pages config (`pages_build_output_dir: frontend/dist`) |
| `.gitea/workflows/ci.yml` | CI pipeline: lint/tests, Postgres address probe, Deploy Production job |

Never push directly to the GitHub mirror — Gitea `main` is the single source of
truth and CI keeps the mirror in sync.

## Documentation

Full project documentation is available in the [docs site](https://kickstat-docs.netlify.app/) (Docusaurus).

## License

This project was developed as part of COMS3011A at the University of the Witwatersrand.

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

## Documentation

Full project documentation is available in the [docs site](https://kickstat-docs.netlify.app/) (Docusaurus).

## License

This project was developed as part of COMS3011A at the University of the Witwatersrand.
